// lib/engine/attribution/ConfidenceScorer.ts
//
// Two separate scores instead of one blended %:
//   relationship = contact owner <-> shareholder / premises
//   reliability  = phone <-> its identified owner
// A candidate that fails the gate is never scored and never classified above Rejected.
// Category A/B require an IDENTITY anchor; C requires premises + at least a surname;
// premises-only coincidences and list-PDF-only hits fall to D (manual review).

import { Evidence, ParsedAddress, Subject, PhoneCandidate, AttributionType, NameMatchType } from '../types';
import { applyGate, GateResult } from './EvidenceGate';
import { EngineConfig } from '../config';

export type LeadCategory = 'A' | 'B' | 'C' | 'D' | 'Rejected';

export interface ScoredCandidate {
  phone: string;
  owner?: string;
  category: LeadCategory;
  relationship: number;   // 0-100
  reliability: number;    // 0-100
  reason: string;
  gate: GateResult;
}

const GOV = ['gov.in', 'nic.in', 'mca.gov'];
const DIRECTORY = ['justdial', 'indiamart', 'tradeindia', 'sulekha', 'exportersindia', 'quickcompany', 'zaubacorp'];
const domainOf = (u: string) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };

export function scoreCandidateGated(
  phone: string,
  owner: string | undefined,
  evidence: Evidence[],
  subject: Subject,
  parsed: ParsedAddress,
  genericPhones: Set<string> = new Set<string>(),
): ScoredCandidate {
  const gate = applyGate(phone, evidence, subject, parsed, genericPhones);
  if (!gate.pass) {
    return { phone, owner, category: 'Rejected', relationship: 0, reliability: 0, reason: gate.reason, gate };
  }

  const a = gate.anchors;
  const identity = a.nameMatch === 'EXACT' || a.nameMatch === 'VARIANT';
  const family = a.careOf;
  const premises = a.house && a.area;
  const weakPremises = a.nameMatch === 'SURNAME_ONLY' && (a.house || a.area);

  // relationship strength (0-100)
  let relationship = 0;
  if (identity) relationship += a.nameMatch === 'EXACT' ? 55 : 40;
  if (family) relationship += 30;
  if (premises) relationship += 35;
  else if (weakPremises) relationship += 25;
  relationship = Math.min(100, relationship);

  // contact reliability (0-100)
  let reliability = 30;
  if (owner) reliability += 15;
  if (gate.distinctDomains >= 2) reliability += 25;
  const doms = evidence.map(e => domainOf(e.sourceUrl));
  if (doms.some(d => GOV.some(g => d.includes(g)))) reliability += 25;
  else if (doms.some(d => DIRECTORY.some(g => d.includes(g)))) reliability += 5;
  reliability = Math.min(100, reliability);

  // strict classification (A, B, C, D, Rejected)
  let category: LeadCategory;
  if (identity && relationship >= 55) category = 'A';
  else if ((identity && premises) || (family && a.nameMatch !== 'NONE')) category = 'B';
  else if (premises && (a.nameMatch === 'EXACT' || a.nameMatch === 'VARIANT' || a.nameMatch === 'SURNAME_ONLY')) category = 'C';
  else category = 'D';

  // a shareholder-list PDF alone cannot support A/B
  let reason = 'anchor ok';
  if ((category === 'A' || category === 'B') && gate.isListOnly) {
    category = 'D';
    reason = 'list-PDF only, no independent corroboration -> manual review';
  }

  return { phone, owner, category, relationship, reliability, reason, gate };
}

// Backward-compatibility wrapper for legacy score candidate signature
export function scoreCandidate(
  phone: string,
  attribution: AttributionType,
  matchType: NameMatchType,
  evidence: Evidence[],
  parsedAddress?: ParsedAddress,
  candidateAddress?: string,
  subject?: Subject,
): number {
  if (!subject || !parsedAddress) return 0;
  const scored = scoreCandidateGated(phone, undefined, evidence, subject, parsedAddress);
  let finalScore = 0;
  if (scored.category !== 'Rejected') {
    finalScore = Math.round((scored.relationship + scored.reliability) / 2);
  }
  console.log(`[DEBUG][SCORE] ${phone} | subject=${subject?.name} | parsedArea=${parsedAddress?.area} | score=${finalScore}`);
  return finalScore;
}

// Ranking for call sheet: A > B > C > D > Rejected, then relationship, then reliability.
const ORDER: Record<LeadCategory, number> = { A: 0, B: 1, C: 2, D: 3, Rejected: 9 };
export function rankForCallSheet(cands: ScoredCandidate[]): ScoredCandidate[] {
  return [...cands].sort((x, y) =>
    ORDER[x.category] - ORDER[y.category] ||
    y.relationship - x.relationship ||
    y.reliability - x.reliability);
}

export function rankCandidates(candidates: PhoneCandidate[]): PhoneCandidate[] {
  return [...candidates].sort((a, b) => b.confidence - a.confidence);
}

export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= EngineConfig.confidence.highThreshold) return 'high';
  if (score >= EngineConfig.confidence.mediumThreshold) return 'medium';
  return 'low';
}
