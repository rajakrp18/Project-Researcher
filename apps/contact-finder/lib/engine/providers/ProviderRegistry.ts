import { SearchProvider, SearchOptions } from './SearchProvider';
import { SearchResult } from '../types';
import { TinyFishProvider } from './TinyFishProvider';
import { SerpAPIProvider } from './SerpAPIProvider';
import { JustDialProvider } from './JustDialProvider';
import { IndiaMartProvider } from './IndiaMartProvider';
import { TradeIndiaProvider } from './TradeIndiaProvider';
import { CompanyCheckProvider } from './CompanyCheckProvider';
import { QuickCompanyProvider } from './QuickCompanyProvider';
import { PerplexityProvider } from './PerplexityProvider';
import { ExploriumProvider } from './ExploriumProvider';
import { ApifyZaubaProvider } from './ApifyZaubaProvider';

export class ProviderRegistry {
  private providers: SearchProvider[] = [];

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    const candidates: SearchProvider[] = [
      new TinyFishProvider(),
      new ExploriumProvider(),
      new ApifyZaubaProvider(),
      new PerplexityProvider(),
      new SerpAPIProvider(),
      new JustDialProvider(),
      new IndiaMartProvider(),
      new TradeIndiaProvider(),
      new CompanyCheckProvider(),
      new QuickCompanyProvider(),
    ];

    for (const p of candidates) {
      if (p.isAvailable()) {
        this.providers.push(p);
      }
    }

    this.providers.sort((a, b) => a.priority - b.priority);
  }

  register(provider: SearchProvider) {
    if (provider.isAvailable()) {
      this.providers.push(provider);
      this.providers.sort((a, b) => a.priority - b.priority);
    }
  }

  getAll(): SearchProvider[] {
    return [...this.providers];
  }

  getByName(name: string): SearchProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  getSearchProviders(): SearchProvider[] {
    return this.providers.filter(p =>
      p.capabilities.includes('SEARCH') || p.capabilities.includes('BOTH')
    );
  }

  getFetchProviders(): SearchProvider[] {
    return this.providers.filter(p =>
      (p.capabilities.includes('FETCH') || p.capabilities.includes('BOTH')) && p.fetch
    );
  }

  async searchAll(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const searchProviders = this.getSearchProviders();
    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    const searchPromises = searchProviders.map(async (provider) => {
      try {
        const results = await provider.search(query, options);
        return results;
      } catch (err: any) {
        console.error(`Provider ${provider.name} failed: ${err.message}`);
        return [];
      }
    });

    const resultsPerProvider = await Promise.all(searchPromises);

    for (const results of resultsPerProvider) {
      for (const result of results) {
        const normalizedUrl = this.normalizeUrl(result.url);
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          allResults.push(result);
        }
      }
    }

    return allResults;
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hash = '';
      u.searchParams.delete('utm_source');
      u.searchParams.delete('utm_medium');
      u.searchParams.delete('utm_campaign');
      return u.toString().replace(/\/+$/, '');
    } catch {
      return url.replace(/\/+$/, '');
    }
  }
}
