import { SearchProvider } from './SearchProvider';
import { SearchResult } from '../types';
import { EngineConfig } from '../config';

export class IndiaMartProvider implements SearchProvider {
  name = 'indiamart';
  priority = EngineConfig.providers.indiamart.priority;
  capabilities: ('SEARCH')[] = ['SEARCH'];

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<SearchResult[]> {
    const entity = this.extractEntity(query);
    if (!entity) return [];

    const encoded = entity.replace(/\s+/g, '+');
    const url = `https://dir.indiamart.com/search.mp?ss=${encoded}`;

    return [{
      url,
      title: `IndiaMart: ${entity}`,
      snippet: `IndiaMart directory search for ${entity}`,
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
