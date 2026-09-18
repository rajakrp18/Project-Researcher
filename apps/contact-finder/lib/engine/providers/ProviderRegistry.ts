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
    
    // Classify providers: REAL_SEARCH (SerpAPI, Perplexity, TinyFish) vs SYNTHETIC_URL (JustDial, IndiaMart, etc.)
    const realSearchProviders = searchProviders.filter(p => 
      ['serpapi', 'perplexity', 'tinyfish', 'explorium', 'apify-zauba'].includes(p.name)
    );
    const syntheticUrlProviders = searchProviders.filter(p => 
      !['serpapi', 'perplexity', 'tinyfish', 'explorium', 'apify-zauba'].includes(p.name)
    );

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // 1. Run real search engine providers first
    const realPromises = realSearchProviders.map(async (provider) => {
      try {
        return await provider.search(query, options);
      } catch (err: any) {
        console.error(`Provider ${provider.name} failed: ${err.message}`);
        return [];
      }
    });

    const realResultsList = await Promise.all(realPromises);
    for (const results of realResultsList) {
      for (const result of results) {
        const normalizedUrl = this.normalizeUrl(result.url);
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          allResults.push(result);
        }
      }
    }

    // 2. If real search yielded results, skip synthetic URL generators to avoid scraping noise!
    if (allResults.length === 0) {
      const syntheticPromises = syntheticUrlProviders.map(async (provider) => {
        try {
          return await provider.search(query, options);
        } catch {
          return [];
        }
      });
      const syntheticResultsList = await Promise.all(syntheticPromises);
      for (const results of syntheticResultsList) {
        for (const result of results) {
          const normalizedUrl = this.normalizeUrl(result.url);
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allResults.push(result);
          }
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
