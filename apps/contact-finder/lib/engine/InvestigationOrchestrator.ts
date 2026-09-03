import {
  Subject, InvestigationResult, PhoneCandidate, Evidence,
  ExtractedPhone, ParsedAddress
} from './types';
import { EngineConfig } from './config';
import { parseAddress } from './address/AddressParser';
import { generateQueries } from './QueryGenerator';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { BrowserFetcher } from './fetch/BrowserFetcher';
import { extractPhones, normalizePhone } from './extractors/PhoneExtractor';
import { extractNames } from './extractors/NameExtractor';
import { GeminiService } from './llm/GeminiService';
import { OpenRouterService } from './llm/OpenRouterService';
import { LLMExtractor } from './types';
import { classifyAttribution } from './attribution/ContactAttributionResolver';
import { resolveEntity } from './attribution/EntityResolver';
import { scoreCandidate, rankCandidates } from './attribution/ConfidenceScorer';
import { CallerIdService } from './providers/CallerIdService';
import { ZaubaCorpScraper } from './providers/ZaubaCorpScraper';

export class InvestigationOrchestrator {
  private registry: ProviderRegistry;
  private fetcher: BrowserFetcher;
  private llm: LLMExtractor;
  private callerId: CallerIdService;
  private zauba: ZaubaCorpScraper;

  constructor() {
    this.registry = new ProviderRegistry();
    this.fetcher = new BrowserFetcher();
    
    // Auto-detect and route LLM based on available API keys
    const openRouterService = new OpenRouterService();
    if (openRouterService.isAvailable()) {
      this.llm = openRouterService;
      console.log('[Orchestrator] Using OpenRouter for AI Extraction');
    } else {
      this.llm = new GeminiService();
      console.log('[Orchestrator] Using Gemini for AI Extraction');
    }
    
    this.callerId = new CallerIdService();
    this.zauba = new ZaubaCorpScraper();
  }

