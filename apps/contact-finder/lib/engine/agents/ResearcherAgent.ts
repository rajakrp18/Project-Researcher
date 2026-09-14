import { Subject, ParsedAddress, FetchedDocument, SearchResult } from '../types';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { BrowserFetcher } from '../fetch/BrowserFetcher';
import { ZaubaCorpScraper } from '../providers/ZaubaCorpScraper';
import { parseAddress } from '../address/AddressParser';

export class ResearcherAgent {
  constructor(
    private registry: ProviderRegistry,
    private fetcher: BrowserFetcher,
    private zauba: ZaubaCorpScraper
  ) {}

  async fetchDocumentsForQuery(query: string, subject: Subject, isFirstQuery: boolean): Promise<{ docs: FetchedDocument[], providers: string[], serps: SearchResult[] }> {
    const searchResults = await this.registry.searchAll(query, { maxResults: 5 });
    
    if (subject.company && isFirstQuery) {
      const zaubaResults = await this.zauba.searchCompanyDirectly(subject.company);
      searchResults.push(...zaubaResults);
    }

    const parsed = parseAddress(subject.address);
    if (subject.city && !parsed.city) parsed.city = subject.city.toUpperCase();

    // SERP Pre-filtering to discard noise/waste data before fetching web pages
    const filteredResults = searchResults.filter(sr => this.isRelevantSERPResult(sr, subject, parsed));

    // If pre-filtering left results, use filtered; fallback to original if filtered is empty but query was very targeted
    const finalResults = filteredResults.length > 0 ? filteredResults : searchResults;
    
    const providers = finalResults.map(r => r.provider);
    const urls = finalResults.map(r => r.url).filter(Boolean) as string[];
    
    let docs: FetchedDocument[] = [];
    if (urls.length > 0) {
      docs = await this.fetcher.fetchBatch(urls);
    }

    return { docs, providers, serps: finalResults };
  }

  private isRelevantSERPResult(result: SearchResult, subject: Subject, parsed: ParsedAddress): boolean {
    const text = `${result.title || ''} ${result.snippet || ''} ${result.url || ''}`.toLowerCase();
    
    // Name tokens check
    const nameTokens = (subject.name || '').toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const surname = nameTokens[nameTokens.length - 1];
    const hasNameMatch = surname ? text.includes(surname) : nameTokens.some(t => text.includes(t));
    
    // Company match check
    const hasCompanyMatch = subject.company ? text.includes(subject.company.toLowerCase()) : false;
    
    // Locality / City match check
    const city = (parsed.city || subject.city || '').toLowerCase();
    const area = (parsed.area || '').toLowerCase();
    const hasLocalityMatch = (city && text.includes(city)) || (area && text.includes(area));

    if (hasCompanyMatch) return true;
    if (hasNameMatch && (hasLocalityMatch || !city)) return true;

    // Special providers always kept
    if (result.provider === 'explorium' || result.provider === 'apify-zauba') return true;

    return false;
  }
}
