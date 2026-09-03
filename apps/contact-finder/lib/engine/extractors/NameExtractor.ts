import { ExtractedName } from '../types';

const TITLE_PREFIXES = /\b(?:Mr|Mrs|Ms|Dr|Shri|Smt|Sri|Sh|Km)\b\.?\s*/gi;

const NON_PERSON_WORDS = new Set([
  'AREA', 'ROAD', 'STREET', 'NAGAR', 'COLONY', 'GARDEN', 'PARK',
  'VIHAR', 'PURI', 'GROVE', 'ENCLAVE', 'LAYOUT', 'SECTOR',
  'PHASE', 'BLOCK', 'FLOOR', 'TOWER', 'WING', 'FLAT',
  'PVT', 'LTD', 'CORP', 'INC', 'ENTERPRISES', 'INDUSTRIES',
  'COMPANY', 'PRIVATE', 'LIMITED', 'SERVICES', 'SOLUTIONS',
  'TRADING', 'EXPORTS', 'IMPORTS', 'DEALERS', 'ASSOCIATES',
  'EAST', 'WEST', 'NORTH', 'SOUTH', 'CENTRAL',
  'NEW', 'OLD', 'UPPER', 'LOWER',
  'MARG', 'LANE', 'GALI', 'CHOWK', 'BAZAAR', 'BAZAR',
  'NEAR', 'OPPOSITE', 'BEHIND', 'BESIDE', 'ABOVE', 'BELOW',
]);

export function extractNames(text: string): ExtractedName[] {
  if (!text) return [];

  const results: ExtractedName[] = [];
  const seen = new Set<string>();

  const titledPattern = /\b(?:Mr|Mrs|Ms|Dr|Shri|Smt|Sri|Sh)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g;
  let match;
  while ((match = titledPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (!isNonPersonName(name) && !seen.has(name.toUpperCase())) {
      seen.add(name.toUpperCase());
      const start = Math.max(0, match.index - 100);
      const end = Math.min(text.length, match.index + match[0].length + 100);
      results.push({
        name,
        context: text.slice(start, end).replace(/\n/g, ' ').trim(),
      });
    }
  }

  const capsPattern = /\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,3})\b/g;
  while ((match = capsPattern.exec(text)) !== null) {
    const name = match[1].trim();
    const words = name.split(/\s+/);

    if (words.length >= 2 && words.length <= 4 && !isNonPersonName(name) && !seen.has(name.toUpperCase())) {
      const hasNonPerson = words.some(w => NON_PERSON_WORDS.has(w));
      if (!hasNonPerson) {
        seen.add(name.toUpperCase());
        const start = Math.max(0, match.index - 100);
        const end = Math.min(text.length, match.index + match[0].length + 100);
        results.push({
          name,
          context: text.slice(start, end).replace(/\n/g, ' ').trim(),
        });
      }
    }
  }

  const mixedPattern = /\b([A-Z](?:[a-z]+|\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
  while ((match = mixedPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (!isNonPersonName(name) && !seen.has(name.toUpperCase())) {
      seen.add(name.toUpperCase());
      const start = Math.max(0, match.index - 100);
      const end = Math.min(text.length, match.index + match[0].length + 100);
      results.push({
        name,
        context: text.slice(start, end).replace(/\n/g, ' ').trim(),
      });
    }
  }

  return results;
}

export function isNonPersonName(name: string): boolean {
  const words = name.toUpperCase().split(/\s+/);
  const nonPersonCount = words.filter(w => NON_PERSON_WORDS.has(w)).length;
  return nonPersonCount >= Math.ceil(words.length / 2);
}

export function filterPersonNames(names: ExtractedName[]): ExtractedName[] {
  return names.filter(n => !isNonPersonName(n.name));
}
