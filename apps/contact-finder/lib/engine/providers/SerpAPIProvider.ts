import { SearchProvider, SearchOptions } from './SearchProvider';
import { SearchResult } from '../types';
import { EngineConfig } from '../config';

export class SerpAPIProvider implements SearchProvider {
  name = 'serpapi';
  priority = EngineConfig.providers.serpapi.priority;
  capabilities: ('SEARCH')[] = ['SEARCH'];

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY || '';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.apiKey) return [];

    try {
      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        api_key: this.apiKey,
        gl: 'in',
        hl: 'en',
        num: String(options?.maxResults || 10),
      });

      const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        signal: AbortSignal.timeout(EngineConfig.fetchTimeoutMs),
      });

      if (!res.ok) {
        console.error(`SerpAPI error: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      const results: SearchResult[] = [];

      if (data.organic_results && Array.isArray(data.organic_results)) {
        for (const r of data.organic_results) {
          results.push({
            url: r.link || '',
            title: r.title || '',
            snippet: r.snippet || '',
            provider: this.name,
          });
        }
      }

      return results.slice(0, options?.maxResults || 10);
    } catch (err: any) {
      console.error(`SerpAPI search failed: ${err.message}`);
      return [];
    }
  }
}
