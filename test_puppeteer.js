const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  console.log('Browser launched!');

  const page = await browser.newPage();
  console.log('Page created!');

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('Navigating to Times of India...');
  try {
    await page.goto('https://timesofindia.indiatimes.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Navigated!');
  } catch (err) {
    console.error('Error navigating:', err.message);
  }

  await browser.close();
  console.log('Closed.');
})();
