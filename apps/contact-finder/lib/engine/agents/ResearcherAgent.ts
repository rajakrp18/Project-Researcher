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

    // SERP Pre-filtering and relevance ranking to fetch only top-scored documents
    const scoredResults = searchResults
      .map(sr => ({ sr, score: this.scoreSERPResult(sr, subject, parsed) }))
      .filter(item => item.score > 0);

    scoredResults.sort((a, b) => b.score - a.score);

    const finalResults = scoredResults.length > 0 ? scoredResults.map(i => i.sr).slice(0, 4) : searchResults.slice(0, 3);
    
    const providers = finalResults.map(r => r.provider);
    const urls = finalResults.map(r => r.url).filter(Boolean) as string[];
    
    let docs: FetchedDocument[] = [];
    if (urls.length > 0) {
      docs = await this.fetcher.fetchBatch(urls);
    }

    return { docs, providers, serps: finalResults };
  }

  private scoreSERPResult(result: SearchResult, subject: Subject, parsed: ParsedAddress): number {
    let score = 0;
    const text = `${result.title || ''} ${result.snippet || ''} ${result.url || ''}`.toLowerCase();
    
    const subjectNameLower = (subject.name || '').toLowerCase();
    if (text.includes(subjectNameLower)) score += 40;

    if (parsed.houseNumber && text.includes(parsed.houseNumber.toLowerCase())) score += 35;

    const city = (parsed.city || subject.city || '').toLowerCase();
    const area = (parsed.area || '').toLowerCase();
    if (area && text.includes(area)) score += 20;
    if (city && text.includes(city)) score += 10;

    if (subject.company && text.includes(subject.company.toLowerCase())) score += 30;

    // Special authoritative B2B providers
    if (['explorium', 'apify-zauba', 'zaubacorp'].includes(result.provider)) score += 25;

    // Penalties for noisy directory indexes
    if (text.includes('cause list') || text.includes('voter list')) score -= 30;

    return score;
  }
}
