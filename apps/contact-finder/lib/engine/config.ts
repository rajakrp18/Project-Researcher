export const EngineConfig = {
  queryBudget: 12, // Doubled to allow for fallback queries
  maxRetriesPerCase: 2,
  fetchTimeoutMs: 15000, // Increased from 8s to 15s to allow slower sites to load
  fetchBatchSize: 5,
  maxDocumentLength: 30000,
  contextWindowChars: 500,

  confidence: {
    highThreshold: 65, // Lowered from 75 to let more high-quality partial matches pass
    mediumThreshold: 45,
    minReportable: 20, // Lowered from 25 to catch more edge-case contacts
  },

  scoring: {
    nameMatch: {
      EXACT: 30,
      VARIANT: 20,
      SURNAME_ONLY: 10,
      PARTIAL: 5,
      NONE: 0,
    },
    addressMatch: {
      sameHouseNumber: 40, // Boosted heavily: exact house match is extremely strong evidence
      sameArea: 20,
      sameCity: 5,
    },
    attribution: {
      DIRECT_PERSON: 20,
      PROXY_PERSON: 10,
      RWA: 5,
      BROKER: 5,
      ORGANIZATION: 3,
      GENERIC: 0,
      AMBIGUOUS: -5,
      UNKNOWN: -10,
    },
    sourceReliability: {
      government: 10,
      established: 5,
      directory: 5,
      unknown: 0,
    },
    multiSourceBonus: 15,
  },

  phone: {
    indianMobileRegex: /^[6-9]\d{9}$/,
    extractionPatterns: [
      /(?:\+91[\s-]?)?(?:0)?([6-9]\d{9})(\d{2,4})?/g,
      /([6-9]\d{4}[\s-]?\d{5})(\d{2,4})?/g,
      /([6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})(\d{2,4})?/g,
      /91([6-9]\d{9})(\d{2,4})?/g,
    ],
  },

  rateLimit: {
    geminiRetries: 3,
    geminiBaseDelayMs: 4000, // Increased to prevent 429 rate limit errors
    geminiMaxDelayMs: 10000, 
    searchDelayMs: 300,
  },

  providers: {
    tinyfish: { priority: 10 },
    perplexity: { priority: 15 },
    serpapi: { priority: 20 },
    justdial: { priority: 40 },
    indiamart: { priority: 50 },
    tradeindia: { priority: 60 },
    companycheck: { priority: 70 },
    quickcompany: { priority: 80 },
  },

  governmentDomains: [
    'gov.in', 'nic.in', 'mca.gov.in', 'iepf.gov.in',
  ],

  establishedDomains: [
    'timesofindia.com', 'justdial.com', 'indiamart.com',
    'tradeindia.com', 'thecompanycheck.com', 'quickcompany.in',
    'locatemyfamily.com', 'scribd.com', 'ddca.in',
  ],
} as const;
