// lib/engine/attribution/EvidenceGate.ts
//
// The mandatory evidence gate. NOTHING reaches scoring/export without passing this.
// Pure functions, no I/O. Mirrors the rules validated offline against the real cache.

import { Evidence, ParsedAddress, Subject, NameMatchType } from '../types';

const STOPWORDS = new Set(['C','O','S','D','W','R','MR','MRS','MS','SHRI','SMT','KUMARI','LATE','THE','AND']);

// Multi-person LIST sources: a name co-occurring with a number here does NOT prove ownership.
const LIST_SOURCES = ['scribd.com','pdfcoffee','slideshare','docplayer','coursehero'];
// Pages that are not contact directories at all (harvested wholesale).
const NON_CONTACT_MARKERS = ['billstatus','billstatu','frmcancel','autho/','/cr/','delvat'];
const FOREIGN_MARKERS = ['UNITED ARAB','DUBAI','U.A.E','UAE','P O BOX','PO BOX','SAUDI','QATAR',
  'OMAN','KUWAIT','SINGAPORE','U.S.A','USA','UNITED KINGDOM','LONDON','CANADA','AUSTRALIA'];

export function norm(s?: string): string {
  return (s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
}

export function tokens(s?: string): string[] {
  return norm(s).split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));
}

const ADDRESS_KEYWORDS = new Set([
  'NEW','FINE','STEEL','WORKS','BAZAR','GANJ','OPP','SABZI','NAGAR','ROAD','STREET','LANE',
  'APPT','APARTMENT','FLAT','PLOT','HOUSE','NO','DIST','DISTRICT','TALUKA','VILLAGE','VILL',
  'MAHARASHTRA','GUJARAT','DELHI','MUMBAI','PUNE','BULDHANA','LAKHIMPUR','KHERI','RAJASTHAN',
  'KARNATAKA','TAMIL','NADU','ANDHRA','PRADESH','TELANGANA','KERALA','BENGAL','KOLKATA'
]);

// Strip care-of and trailing address/business tokens glued onto the name
export function cleanName(raw?: string): string {
  const baseName = norm(raw).split(/C\s*\/\s*O|CARE OF|S\s*\/\s*O|D\s*\/\s*O|W\s*\/\s*O/)[0].trim();
  const rawToks = baseName.split(/\s+/).filter(Boolean);
  
  // Find first index of any address/business keyword
  const cleanToks: string[] = [];
  for (const t of rawToks) {
    if (cleanToks.length >= 2 && ADDRESS_KEYWORDS.has(t)) break;
    cleanToks.push(t);
  }
  
  return cleanToks.join(' ');
}

export function careOfTokens(address?: string): string[] {
  const m = norm(address).match(/(?:C\s*\/\s*O|CARE OF|S\s*\/\s*O|D\s*\/\s*O|W\s*\/\s*O)\s+([A-Z ]{3,30})/);
  return m ? tokens(m[1]).slice(0, 3) : [];
}

export function isForeign(address?: string): boolean {
  const u = norm(address);
  return FOREIGN_MARKERS.some(f => u.includes(f));
}

function tokenIn(tok: string, targetTokens: string[]): boolean {
  return targetTokens.some(t => t === tok || (t.length >= 5 && tok.length >= 5 && (t.includes(tok) || tok.includes(t))));
}

export function nameMatch(subjectTokens: string[], surname: string, text: string): NameMatchType {
  const tt = tokens(text);
  if (!subjectTokens.length) return 'NONE';
  
  // Focus on core person name tokens (first 2-3 tokens)
  const coreTokens = subjectTokens.slice(0, 3);
  const coreHits = coreTokens.filter(t => tokenIn(t, tt)).length;

  if (coreHits >= 2) {
    const allCoreInText = coreTokens.every(t => tt.includes(t));
    return allCoreInText ? 'EXACT' : 'VARIANT';
  }

  const totalHits = subjectTokens.filter(t => tokenIn(t, tt)).length;
  if (totalHits >= 2 && totalHits >= Math.min(subjectTokens.length, 2)) {
    return 'VARIANT';
  }

  if (coreHits === 1 && subjectTokens.length === 1) return 'PARTIAL';
  if (surname && tokenIn(surname, tt)) return 'SURNAME_ONLY';
  return totalHits >= 1 ? 'PARTIAL' : 'NONE';
}

export function isJunkPhone(phone: string): boolean {
  if (!/^[6-9]\d{9}$/.test(phone)) return true;
  if (new Set(phone).size <= 3) return true;          // 9999999999, 9090909090
  if (/(\d)\1{5,}/.test(phone)) return true;          // any digit run >= 6
  if (/0{4,}/.test(phone)) return true;               // templated list numbers e.g. 6950000022
  return false;
}

