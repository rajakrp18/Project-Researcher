const { InvestigationOrchestrator } = require('./apps/contact-finder/lib/engine/InvestigationOrchestrator');
const { ProviderRegistry } = require('./apps/contact-finder/lib/engine/providers/ProviderRegistry');
const { SerpAPIProvider } = require('./apps/contact-finder/lib/engine/providers/SerpAPIProvider');

(async () => {
  const provider = new SerpAPIProvider();
  const query = `"purshottam varshneya" DELHI (site:locatefamily.com OR site:timesofindia.indiatimes.com OR site:webindia123.com)`;
  
  console.log('Searching SerpAPI for:', query);
  const results = await provider.search(query, { maxResults: 10 });
  
  console.log(`Found ${results.length} results.`);
  results.forEach(r => {
    console.log('URL:', r.url);
    console.log('Snippet:', r.snippet);
  });
})();
