import { PhoneCandidate, Evidence, AttributionType, NameMatchType, ParsedAddress } from '../types';
import { EngineConfig } from '../config';
import Fuse from 'fuse.js';

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
    let matchedArea = false;
    
    if (parsedAddress.area && parsedAddress.area.length > 2) {
      const fuse = new Fuse([candidateAddress], { includeScore: true, threshold: 0.1, ignoreLocation: true });
      if (fuse.search(parsedAddress.area).length > 0) {
        score += scoring.addressMatch.sameArea;
        matchedArea = true;
      }
    } else if (parsedAddress.city && parsedAddress.city.length > 2) {
      const fuse = new Fuse([candidateAddress], { includeScore: true, threshold: 0.1, ignoreLocation: true });
      if (fuse.search(parsedAddress.city).length > 0) {
        score += scoring.addressMatch.sameCity;
      }
    }

    if (parsedAddress.houseNumber) {
      // Escape special characters for regex
      const escapedHouse = parsedAddress.houseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedHouse}\\b`, 'i');
      if (regex.test(candidateAddress)) {
        // Only award the massive points if the house number is highly unique (e.g., E-862) 
        // OR if the house number is generic (e.g., 20) but we ALSO matched the Area name.
        if (parsedAddress.houseNumber.length > 3 || matchedArea) {
          score += scoring.addressMatch.sameHouseNumber;
        } else {
          // If it's a short/generic number and area didn't match, give a much smaller bonus to avoid false positives.
          score += 5;
        }
      }
    }
  }

  // Bonus for evidence snippet containing exact locality/city co-occurrence
  if (parsedAddress) {
    const locality = (parsedAddress.area || parsedAddress.city || '').toLowerCase();
    if (locality && locality.length > 2) {
      const containsLocalityInSnippet = evidence.some(e => (e.snippet || '').toLowerCase().includes(locality));
      if (containsLocalityInSnippet) {
        score += 10;
      }
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
