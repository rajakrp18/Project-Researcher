import { AttributionType, ExtractedPhone } from '../types';
import { resolveEntity } from './EntityResolver';
import { extractNames, filterPersonNames } from '../extractors/NameExtractor';

const RWA_PATTERNS = [
  /\brwa\b/i,
  /\bresident\s+welfare\b/i,
  /\bcontact\s+through\s+society\b/i,
  /\bsociety\s+secretary\b/i,
  /\bflat\s+owners?\s+association\b/i,
];

const BROKER_PATTERNS = [
  /\bbroker\b/i,
  /\bproperty\s+dealer\b/i,
  /\breal\s+estate\s+agent\b/i,
  /\bproperty\s+consultant\b/i,
];

const PROXY_PATTERNS = [
  /\bsecretary\s+(?:mr|mrs|ms|shri|smt)\.?\s+/i,
  /\bneighbou?r\s+(?:mr|mrs|ms|shri|smt)\.?\s+/i,
  /\bcontact\s+through\b/i,
  /\bson\s+of\b/i,
  /\bdaughter\s+of\b/i,
  /\bwife\s+of\b/i,
  /\bhusband\s+of\b/i,
  /\bfather\b/i,
  /\bmother\b/i,
  /\brelative\b/i,
];

const ORG_PATTERNS = [
  /\boffice\s+phone\b/i,
  /\breception\b/i,
  /\bhelpline\b/i,
  /\bcustomer\s+(?:care|service|support)\b/i,
  /\btoll\s*free\b/i,
  /\bcorporate\s+office\b/i,
];

const GENERIC_PATTERNS = [
  /\bcontact\s+us\b/i,
  /\breach\s+us\b/i,
  /\bget\s+in\s+touch\b/i,
  /\bcall\s+us\b/i,
  /\bfor\s+(?:enquiry|inquiry|queries)\b/i,
];

export function classifyAttribution(
  phone: ExtractedPhone,
  subjectName: string,
  fatherName?: string,
): { attribution: AttributionType; owner?: string; relationship?: string } {
  const context = phone.context;

  for (const pattern of RWA_PATTERNS) {
    if (pattern.test(context)) {
      return { attribution: 'RWA', relationship: 'rwa_official' };
    }
  }

  for (const pattern of BROKER_PATTERNS) {
    if (pattern.test(context)) {
      return { attribution: 'BROKER', relationship: 'broker' };
    }
  }

  for (const pattern of PROXY_PATTERNS) {
    if (pattern.test(context)) {
      const names = filterPersonNames(extractNames(context));
      const nonSubjectNames = names.filter(n => {
        const match = resolveEntity(n.name, subjectName, fatherName);
        return match.matchType === 'NONE';
      });
      const owner = nonSubjectNames[0]?.name;
      return { attribution: 'PROXY_PERSON', owner, relationship: 'proxy' };
    }
  }

  for (const pattern of ORG_PATTERNS) {
    if (pattern.test(context)) {
      return { attribution: 'ORGANIZATION', relationship: 'organization' };
    }
  }

  const names = filterPersonNames(extractNames(context));

  const hasGenericPattern = GENERIC_PATTERNS.some(p => p.test(context));
  if (hasGenericPattern && names.length === 0) {
    return { attribution: 'GENERIC', relationship: 'generic' };
  }

  const subjectMatch = resolveEntity(subjectName, subjectName, fatherName);
  const subjectInContext = context.toUpperCase().includes(subjectName.toUpperCase());
  const fatherInContext = fatherName ? context.toUpperCase().includes(fatherName.toUpperCase()) : false;

  const otherNames = names.filter(n => {
    const match = resolveEntity(n.name, subjectName, fatherName);
    return match.matchType === 'NONE';
  });

  if (subjectInContext || fatherInContext) {
    if (otherNames.length === 0) {
      const owner = fatherInContext ? fatherName : subjectName;
      return { attribution: 'DIRECT_PERSON', owner, relationship: fatherInContext ? 'father' : 'self' };
    }

    if (otherNames.length > 0) {
      return { attribution: 'AMBIGUOUS', owner: otherNames[0]?.name };
    }
  }

  const surnameWords = subjectName.toUpperCase().split(/\s+/);
  const surname = surnameWords[surnameWords.length - 1];
  const surnameInContext = context.toUpperCase().includes(surname);

  if (surnameInContext && surname.length >= 3) {
    if (otherNames.length === 0) {
      return { attribution: 'PROXY_PERSON', relationship: 'surname_match' };
    }
    return { attribution: 'AMBIGUOUS' };
  }

  if (names.length > 0) {
    return { attribution: 'PROXY_PERSON', owner: names[0]?.name, relationship: 'unknown_person' };
  }

  return { attribution: 'UNKNOWN' };
}
