import { PhoneCandidate, Evidence, AttributionType, NameMatchType, ParsedAddress } from '../types';
import { EngineConfig } from '../config';

export function scoreCandidate(
  phone: string,
  attribution: AttributionType,
  matchType: NameMatchType,
  evidence: Evidence[],
  parsedAddress?: ParsedAddress,
  candidateAddress?: string,
): number {
  let score = 0;
  const scoring = EngineConfig.scoring;

  score += scoring.nameMatch[matchType] || 0;
  score += scoring.attribution[attribution] || 0;

  if (parsedAddress && candidateAddress) {
    const upperCandidate = candidateAddress.toUpperCase();
    if (parsedAddress.houseNumber && upperCandidate.includes(parsedAddress.houseNumber)) {
      score += scoring.addressMatch.sameHouseNumber;
    } else if (parsedAddress.area && upperCandidate.includes(parsedAddress.area)) {
      score += scoring.addressMatch.sameArea;
    } else if (parsedAddress.city && upperCandidate.includes(parsedAddress.city)) {
      score += scoring.addressMatch.sameCity;
    }
  }

  const uniqueSources = new Set(evidence.map(e => e.sourceUrl));
  if (uniqueSources.size > 1) {
    score += scoring.multiSourceBonus * (uniqueSources.size - 1);
  }

  for (const e of evidence) {
    try {
      const domain = new URL(e.sourceUrl).hostname;
      if (EngineConfig.governmentDomains.some(d => domain.includes(d))) {
        score += scoring.sourceReliability.government;
        break;
      }
      if (EngineConfig.establishedDomains.some(d => domain.includes(d))) {
        score += scoring.sourceReliability.established;
        break;
      }
    } catch {}
  }

  return Math.max(0, Math.min(100, score));
}

export function rankCandidates(candidates: PhoneCandidate[]): PhoneCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;

    const attrOrder: Record<AttributionType, number> = {
      DIRECT_PERSON: 0,
      PROXY_PERSON: 1,
      RWA: 2,
      BROKER: 3,
      ORGANIZATION: 4,
      GENERIC: 5,
      AMBIGUOUS: 6,
      UNKNOWN: 7,
    };
    return (attrOrder[a.attribution] || 99) - (attrOrder[b.attribution] || 99);
  });
}

export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= EngineConfig.confidence.highThreshold) return 'high';
  if (score >= EngineConfig.confidence.mediumThreshold) return 'medium';
  return 'low';
}
