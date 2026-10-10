import { ParsedAddress } from '../types';
import { detectCity, INDIAN_CITIES } from './cityTable';
import { cleanName as cleanNameGate, careOfTokens } from '../attribution/EvidenceGate';

const CARE_OF_REGEX = /^(?:C\s*\/\s*O|CARE OF|S\s*\/\s*O|D\s*\/\s*O|W\s*\/\s*O)\s+(.+?)(?=\s+[A-Z]-?\d|\s+\d{1,5}\s|$)/i;
const HOUSE_NUMBER_REGEX = /\b([A-Z]?\s*-?\s*\d{1,5}\s*(?:\/\s*\d{1,5})?(?:\s*[A-Z])?)\b/i;

const FLOOR_NOISE = /\b(?:\d+(?:ST|ND|RD|TH)\s+FL(?:OOR|R)?|GROUND\s+FL(?:OOR|R)?|BASEMENT)\b/gi;
const PHASE_NOISE = /\bPHASE[\s-]*(?:I{1,3}|IV|V|VI|[1-6])\b/gi;
const SECTOR_NOISE = /\bSECTOR[\s-]*\d{1,3}\b/gi;

const AREA_SUFFIXES = [
  'VIHAR', 'NAGAR', 'COLONY', 'BAZAR', 'BAZAAR', 'GARDEN', 'GARDENS',
  'PARK', 'PURI', 'ENCLAVE', 'LAYOUT', 'EXTENSION', 'EXTN',
  'APPTS', 'APARTMENTS', 'FLATS', 'SOCIETY', 'COMPLEX',
  'LANE', 'GALI', 'MARG', 'ROAD', 'CHOWK', 'GATE',
  'BHAWAN', 'BHAVAN',
];

export function cleanName(raw?: string): string {
  if (!raw) return '';
  return cleanNameGate(raw);
}

export function extractCareOf(address?: string): string[] {
  return careOfTokens(address);
}

export function parseAddress(raw: string): ParsedAddress {
  const result: ParsedAddress = { raw };
  if (!raw || !raw.trim()) return result;

  let working = raw.toUpperCase().trim();

  const careOfMatch = working.match(CARE_OF_REGEX);
  if (careOfMatch) {
    result.careOf = careOfMatch[1].trim();
    working = working.slice(careOfMatch[0].length).trim();
  }

  const pinMatch = working.match(/\b(\d{6})\b/);
  if (pinMatch) {
    const pin = pinMatch[1];
    if (pin[0] >= '1' && pin[0] <= '9') {
      result.pinCode = pin;
      working = working.replace(pin, '').trim();
    }
  }

  const cityKeys = Object.keys(INDIAN_CITIES).sort((a, b) => b.length - a.length);
  for (const variant of cityKeys) {
    const idx = working.lastIndexOf(variant);
    if (idx !== -1) {
      result.city = INDIAN_CITIES[variant];
      working = (working.slice(0, idx) + working.slice(idx + variant.length)).trim();
      break;
    }
  }

  working = working.replace(FLOOR_NOISE, '').trim();
  working = working.replace(PHASE_NOISE, '').trim();

  const sectorMatch = working.match(SECTOR_NOISE);
  if (sectorMatch) {
    if (!result.area) result.area = sectorMatch[0];
    working = working.replace(SECTOR_NOISE, '').trim();
  }

  const houseMatch = working.match(HOUSE_NUMBER_REGEX);
  if (houseMatch) {
    const candidate = houseMatch[1].trim();
    if (/\d/.test(candidate)) {
      result.houseNumber = candidate.replace(/\s+/g, '');
      const idx = working.indexOf(houseMatch[0]);
      working = (working.slice(0, idx) + working.slice(idx + houseMatch[0].length)).trim();
    }
  }

  working = working.replace(/[,|]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (working) {
    const hasAreaKeyword = AREA_SUFFIXES.some(
      suffix => new RegExp(`\\b${suffix}\\b`, 'i').test(working)
    );

    if (hasAreaKeyword || result.area) {
      const areaText = working
        .replace(/^[,\s]+|[,\s]+$/g, '')
        .trim();

      if (areaText.length <= 50) {
        result.area = result.area
          ? `${result.area} ${areaText}`
          : areaText;
      }
    }
  }

  if (result.area) {
    result.area = result.area.replace(/^[,\s]+|[,\s]+$/g, '').trim();
  }

  return result;
}

export function buildSearchAddress(parsed: ParsedAddress): string {
  const parts: string[] = [];
  if (parsed.houseNumber) parts.push(parsed.houseNumber);
  if (parsed.area) parts.push(parsed.area);
  if (parsed.city) parts.push(parsed.city);
  return parts.join(' ');
}

export function extractSurname(name: string): string | undefined {
  const parts = cleanName(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return parts[0] || undefined;
}

export function buildManualSearchQuery(parsed: ParsedAddress, name: string): string {
  const surname = extractSurname(name);
  const parts: string[] = [];

  if (parsed.houseNumber && parsed.area) {
    parts.push(`"${parsed.houseNumber} ${parsed.area.split(' ').slice(0, 2).join(' ')}"`);
  } else if (parsed.area) {
    parts.push(`"${parsed.area.split(' ').slice(0, 3).join(' ')}"`);
  }

  if (parsed.city) {
    parts.push(parsed.city);
  }

  if (surname) {
    parts.push(`"${surname}"`);
  }

  return parts.join(' ');
}
