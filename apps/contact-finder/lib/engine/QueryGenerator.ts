import { Subject, ParsedAddress } from './types';

export function generateQueries(subject: Subject, parsed: ParsedAddress): string[] {
  const queries: string[] = [];
  const name = subject.name.replace(/["']/g, '').trim();
  const city = (parsed.city || subject.city || '').replace(/["']/g, '').trim();
  const area = (parsed.area || '').replace(/["']/g, '').trim();
  const house = (parsed.houseNumber || '').replace(/["']/g, '').trim();
  const father = (subject.fatherName || '').replace(/["']/g, '').trim();
  const company = (subject.company || '').replace(/["']/g, '').trim();
  const locality = area || city;

  // 1. High-Yield Name + City/Locality Dorks
  if (name && city) {
    queries.push(`"${name}" "${city}"`);
  }
  if (name && area && area.toLowerCase() !== city.toLowerCase()) {
    queries.push(`"${name}" "${area}"`);
  }

  // 2. High-Yield Corporate / Director / MCA Registry Dorks
  if (name) {
    queries.push(`"${name}" (director OR partner OR proprietor OR signatory)`);
    if (city) {
      queries.push(`"${name}" "${city}" (site:zaubacorp.com OR site:thecompanycheck.com OR site:quickcompany.in)`);
    } else {
      queries.push(`"${name}" (site:zaubacorp.com OR site:thecompanycheck.com OR site:quickcompany.in)`);
    }
  }

  // 3. High-Yield B2B & Local Directory Dorks
  if (name && city) {
    queries.push(`"${name}" "${city}" (site:indiamart.com OR site:tradeindia.com OR site:justdial.com)`);
  }

  // 4. Exact House / Premises Dorks
  if (name && house && locality) {
    queries.push(`"${house}" "${locality}" "${name}"`);
  }

  // 5. Company / Firm Specific Dorks
  if (company) {
    queries.push(`"${name}" "${company}"`);
    if (city) queries.push(`"${company}" "${city}" (contact OR phone OR mobile)`);
  }

  // 6. Relationship / Father Name Dork
  if (name && father) {
    queries.push(`"${name}" "${father}"`);
    if (locality) queries.push(`"${name}" "${father}" "${locality}"`);
  }

  // 7. Clean Address Token Dork (Extracts building/society names without exact quote locks)
  if (subject.address) {
    const addressClean = subject.address.replace(/[^a-zA-Z0-9\s]/g, ' ');
    const tokens = addressClean.split(/\s+/).filter(w => w.length >= 4 && !/^(INDIA|MAHARASHTRA|GUJARAT|DELHI|ROAD|STREET|NEAR|OPP|DIST|POST)$/i.test(w));
    if (tokens.length >= 2) {
      const addressSnippet = tokens.slice(0, 3).join(' ');
      queries.push(`"${name}" "${addressSnippet}"`);
    }
  }

  // Deduplicate while preserving intent staging order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of queries) {
    const normalized = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(normalized) && normalized.length > 5) {
      seen.add(normalized);
      unique.push(q);
    }
  }

  return unique.slice(0, 6);
}

export function generateReversePhoneQueries(phone: string, subjectName?: string): string[] {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) return [];

  const queries = [
    `"${cleanPhone}"`,
    `"${cleanPhone}" (business OR owner OR contact OR address)`
  ];

  if (subjectName) {
    queries.push(`"${cleanPhone}" "${subjectName}"`);
  }

  return queries;
}
