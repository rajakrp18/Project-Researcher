import { Subject, PhoneCandidate, Evidence, ExtractedPhone, ParsedAddress, LLMExtractor } from '../types';
import { DatabaseService } from '../db/DatabaseService';
import { CallerIdService } from '../providers/CallerIdService';
import { classifyAttribution } from '../attribution/ContactAttributionResolver';
import { resolveEntity } from '../attribution/EntityResolver';
import { scoreCandidate } from '../attribution/ConfidenceScorer';
import { normalizePhone } from '../extractors/PhoneExtractor';
import { EngineConfig } from '../config';

export class VerifierAgent {
  constructor(
    private db: DatabaseService,
    private callerId: CallerIdService,
    private llm: LLMExtractor
  ) {}

  getKnownCandidates(subject: Subject): PhoneCandidate[] {
    const existingPhones = this.db.findPhonesForEntity(subject.name);
    return existingPhones.map(ep => ({
      phone: ep.phone, 
      owner: subject.name, 
      attribution: 'DIRECT_PERSON', 
      confidence: ep.confidence,
      matchType: 'EXACT', 
      relationship: 'self',
      evidence: ep.source && ep.source !== 'OSINT Engine' 
        ? [{ sourceUrl: ep.source, provider: 'Knowledge Graph', snippet: 'Loaded from past investigation memory.', phone: ep.phone, ownerName: subject.name, extractionMethod: 'regex', fetchedAt: Date.now() }] 
        : []
    }));
  }

  saveConfirmedCandidates(subject: Subject, candidates: PhoneCandidate[]) {
    for (const p of candidates) {
      if (p.confidence >= EngineConfig.confidence.highThreshold) {
        this.db.savePhone(subject.name, p.phone, p.confidence, p.evidence[0]?.sourceUrl || 'OSINT Engine');
      }
    }
  }

  async verifyAndScore(
    phone: ExtractedPhone, 
    subject: Subject, 
    parsed: ParsedAddress, 
    evidenceTemplate: Partial<Evidence>,
    isLlmExtracted: boolean,
    existingCandidate?: PhoneCandidate,
    forceAttribution?: any
  ): Promise<PhoneCandidate | null> {
    const normalized = normalizePhone(phone.phone) || phone.phone;
    if (!EngineConfig.phone.indianMobileRegex.test(normalized)) return null;

    let attribution = forceAttribution?.attribution || 'UNKNOWN';
    let owner = forceAttribution?.owner || null;
    let relationship = forceAttribution?.relationship || 'unknown';

    if (!forceAttribution) {
      const cls = classifyAttribution(phone, subject.name, subject.fatherName);
      attribution = cls.attribution;
      owner = cls.owner;
      relationship = cls.relationship;

      if (!owner) {
        const identity = await this.callerId.resolveIdentity(normalized);
        if (identity) {
          owner = identity.name;
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
    }

    const entityMatch = owner
      ? await resolveEntity(owner, subject.name, subject.fatherName, this.llm)
      : { matchType: 'NONE' as const, matchedParts: [] as string[] };

    const evidence: Evidence = {
      ...(evidenceTemplate as Evidence),
      phone: normalized,
      ownerName: owner,
      extractionMethod: isLlmExtracted ? 'llm' : 'regex',
    };

    if (existingCandidate) {
      existingCandidate.evidence.push(evidence);
      existingCandidate.confidence = scoreCandidate(
        normalized, existingCandidate.attribution, existingCandidate.matchType,
        existingCandidate.evidence, parsed, phone.context
      );
      return existingCandidate;
    } else {
      const confidence = scoreCandidate(
        normalized, attribution, entityMatch.matchType,
        [evidence], parsed, phone.context
      );

      return {
        phone: normalized,
        owner,
        attribution,
        confidence,
        matchType: entityMatch.matchType,
        evidence: [evidence],
        relationship,
      };
    }
  }
}
