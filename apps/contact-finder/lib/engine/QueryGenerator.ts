import { Subject, ParsedAddress } from './types';
import { extractSurname, buildManualSearchQuery } from './address/AddressParser';

export function generateQueries(subject: Subject, parsed: ParsedAddress): string[] {
  const queries: string[] = [];
  const name = subject.name;
  const surname = extractSurname(name);
  const fullAddress = subject.address ? subject.address.trim().replace(/"/g, '') : '';
  const city = parsed.city || subject.city || '';
  const area = parsed.area || '';
  const house = parsed.houseNumber || '';
  const father = subject.fatherName || '';
  const company = subject.company || '';

  const locality = area || city;

  // Strategy 1: Full Address FIRST, then Name SECOND with AND operator in double quotes
  if (fullAddress) {
    queries.push(`"${fullAddress}" AND "${name}"`);
    queries.push(`"${fullAddress}" AND "${name}" (phone OR mobile OR contact OR office)`);
  }

  if (house && locality) {
    queries.push(`"${house} ${locality}" AND "${name}"`);
    if (surname) {
      queries.push(`"${house} ${locality}" AND "${surname}"`);
    }
  }

  if (locality) {
    // Primary Locality FIRST -> Full Name SECOND with AND
    queries.push(`"${locality}" AND "${name}"`);
    queries.push(`"${locality}" AND "${name}" (phone OR mobile OR contact OR office OR address)`);
    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      queries.push(`"${area} ${city}" AND "${name}"`);
    }
  }

  // Strategy 2: Exact Company & Father Context (Address First)
  if (company) {
    if (locality) {
      queries.push(`"${locality}" AND "${name}" "${company}"`);
    }
    queries.push(`"${company}" AND "${name}" contact`);
  }

  if (father && locality) {
    queries.push(`"${locality}" AND "${name}" "${father}"`);
  }

  // Strategy 3: Domain-Scoped Search with Address First + AND
  if (locality) {
    queries.push(`"${locality}" AND "${name}" (site:locatefamily.com OR site:timesofindia.indiatimes.com OR site:webindia123.com)`);
    queries.push(`"${locality}" AND "${name}" (site:indiamart.com OR site:justdial.com OR site:exportersindia.com OR site:tradeindia.com)`);
    queries.push(`"${locality}" AND "${name}" (site:zaubacorp.com OR site:linkedin.com OR site:apollo.io OR site:advisorkhoj.com)`);
    queries.push(`"${locality}" AND "${name}" (site:pdfcoffee.com OR site:scribd.com OR filetype:pdf)`);
    queries.push(`"${locality}" AND "${name}" (directory OR association OR member OR NGO OR voters)`);
  } else {
    queries.push(`"${name}" (site:zaubacorp.com OR site:linkedin.com OR site:apollo.io)`);
    queries.push(`"${name}" (directory OR association OR member OR voters)`);
  }

  // Strategy 4: Surname + Locality fallbacks (Address First)
  if (surname && locality) {
    queries.push(`"${locality}" AND "${surname}" (phone OR contact OR directory)`);
  }

  // Deduplicate and return
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of queries) {
    const normalized = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(normalized) && normalized.length > 5) {
      seen.add(normalized);
      unique.push(q);
    }
  }

  return unique.slice(0, 15);
}
