const https = require('https');

const query = '"purshottam varshneya" DELHI (site:locatefamily.com OR site:timesofindia.indiatimes.com OR site:webindia123.com)';
const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=319334558ca4c84ebbc9b8e9ffd20b82d24db831959868f24ef077206966db26`;

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const results = data.organic_results || [];
    console.log(`Found ${results.length} results.`);
    results.forEach(r => {
      console.log('Snippet:', r.snippet);
    });
  });
}).on('error', (e) => {
  console.error(e);
});
