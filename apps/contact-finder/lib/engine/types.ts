export interface Subject {
  name: string;
  fatherName?: string;
  address: string;
  city?: string;
  company?: string;
  notes?: string;
}

export interface ParsedAddress {
  raw: string;
  houseNumber?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  careOf?: string;
  pinCode?: string;
}

export type AttributionType =
  | 'DIRECT_PERSON'
  | 'PROXY_PERSON'
  | 'RWA'
  | 'BROKER'
  | 'ORGANIZATION'
  | 'GENERIC'
  | 'AMBIGUOUS'
  | 'UNKNOWN';

export type NameMatchType =
  | 'EXACT'
  | 'VARIANT'
  | 'SURNAME_ONLY'
  | 'PARTIAL'
  | 'NONE';

export type ProviderCapability = 'SEARCH' | 'FETCH' | 'BOTH';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  provider: string;
}

export interface FetchedDocument {
  url: string;
  content: string;
  contentType: 'html' | 'pdf' | 'text' | 'unknown';
  fetchedAt: number;
  provider: string;
  error?: string;
}

export interface ExtractedPhone {
  phone: string;
  raw: string;
  context: string;
  sourceUrl: string;
}

export interface ExtractedName {
  name: string;
  context: string;
  nearPhone?: string;
}

export interface Entity {
  name: string;
  matchType: NameMatchType;
  phones: string[];
  address?: string;
  business?: string;
  relationship?: string;
  sources: string[];
}

export interface PhoneCandidate {
  phone: string;
  owner?: string;
  attribution: AttributionType;
  confidence: number;
  matchType: NameMatchType;
  evidence: Evidence[];
  business?: string;
  relationship: string;
}

export interface LLMExtractor {
  extractContacts(pageText: string, subject: Subject): Promise<LLMExtraction>;
}

export interface Evidence {
  sourceUrl: string;
  provider: string;
  snippet: string;
  phone: string;
  ownerName?: string;
  extractionMethod: 'regex' | 'llm' | 'both';
  fetchedAt: number;
}

export interface InvestigationResult {
  subject: Subject;
  parsedAddress: ParsedAddress;
  phones: PhoneCandidate[];
  queriesUsed: number;
  queryBudget: number;
  documentsFetched: number;
  totalEvidenceItems: number;
  providersUsed: string[];
  durationMs: number;
  stopReason: 'HIGH_CONFIDENCE' | 'BUDGET_EXHAUSTED' | 'NO_MORE_QUERIES' | 'ERROR';
  timestamp: number;
}

export interface BatchResult {
  results: InvestigationResult[];
  summary: {
    totalCases: number;
    phonesFound: number;
    avgConfidence: number;
    avgDurationMs: number;
    avgQueriesUsed: number;
  };
}

export interface LLMExtraction {
  phones: {
    number: string;
    owner?: string;
    relationship?: string;
    business?: string;
    address?: string;
  }[];
}
