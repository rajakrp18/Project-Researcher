import { SearchProvider, SearchOptions } from './SearchProvider';
import { SearchResult, ProviderCapability } from '../types';

export class PerplexityProvider implements SearchProvider {
  name = 'perplexity';
  priority = 15; // Extremely high priority, immediately after TinyFish (10)
  capabilities: ProviderCapability[] = ['SEARCH'];

  isAvailable(): boolean {
    return !!process.env.PERPLEXITY_API_KEY;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    const systemPrompt = `You are an OSINT extraction AI. Your goal is to find public phone numbers for the provided subject/query. 
Use web search to check directories, public records, business registries, and news articles.
Provide the phone numbers and the context around them. Keep the response factual and concise.`;

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          tools: ['web_search'],
          temperature: 0.1,
          max_tokens: 1500,
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const answerText = data.choices?.[0]?.message?.content || '';
      const citations = data.search_results || data.citations || []; // Depending on API response schema

      const results: SearchResult[] = [];

      // Add the synthesized answer itself as the first result
      if (answerText.trim()) {
        results.push({
          url: 'https://perplexity.ai/synthesized-answer', // Placeholder URL for the orchestrator
          title: 'Perplexity Synthesized AI Answer',
          snippet: answerText,
          provider: this.name,
        });
      }

      // Add citations so Puppeteer can do deep scraping on the sources Perplexity found!
      for (const citation of citations) {
        const citationUrl = typeof citation === 'string' ? citation : citation.url;
        if (citationUrl) {
          results.push({
            url: citationUrl,
            title: typeof citation === 'object' && citation.title ? citation.title : 'Perplexity Source Citation',
            snippet: typeof citation === 'object' ? citation.snippet : '',
            provider: this.name,
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`[PerplexityProvider] Search failed:`, error);
      return [];
    }
  }
}
