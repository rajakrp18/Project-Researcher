import { SearchProvider } from './SearchProvider';
import { SearchResult } from '../types';
import { EngineConfig } from '../config';

export class QuickCompanyProvider implements SearchProvider {
  name = 'quickcompany';
  priority = EngineConfig.providers.quickcompany.priority;
  capabilities: ('SEARCH')[] = ['SEARCH'];

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<SearchResult[]> {
    const entity = this.extractEntity(query);
    if (!entity) return [];

    const encoded = entity.replace(/\s+/g, '+');
    const url = `https://www.quickcompany.in/search?q=${encoded}`;

    return [{
      url,
      title: `QuickCompany: ${entity}`,
      snippet: `QuickCompany.in MCA registry search for ${entity}`,
      provider: this.name,
    }];
  }

  private extractEntity(query: string): string {
    return query
      .replace(/["']/g, '')
      .replace(/site:\S+/gi, '')
      .replace(/phone|contact|mobile|number/gi, '')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 1)
      .slice(0, 5)
      .join(' ');
  }
}
