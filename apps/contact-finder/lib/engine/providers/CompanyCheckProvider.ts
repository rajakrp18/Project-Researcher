import { SearchProvider } from './SearchProvider';
import { SearchResult } from '../types';
import { EngineConfig } from '../config';

export class CompanyCheckProvider implements SearchProvider {
  name = 'companycheck';
  priority = EngineConfig.providers.companycheck.priority;
  capabilities: ('SEARCH')[] = ['SEARCH'];

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<SearchResult[]> {
    const entity = this.extractEntity(query);
    if (!entity) return [];

    const slug = entity.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.thecompanycheck.com/search/${slug}`;

    return [{
      url,
      title: `CompanyCheck: ${entity}`,
      snippet: `TheCompanyCheck.com search for ${entity}`,
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
