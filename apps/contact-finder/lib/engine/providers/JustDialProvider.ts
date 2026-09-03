import { SearchProvider } from './SearchProvider';
import { SearchResult } from '../types';
import { EngineConfig } from '../config';
import { detectCity } from '../address/cityTable';

export class JustDialProvider implements SearchProvider {
  name = 'justdial';
  priority = EngineConfig.providers.justdial.priority;
  capabilities: ('SEARCH')[] = ['SEARCH'];

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<SearchResult[]> {
    const { entity, city } = this.parseQuery(query);
    if (!entity) return [];

    const citySlug = city || 'Delhi';
    const nameSlug = entity.replace(/\s+/g, '-');
    const url = `https://www.justdial.com/${citySlug}/${nameSlug}`;

    return [{
      url,
      title: `JustDial: ${entity} in ${citySlug}`,
      snippet: `Directory listing for ${entity} in ${citySlug}`,
      provider: this.name,
    }];
  }

  private parseQuery(query: string): { entity: string; city?: string } {
    const cleaned = query.replace(/["']/g, '');
    const city = detectCity(cleaned);
    const entity = cleaned
      .replace(/site:\S+/gi, '')
      .replace(/phone|contact|mobile|number/gi, '')
      .trim()
      .split(/\s+/)
      .filter(w => {
        const upper = w.toUpperCase();
        return upper !== city?.toUpperCase() && w.length > 1;
      })
      .slice(0, 4)
      .join(' ');

    return { entity, city };
  }
}
