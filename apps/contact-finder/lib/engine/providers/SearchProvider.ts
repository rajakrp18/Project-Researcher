import { SearchResult, FetchedDocument, ProviderCapability } from '../types';

export interface SearchOptions {
  includeDomains?: string[];
  excludeDomains?: string[];
  location?: string;
  maxResults?: number;
}

export interface SearchProvider {
  name: string;
  priority: number;
  capabilities: ProviderCapability[];
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  fetch?(url: string): Promise<FetchedDocument | null>;
  isAvailable(): boolean;
}
