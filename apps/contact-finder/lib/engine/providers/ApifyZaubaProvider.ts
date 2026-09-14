import { SearchProvider, SearchOptions } from './SearchProvider';
import { SearchResult, ProviderCapability } from '../types';

export class ApifyZaubaProvider implements SearchProvider {
  name = 'apify-zauba';
  priority = 90; // Very high priority for corporate searches
  capabilities: ProviderCapability[] = ['SEARCH'];

  isAvailable(): boolean {
    return !!process.env.APIFY_API_TOKEN;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    // Extract the company name from the query
    const companyName = query.split('AND')[0].replace(/"/g, '').trim();

    try {
      // In a real scenario, this hits the specific Apify Actor endpoint for Zauba Scraper
      // using the provided API Token. (e.g. parseforge/zauba-scraper)
      // For now, we simulate the structure of calling the Apify Actor synchronously.
      
      const response = await fetch(`https://api.apify.com/v2/acts/parseforge~zauba-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: companyName,
          maxItems: 5
        })
      });

      if (!response.ok) {
        throw new Error(`Apify API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Pack the scraped JSON payload into a "Search Result" snippet for Gemini to extract
      if (Array.isArray(data) && data.length > 0) {
        return [{
          url: 'https://apify.com/zauba-data',
          title: `Zauba Corp Registry Data for ${companyName}`,
          snippet: `[ZAUBA CORP REGISTRY DATA FOR ${companyName}]: ${JSON.stringify(data)}`,
          provider: this.name,
        }];
      }

      return [];

    } catch (error) {
      console.error(`[ApifyZaubaProvider] Search failed:`, error);
      return [];
    }
  }
}
