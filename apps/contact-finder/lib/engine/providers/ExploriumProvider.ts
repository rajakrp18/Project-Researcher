import { SearchProvider, SearchOptions } from './SearchProvider';
import { SearchResult, ProviderCapability } from '../types';

export class ExploriumProvider implements SearchProvider {
  name = 'explorium';
  priority = 100; // Absolute highest priority for companies
  capabilities: ProviderCapability[] = ['SEARCH'];

  isAvailable(): boolean {
    return !!process.env.EXPLORIUM_API_KEY;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    // The query here is typically a company name. 
    // We clean it up slightly to extract just the business name.
    const companyName = query.split('AND')[0].replace(/"/g, '').trim();

    try {
      const response = await fetch('https://api.explorium.ai/v2/businesses/match', {
        method: 'POST',
        headers: {
          'api_key': process.env.EXPLORIUM_API_KEY as string,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businesses_to_match: [
            { name: companyName }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Explorium API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // If we got matches, we pack the raw JSON payload into a "Search Result" snippet
      // The Gemini extraction LLM will effortlessly parse this structured JSON.
      if (data && data.length > 0 && data[0].matches && data[0].matches.length > 0) {
        return [{
          url: 'https://explorium.ai/b2b-enrichment',
          title: `Explorium B2B Data for ${companyName}`,
          snippet: `[EXPLORIUM B2B DATA FOR ${companyName}]: ${JSON.stringify(data[0].matches)}`,
          provider: this.name,
        }];
      }

      return [];

    } catch (error) {
      console.error(`[ExploriumProvider] Search failed:`, error);
      return [];
    }
  }
}
