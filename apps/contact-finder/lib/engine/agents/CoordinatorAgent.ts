import { Subject, InvestigationResult, PhoneCandidate, ParsedAddress } from '../types';
import { EngineConfig } from '../config';
import { parseAddress } from '../address/AddressParser';
import { generateQueries } from '../QueryGenerator';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { BrowserFetcher } from '../fetch/BrowserFetcher';
import { GeminiService } from '../llm/GeminiService';
import { OpenRouterService } from '../llm/OpenRouterService';
import { CallerIdService } from '../providers/CallerIdService';
import { ZaubaCorpScraper } from '../providers/ZaubaCorpScraper';
import { DatabaseService } from '../db/DatabaseService';
import { SemanticChunker } from '../embeddings/SemanticChunker';
import { rankCandidates } from '../attribution/ConfidenceScorer';
import { UpiVerificationService } from '../providers/UpiVerificationService';
import { MessagingVerificationService } from '../providers/MessagingVerificationService';

import { ResearcherAgent } from './ResearcherAgent';
import { ExtractorAgent } from './ExtractorAgent';
import { VerifierAgent } from './VerifierAgent';
import { extractPhones } from '../extractors/PhoneExtractor';

export class CoordinatorAgent {
  private researcher: ResearcherAgent;
  private extractor: ExtractorAgent;
  private verifier: VerifierAgent;
  private zauba: ZaubaCorpScraper;

  constructor() {
    const registry = new ProviderRegistry();
    const fetcher = new BrowserFetcher();
    this.zauba = new ZaubaCorpScraper();
    
    let llm;
    const openRouterService = new OpenRouterService();
    if (openRouterService.isAvailable()) {
      llm = openRouterService;
    } else {
      llm = new GeminiService();
    }
    
    const db = new DatabaseService();
    const chunker = new SemanticChunker();
    const callerId = new CallerIdService();
    const upiService = new UpiVerificationService();
    const messagingService = new MessagingVerificationService();

    this.researcher = new ResearcherAgent(registry, fetcher, this.zauba);
    this.extractor = new ExtractorAgent(llm, chunker);
    this.verifier = new VerifierAgent(db, callerId, llm, upiService, messagingService);
  }