export interface Anchors {
  nameMatch: NameMatchType;
  house: boolean;
  area: boolean;
  careOf: boolean;
}

export interface GateResult {
  pass: boolean;
  reason: string;
  anchors: Anchors;
  isListOnly: boolean;      // supported only by shareholder-list PDFs
  isNonContact: boolean;    // wholesale-harvested status/bill page
  distinctDomains: number;
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

// THE GATE. Reject unless at least one hard anchor is present in the captured evidence blocks.
export function applyGate(
  phone: string,
  evidence: Evidence[],
  subject: Subject,
  parsed: ParsedAddress,
  genericPhones: Set<string>,   // phones seen for many different subjects (directory numbers)
): GateResult {
  const anchors: Anchors = { nameMatch: 'NONE', house: false, area: false, careOf: false };
  const empty = { pass: false, anchors, isListOnly: false, isNonContact: false, distinctDomains: 0 };

  if (isJunkPhone(phone)) return { ...empty, reason: 'DUMMY_OR_SPAM' };
  if (genericPhones && genericPhones.has(phone)) return { ...empty, reason: 'DIRECTORY_GENERIC_NUMBER' };
  if (isForeign(subject.address)) return { ...empty, reason: 'OUT_OF_SCOPE_FOREIGN_ADDRESS' };

  const nameToks = tokens(cleanName(subject.name));
  const surname = nameToks[nameToks.length - 1];
  const coTokens = careOfTokens(subject.address);
  const house = (parsed.houseNumber || '').toUpperCase();
  const areaToks = tokens(parsed.area).filter(t => !nameToks.includes(t) && !['INDIA', 'PINCODE', 'PIN', 'STATE', 'DISTRICT', 'DIST', 'TALUKA'].includes(t));

  const doms = new Set<string>();
  const urls: string[] = [];
  const rank: Record<NameMatchType, number> = { EXACT: 4, VARIANT: 3, SURNAME_ONLY: 2, PARTIAL: 1, NONE: 0 };

  const houseTokens = house ? [house] : [];
  if (house) {
    const strippedHouse = house.replace(/^0+(\d+)/, '$1');
    if (strippedHouse !== house) houseTokens.push(strippedHouse);
  }

  for (const e of evidence) {
    const d = domainOf(e.sourceUrl); if (d) doms.add(d);
    urls.push((e.sourceUrl || '').toLowerCase());
    const block = `${e.snippet || ''} ${e.ownerName || ''}`;
    const nm = nameMatch(nameToks, surname, block);
    if (rank[nm] > rank[anchors.nameMatch]) anchors.nameMatch = nm;
    const bt = tokens(block);
    if (houseTokens.length > 0 && houseTokens.some(h => new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(norm(block)))) anchors.house = true;
    if (areaToks.some(a => tokenIn(a, bt))) anchors.area = true;
    if (coTokens.length && coTokens.every(c => tokenIn(c, bt))) anchors.careOf = true;
  }

  const isNonContact = urls.some(u => NON_CONTACT_MARKERS.some(m => u.includes(m)));
  if (isNonContact) return { ...empty, reason: 'NON_CONTACT_PAGE', anchors, distinctDomains: doms.size };

  const isList = urls.some(u => u.includes('.pdf') || u.includes('filetype')) ||
                 [...doms].some(d => LIST_SOURCES.some(s => d.includes(s)));
  const nonListDomains = [...doms].filter(d => !LIST_SOURCES.some(s => d.includes(s))).length;

  const identity = anchors.nameMatch === 'EXACT' || anchors.nameMatch === 'VARIANT';
  const family = anchors.careOf;
  const premises = anchors.house && anchors.area;
  const weakPremises = (anchors.nameMatch === 'SURNAME_ONLY' || anchors.nameMatch === 'PARTIAL') && (anchors.house || anchors.area);

  const result = (!(identity || family || premises || weakPremises))
    ? { pass: false, reason: `NO_ANCHOR(name=${anchors.nameMatch})`, anchors, isListOnly: isList && nonListDomains < 1, isNonContact: false, distinctDomains: doms.size }
    : { pass: true, reason: 'ANCHOR_OK', anchors, isListOnly: isList && nonListDomains < 1, isNonContact: false, distinctDomains: doms.size };

  console.log(`[DEBUG][GATE] ${phone} | name=${anchors.nameMatch} | house=${anchors.house} | area=${anchors.area} | careOf=${anchors.careOf} | pass=${result.pass} | reason=${result.reason}`);
  return result;
}
