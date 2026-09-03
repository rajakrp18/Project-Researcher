import { SearchProvider, SearchOptions } from './SearchProvider';
import { SearchResult, FetchedDocument } from '../types';
import { EngineConfig } from '../config';

export class TinyFishProvider implements SearchProvider {
  name = 'tinyfish';
  priority = EngineConfig.providers.tinyfish.priority;
  capabilities: ('SEARCH' | 'FETCH')[] = ['SEARCH', 'FETCH'];

  private apiKey: string;
  private baseUrl = 'https://api.search.tinyfish.ai';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TINYFISH_API_KEY || '';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.apiKey) return [];

    const params = new URLSearchParams({ query, location: options?.location || 'IN', language: 'en' });

    if (options?.includeDomains?.length) {
      params.set('include_domains', options.includeDomains.join(','));
    }
    if (options?.excludeDomains?.length) {
      params.set('exclude_domains', options.excludeDomains.join(','));
    }

    try {
      const res = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: { 'X-API-Key': this.apiKey },
        signal: AbortSignal.timeout(EngineConfig.fetchTimeoutMs),
      });

      if (!res.ok) {
        console.error(`TinyFish search error: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      const results: SearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const r of data.results) {
          results.push({
            url: r.url || r.link || '',
            title: r.title || '',
            snippet: r.snippet || r.description || r.content || '',
            provider: this.name,
          });
        }
      }

      return results.slice(0, options?.maxResults || 10);
    } catch (err: any) {
      console.error(`TinyFish search failed: ${err.message}`);
      return [];
    }
  }

  async fetch(url: string): Promise<FetchedDocument | null> {
    try {
      const res = await globalThis.fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(EngineConfig.fetchTimeoutMs),
        redirect: 'follow',
      });

      if (!res.ok) return null;

      const contentType = res.headers.get('content-type') || '';
      let docType: 'html' | 'pdf' | 'text' | 'unknown' = 'unknown';
      if (contentType.includes('html')) docType = 'html';
      else if (contentType.includes('pdf')) docType = 'pdf';
      else if (contentType.includes('text')) docType = 'text';

      const content = await res.text();

      return {
        url,
        content: content ?? '',
        contentType: docType,
        fetchedAt: Date.now(),
        provider: this.name,
      };
    } catch (err: any) {
      return {
        url,
        content: '',
        contentType: 'unknown',
        fetchedAt: Date.now(),
        provider: this.name,
        error: err.message,
      };
    }
  }
}