  async investigate(subject: Subject): Promise<InvestigationResult> {
    const startTime = Date.now();
    const parsed = parseAddress(subject.address);
    if (subject.city && !parsed.city) parsed.city = subject.city.toUpperCase();

    const queries = generateQueries(subject, parsed);
    const allCandidates = new Map<string, PhoneCandidate>();
    const providersUsed = new Set<string>();
    let totalDocs = 0;
    let totalEvidence = 0;
    let queriesUsed = 0;
    let geminiCalls = 0;
    const MAX_GEMINI_CALLS = 3;
    const investigationStartTime = Date.now();
    const MAX_INVESTIGATION_DURATION_MS = 180000; // 180 seconds max to allow Puppeteer to finish

    for (const query of queries) {
      if (Date.now() - investigationStartTime > MAX_INVESTIGATION_DURATION_MS) {
        console.log(`[Engine] Stopping early: Reached 180 second hard limit.`);
        break;
      }
      
      queriesUsed++;

      const searchResults = await this.registry.searchAll(query, { maxResults: 5 });

      // Natively inject ZaubaCorp if a company is defined
      if (subject.company && queriesUsed === 1) {
        const zaubaResults = await this.zauba.searchCompanyDirectly(subject.company);
        searchResults.push(...zaubaResults);
      }

      for (const sr of searchResults) {
        providersUsed.add(sr.provider);
        
        // RE-ADDED: Extract from the SERP snippet itself (super fast & avoids bot blockers!)
        if (sr.snippet) {
          const snippetPhones = extractPhones(sr.snippet, sr.url || 'SERP');
          for (const phone of snippetPhones) {
            const normalized = normalizePhone(phone.phone) || phone.phone;
            if (!EngineConfig.phone.indianMobileRegex.test(normalized)) continue;

            const { attribution, owner, relationship } = classifyAttribution(phone, subject.name, subject.fatherName);
            const evidence: Evidence = {
              sourceUrl: sr.url || 'SERP', provider: sr.provider, snippet: phone.context.slice(0, 300),
              phone: normalized, ownerName: owner, extractionMethod: 'regex', fetchedAt: Date.now(),
            };

            if (allCandidates.has(normalized)) {
              const existing = allCandidates.get(normalized)!;
              existing.evidence.push(evidence);
              existing.confidence = scoreCandidate(normalized, existing.attribution, existing.matchType, existing.evidence, parsed, phone.context);
            } else {
              const confidence = scoreCandidate(normalized, attribution, 'NONE', [evidence], parsed, phone.context);
              allCandidates.set(normalized, {
                phone: normalized, owner, attribution, confidence, matchType: 'NONE', evidence: [evidence], relationship
              });
            }
          }
        }
      }

      const urls = searchResults.map(r => r.url).filter(Boolean);
      if (urls.length === 0) continue;

      const documents = await this.fetcher.fetchBatch(urls);
      totalDocs += documents.length;

      for (const doc of documents) {
        const regexPhones = extractPhones(doc.content, doc.url);

        let llmPhones: ExtractedPhone[] = [];
        const hasKeyword = /phone|contact|mobile|call/i.test(doc.content.slice(0, 1000));
        
        if (regexPhones.length === 0 && doc.content.length > 100 && hasKeyword && geminiCalls < MAX_GEMINI_CALLS) {
          geminiCalls++;
          try {
            const llmResult = await this.llm.extractContacts(doc.content, subject);
            llmPhones = llmResult.phones.map(p => ({
              phone: p.number,
              raw: p.number,
              context: [p.owner, p.relationship, p.business, p.address].filter(Boolean).join(' | '),
              sourceUrl: doc.url,
            }));
          } catch {}
        }

        const allPhones = [...regexPhones, ...llmPhones];
        totalEvidence += allPhones.length;

        for (const phone of allPhones) {
          const normalized = normalizePhone(phone.phone) || phone.phone;
          if (!EngineConfig.phone.indianMobileRegex.test(normalized)) continue;

          let { attribution, owner, relationship } = classifyAttribution(
            phone, subject.name, subject.fatherName
          );

          if (!owner) {
            const identity = await this.callerId.resolveIdentity(normalized);
            if (identity) {
              owner = identity.name;
              // Re-classify based on the Caller ID name
              const reclass = classifyAttribution({ ...phone, context: identity.name }, subject.name, subject.fatherName);
              if (reclass.owner) {
                attribution = reclass.attribution;
                relationship = reclass.relationship;
              } else {
                attribution = 'PROXY_PERSON';
                relationship = 'caller_id_match';
              }
            }
          }

          const entityMatch = owner
            ? await resolveEntity(owner, subject.name, subject.fatherName, this.llm)
            : { matchType: 'NONE' as const, matchedParts: [] as string[] };

          const evidence: Evidence = {
            sourceUrl: doc.url,
            provider: doc.provider,
            snippet: phone.context.slice(0, 300),
            phone: normalized,
            ownerName: owner,
            extractionMethod: llmPhones.includes(phone) ? 'llm' : 'regex',
            fetchedAt: doc.fetchedAt,
          };

          if (allCandidates.has(normalized)) {
            const existing = allCandidates.get(normalized)!;
            existing.evidence.push(evidence);
            existing.confidence = scoreCandidate(
              normalized, existing.attribution, existing.matchType,
              existing.evidence, parsed, phone.context
            );
          } else {
            const confidence = scoreCandidate(
              normalized, attribution, entityMatch.matchType,
              [evidence], parsed, phone.context
            );

            allCandidates.set(normalized, {
              phone: normalized,
              owner,
              attribution,
              confidence,
              matchType: entityMatch.matchType,
              evidence: [evidence],
              relationship,
            });
          }
        }
      }

      const topCandidate = rankCandidates([...allCandidates.values()])[0];
      if (topCandidate && topCandidate.confidence >= EngineConfig.confidence.highThreshold) {
        break;
      }
    }

    const rankedPhones = rankCandidates([...allCandidates.values()])
      .filter(c => c.confidence >= EngineConfig.confidence.minReportable);

    return {
      subject,
      parsedAddress: parsed,
      phones: rankedPhones,
      queriesUsed,
      queryBudget: EngineConfig.queryBudget,
      documentsFetched: totalDocs,
      totalEvidenceItems: totalEvidence,
      providersUsed: [...providersUsed],
      durationMs: Date.now() - startTime,
      stopReason: queriesUsed >= queries.length ? 'NO_MORE_QUERIES' :
        rankedPhones[0]?.confidence >= EngineConfig.confidence.highThreshold ? 'HIGH_CONFIDENCE' :
        'BUDGET_EXHAUSTED',
      timestamp: Date.now(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
