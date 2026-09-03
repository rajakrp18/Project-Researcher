import { Subject, ParsedAddress } from './types';
import { extractSurname, buildManualSearchQuery } from './address/AddressParser';

export function generateQueries(subject: Subject, parsed: ParsedAddress): string[] {
  const queries: string[] = [];
  const name = subject.name;
  const surname = extractSurname(name);
  const city = parsed.city || subject.city || '';
  const area = parsed.area || '';
  const house = parsed.houseNumber || '';
  const father = subject.fatherName || '';
  const company = subject.company || '';

  // Strategy 1: Local Business & Extremely Specific House Search (Highest Priority)
  if (house && area) {
    queries.push(`"${house} ${area}" ${city} (shop OR clinic OR depot OR business OR office OR dairy)`);
    // Crucial for obituaries, public directories, and RWA listings
    queries.push(`"${house} ${area.split(' ').slice(0, 2).join(' ')}" "${surname}"`);
  }

  // Strategy 2: Exact Company Match (Highest Priority)
  if (company) {
    queries.push(`"${name}" "${company}" contact`);
  }

  // Strategy 3: Family & Public Records (LocateFamily, Times of India)
  queries.push(`"${name}" ${city} (site:locatefamily.com OR site:timesofindia.indiatimes.com OR site:webindia123.com)`);

  // Strategy 4: B2B & Trade Directories (Grouped to save query budget)
  queries.push(`"${name}" ${city} (site:indiamart.com OR site:justdial.com OR site:exportersindia.com OR site:indianyellowpages.com OR site:tradeindia.com)`);
  
  // Strategy 4: Corporate, Professionals, & Wealth
  queries.push(`"${name}" (site:zaubacorp.com OR site:linkedin.com OR site:apollo.io OR site:advisorkhoj.com OR site:wealthmaker.in)`);
  
  // Strategy 5: PDFs & Documents (PDFCoffee, Scribd, general PDFs)
  queries.push(`"${name}" ${city} (site:pdfcoffee.com OR site:scribd.com OR filetype:pdf)`);

  // Strategy 6: Memberships, NGOs, & Associations
  queries.push(`"${name}" ${city} (directory OR association OR member OR NGO OR voters)`);

  // Strategy 7: Secondary B2B Sources
  queries.push(`"${name}" ${city} (site:bhartibiz.com OR site:daily4trade.com OR site:bizinfosystem.in OR site:dataexports.in OR site:pinozip.com)`);
  
  // Fallback 1: Loose Company Match (No quotes around name)
  if (company) {
    queries.push(`${name} "${company}" contact`);
  }
  
  // Fallback 2: Loose B2B Directory Match
  queries.push(`${name} ${city} (site:indiamart.com OR site:justdial.com OR site:zaubacorp.com)`);

  // Strategy 7: Secondary B2B & Medical
  queries.push(`"${name}" ${city} (site:bhartibiz.com OR site:daily4trade.com OR site:bizinfosystem.in OR site:dataexports.in OR site:pinozip.com)`);

  // Fallbacks based on available data
  if (father) {
    queries.push(`"${name}" "${father}" ${city}`);
  }

  if (company) {
    queries.push(`"${name}" "${company}" contact`);
  }

  if (house && area) {
    queries.push(`"${house} ${area.split(' ').slice(0, 2).join(' ')}" "${surname}"`);
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