  async investigate(subject: Subject): Promise<InvestigationResult> {
    const startTime = Date.now();
    const parsed = parseAddress(subject.address);
    if (subject.city && !parsed.city) parsed.city = subject.city.toUpperCase();

    let queries = generateQueries(subject, parsed);
    const allCandidates = new Map<string, PhoneCandidate>();
    const providersUsed = new Set<string>();
    
    let totalDocs = 0;
    let totalEvidence = 0;
    let queriesUsed = 0;
    let geminiCalls = 0;
    const MAX_GEMINI_CALLS = 15;
    const MAX_DURATION_MS = 300000; 

    await this.extractor.init();

    const known = this.verifier.getKnownCandidates(subject);
    for (const k of known) allCandidates.set(k.phone, k);

    // Phase 0: Corporate Entity Enrichment
    const isCorporate = /LIMITED|LTD|PVT|PRIVATE|COMPANY|INC|CORP/i.test(subject.name || '') || 
                        /LIMITED|LTD|PVT|PRIVATE|COMPANY|INC|CORP/i.test(subject.company || '') ||
                        /LIMITED|LTD|PVT|PRIVATE|COMPANY|INC|CORP/i.test(subject.address || '');
    if (isCorporate) {
      console.log(`[CoordinatorAgent] Detected Corporate Entity for ${subject.name}. Triggering B2B Enrichment...`);
      // Use company name if it exists, otherwise use the subject name
      const b2bQuery = subject.company || subject.name;
      const { docs, providers, serps } = await this.researcher.fetchDocumentsForQuery(b2bQuery, subject, true);
      
      // The B2B APIs return data in serps.snippet (structured JSON)
      for (const sr of serps) {
        if (sr.provider === 'explorium' || sr.provider === 'apify-zauba') {
          providersUsed.add(sr.provider);
          // Extract using Gemini
          const { llmPhones } = await this.extractor.extractFromDocument({ url: sr.url, content: sr.snippet, contentType: 'text', fetchedAt: Date.now(), provider: sr.provider }, subject, true);
          for (const phone of llmPhones) {
            const evidenceTpl = { sourceUrl: sr.url, provider: sr.provider, snippet: phone.context.slice(0, 300), fetchedAt: Date.now() };
            const candidate = await this.verifier.verifyAndScore(phone, subject, parsed, evidenceTpl, true, allCandidates.get(phone.phone));
            if (candidate) allCandidates.set(candidate.phone, candidate);
          }
        }
      }
      
      const topCandidate = rankCandidates([...allCandidates.values()])[0];
      // If we found a high confidence corporate contact, we can skip the standard OSINT queries!
      if (topCandidate && topCandidate.confidence >= EngineConfig.confidence.highThreshold) {
        queries = []; // Skip loop
      }
    }

    const QUERY_BATCH_SIZE = 3;
    for (let i = 0; i < queries.length; i += QUERY_BATCH_SIZE) {
      if (Date.now() - startTime > MAX_DURATION_MS) break;

      const batchQueries = queries.slice(i, i + QUERY_BATCH_SIZE);
      const batchResults = await Promise.all(
        batchQueries.map((q, idx) => this.researcher.fetchDocumentsForQuery(q, subject, i === 0 && idx === 0))
      );

      queriesUsed += batchQueries.length;

      for (const { docs, providers, serps } of batchResults) {
        for (const p of providers) providersUsed.add(p);
        
        // Process fast SERP snippets
        for (const sr of serps) {
          if (!sr.snippet) continue;
          const snippetPhones = extractPhones(sr.snippet, sr.url || 'SERP', subject);
          for (const phone of snippetPhones) {
            const evidenceTpl = { sourceUrl: sr.url || 'SERP', provider: sr.provider, snippet: phone.context.slice(0, 300), fetchedAt: Date.now() };
            const candidate = await this.verifier.verifyAndScore(phone, subject, parsed, evidenceTpl, false, allCandidates.get(phone.phone));
            if (candidate) allCandidates.set(candidate.phone, candidate);
          }
        }

        totalDocs += docs.length;

        // PASS 1: FAST PRIMARY SEARCH (Regex Only)
        for (const doc of docs) {
          const { regexPhones } = await this.extractor.extractFromDocument(doc, subject, false);
          totalEvidence += regexPhones.length;

          for (const phone of regexPhones) {
            const evidenceTpl = { sourceUrl: doc.url, provider: doc.provider, snippet: phone.context.slice(0, 300), fetchedAt: doc.fetchedAt };
            const candidate = await this.verifier.verifyAndScore(phone, subject, parsed, evidenceTpl, false, allCandidates.get(phone.phone));
            if (candidate) {
               allCandidates.set(candidate.phone, candidate);
               console.log(`[Match Scored] Phone: ${candidate.phone} | Name: ${candidate.owner || 'Unknown'} | Score: ${candidate.confidence}% | Provider: ${candidate.attribution}`);
            }
          }
        }
      }

      const topCandidate = rankCandidates([...allCandidates.values()])[0];
      if (topCandidate && topCandidate.confidence >= EngineConfig.confidence.highThreshold) {
        console.log(`[CoordinatorAgent] 🛑 High confidence match found! Halting further queries.`);
        break;
      }

      // PASS 2: DEEP SEARCH (LLM Extraction)
      // Only runs if Pass 1 completely failed to find a high confidence match across ALL documents.
      if (!topCandidate || topCandidate.confidence < EngineConfig.confidence.highThreshold) {
        console.log(`[CoordinatorAgent] Initiating Parallel Deep LLM Extraction...`);
        
        for (const { docs } of batchResults) {
          const BATCH_SIZE = 1; // Serialize Gemini requests to prevent 429 burst rate limits
          for (let k = 0; k < docs.length; k += BATCH_SIZE) {
            const batchDocs = docs.slice(k, k + BATCH_SIZE);
            
            const batchPromises = batchDocs.map(async (doc) => {
              if (geminiCalls >= MAX_GEMINI_CALLS) return { doc, phones: [] };
              geminiCalls++;
              const { llmPhones } = await this.extractor.extractFromDocument(doc, subject, true);
              return { doc, phones: llmPhones };
            });
            
            const batchResultsLLM = await Promise.all(batchPromises);

            for (const res of batchResultsLLM) {
              totalEvidence += res.phones.length;

              for (const phone of res.phones) {
                const evidenceTpl = { sourceUrl: res.doc.url, provider: res.doc.provider, snippet: phone.context.slice(0, 300), fetchedAt: res.doc.fetchedAt };
                const candidate = await this.verifier.verifyAndScore(phone, subject, parsed, evidenceTpl, true, allCandidates.get(phone.phone));
                if (candidate) {
                   allCandidates.set(candidate.phone, candidate);
                   console.log(`[Match Scored (Deep)] Phone: ${candidate.phone} | Name: ${candidate.owner || 'Unknown'} | Score: ${candidate.confidence}% | Provider: ${candidate.attribution}`);
                }
              }
            }

            const currentTop = rankCandidates([...allCandidates.values()])[0];
            if (currentTop && currentTop.confidence >= EngineConfig.confidence.highThreshold) {
              console.log(`[CoordinatorAgent] 🛑 High confidence match found during Deep Search! Halting further extraction.`);
              break;
            }
          }
        }
      }

      const topCandidateEnd = rankCandidates([...allCandidates.values()])[0];
      if (topCandidateEnd && topCandidateEnd.confidence >= EngineConfig.confidence.highThreshold) break;
    }

    let rankedPhones = rankCandidates([...allCandidates.values()]);

    // PROXY GRAPH PHASE
    if (!rankedPhones[0] || rankedPhones[0].confidence < EngineConfig.confidence.highThreshold) {
      if (subject.company) {
        console.log('[CoordinatorAgent] Primary search yielded low confidence. Triggering Proxy Social Search...');
        
        // --- NEW ZAUBA PROXY SEARCH ---
        const keyPersonnel = await this.zauba.extractKeyManagementPersonnel(subject.company);
        for (const personnel of keyPersonnel) {
           const proxyQuery = `"${personnel}" "${subject.company}" contact OR mobile`.trim();
           const { docs } = await this.researcher.fetchDocumentsForQuery(proxyQuery, subject, false);
           for (const doc of docs) {
              const { regexPhones } = await this.extractor.extractFromDocument(doc, subject, false);
              for (const phone of regexPhones) {
                 const evidenceTpl = { sourceUrl: doc.url, provider: 'Zauba Proxy Search', snippet: phone.context.slice(0, 300), fetchedAt: Date.now() };
                 const candidate = await this.verifier.verifyAndScore(phone, subject, parsed, evidenceTpl, false, allCandidates.get(phone.phone), {
                    attribution: 'PROXY_PERSON', owner: personnel, relationship: 'company_secretary'
                 });
                 if (candidate) allCandidates.set(candidate.phone, candidate);
              }
           }
        }
        // -----------------------------
        
        const proxyQuery = `"${subject.company}" LinkedIn ${parsed.city || ''} (director OR manager OR employee OR contact)`.trim();
        const { docs } = await this.researcher.fetchDocumentsForQuery(proxyQuery, subject, false);
        for (const doc of docs) {
           const { regexPhones } = await this.extractor.extractFromDocument(doc, subject, false); // No LLM for proxies to save budget
           for (const phone of regexPhones) {
              const evidenceTpl = { sourceUrl: doc.url, provider: 'LinkedIn Proxy', snippet: phone.context.slice(0, 300), fetchedAt: Date.now() };
              const candidate = await this.verifier.verifyAndScore(phone, subject, parsed, evidenceTpl, false, allCandidates.get(phone.phone), {
                 attribution: 'PROXY_PERSON', owner: 'Colleague at ' + subject.company, relationship: 'coworker'
              });
              if (candidate) allCandidates.set(candidate.phone, candidate);
           }
        }
        rankedPhones = rankCandidates([...allCandidates.values()]);
      }
    }

    const reportable = rankedPhones.filter(c => c.confidence >= EngineConfig.confidence.minReportable);
    console.log(`[DEBUG][REPORTABLE] ${subject.name} | total=${rankedPhones.length} | reportable=${reportable.length}`);
    this.verifier.saveConfirmedCandidates(subject, reportable);

    return {
      subject,
      parsedAddress: parsed,
      phones: reportable,
      queriesUsed,
      queryBudget: EngineConfig.queryBudget,
      documentsFetched: totalDocs,
      totalEvidenceItems: totalEvidence,
      providersUsed: [...providersUsed],
      durationMs: Date.now() - startTime,
      stopReason: queriesUsed >= queries.length ? 'NO_MORE_QUERIES' :
        reportable[0]?.confidence >= EngineConfig.confidence.highThreshold ? 'HIGH_CONFIDENCE' :
        'BUDGET_EXHAUSTED',
      timestamp: Date.now(),
    };
  }
}
