import { NameMatchType, LLMExtractor } from '../types';
import Fuse from 'fuse.js';

export interface EntityMatch {
  name: string;
  matchType: NameMatchType;
  matchedParts: string[];
}

export function resolveEntitySync(extractedName: string, subjectName: string, fatherName?: string): EntityMatch {
  const extracted = normalize(extractedName);
  const subject = normalize(subjectName);
  const father = fatherName ? normalize(fatherName) : undefined;

  if (extracted === subject) {
    return { name: extractedName, matchType: 'EXACT', matchedParts: [subjectName] };
  }

  if (father && extracted === father) {
    return { name: extractedName, matchType: 'EXACT', matchedParts: [fatherName!] };
  }

  const extractedParts = extracted.split(/\s+/);
  const subjectParts = subject.split(/\s+/);
  const fatherParts = father?.split(/\s+/) || [];

  if (isVariant(extractedParts, subjectParts)) {
    return { name: extractedName, matchType: 'VARIANT', matchedParts: subjectParts };
  }
  if (fatherParts.length > 0 && isVariant(extractedParts, fatherParts)) {
    return { name: extractedName, matchType: 'VARIANT', matchedParts: fatherParts };
  }

  const subjectSurname = subjectParts[subjectParts.length - 1];
  const fatherSurname = fatherParts.length > 0 ? fatherParts[fatherParts.length - 1] : '';

  if (extractedParts.some(p => p === subjectSurname) || (fatherSurname && extractedParts.some(p => p === fatherSurname))) {
    return { name: extractedName, matchType: 'SURNAME_ONLY', matchedParts: [subjectSurname || fatherSurname] };
  }

  const matchedParts = extractedParts.filter(p =>
    subjectParts.includes(p) || fatherParts.includes(p)
  );

  if (matchedParts.length > 0) {
    return { name: extractedName, matchType: 'PARTIAL', matchedParts };
  }

  return { name: extractedName, matchType: 'NONE', matchedParts: [] };
}

export async function resolveEntity(extractedName: string, subjectName: string, fatherName?: string, llm?: LLMExtractor): Promise<EntityMatch> {
  const extracted = normalize(extractedName);
  const subject = normalize(subjectName);
  const father = fatherName ? normalize(fatherName) : undefined;

  if (extracted === subject) {
    return { name: extractedName, matchType: 'EXACT', matchedParts: [subjectName] };
  }

  if (father && extracted === father) {
    return { name: extractedName, matchType: 'EXACT', matchedParts: [fatherName!] };
  }

  const extractedParts = extracted.split(/\s+/);
  const subjectParts = subject.split(/\s+/);
  const fatherParts = father?.split(/\s+/) || [];

  if (isVariant(extractedParts, subjectParts)) {
    return { name: extractedName, matchType: 'VARIANT', matchedParts: subjectParts };
  }
  if (fatherParts.length > 0 && isVariant(extractedParts, fatherParts)) {
    return { name: extractedName, matchType: 'VARIANT', matchedParts: fatherParts };
  }

  const subjectSurname = subjectParts[subjectParts.length - 1];
  const fatherSurname = fatherParts.length > 0 ? fatherParts[fatherParts.length - 1] : '';

  if (extractedParts.some(p => p === subjectSurname) || (fatherSurname && extractedParts.some(p => p === fatherSurname))) {
    // Before giving a weak SURNAME_ONLY, check with Gemini if it's a stronger fuzzy match
    if (llm) {
      const isMatch = await askLLMFuzzyMatch(extractedName, subjectName, llm);
      if (isMatch) return { name: extractedName, matchType: 'VARIANT', matchedParts: [subjectName] };
    }
    return { name: extractedName, matchType: 'SURNAME_ONLY', matchedParts: [subjectSurname || fatherSurname] };
  }

  const matchedParts = extractedParts.filter(p =>
    subjectParts.includes(p) || fatherParts.includes(p)
  );

  if (matchedParts.length > 0) {
    if (llm) {
      const isMatch = await askLLMFuzzyMatch(extractedName, subjectName, llm);
      if (isMatch) return { name: extractedName, matchType: 'VARIANT', matchedParts };
    }
    return { name: extractedName, matchType: 'PARTIAL', matchedParts };
  }

  // Final check: Maybe it's a completely misspelled variant
  if (llm) {
    const isMatch = await askLLMFuzzyMatch(extractedName, subjectName, llm);
    if (isMatch) return { name: extractedName, matchType: 'VARIANT', matchedParts: [subjectName] };
  }

  return { name: extractedName, matchType: 'NONE', matchedParts: [] };
}

async function askLLMFuzzyMatch(nameA: string, nameB: string, llm: LLMExtractor): Promise<boolean> {
  const fuse = new Fuse([nameB.toLowerCase()], { threshold: 0.3 });
  if (fuse.search(nameA.toLowerCase()).length > 0) {
    return true; // fast fuzzy match without LLM
  }
  
  if (llm.isSameEntity) {
    return await llm.isSameEntity(nameA, nameB);
  }
  
  return false;
}

function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isVariant(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;

  const matchCount = a.filter(part => b.includes(part)).length;
  const ratio = matchCount / Math.max(a.length, b.length);
  return ratio >= 0.6 && matchCount >= 2;
}
