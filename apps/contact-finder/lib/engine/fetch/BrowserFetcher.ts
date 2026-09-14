import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';
import { FetchedDocument } from '../types';

puppeteer.use(StealthPlugin());
import { EngineConfig } from '../config';
import { parseHtml } from './HtmlParser';

export class BrowserFetcher {
  
  async fetchPage(url: string, browser: Browser, provider = 'direct'): Promise<FetchedDocument | null> {
    let page;
    try {
      page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (type === 'stylesheet' || type === 'font' || type === 'media' || type === 'image') {
          req.abort();
        } else {
          req.continue();
        }
      });

      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: EngineConfig.fetchTimeoutMs || 8000 });
      
      if (!response || !response.ok()) {
        await page.close();
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // fast wait for DOM ready

      const rawHtml = await page.content();
      let content = parseHtml(rawHtml);

      if (content.length > EngineConfig.maxDocumentLength) {
        content = content.slice(0, EngineConfig.maxDocumentLength);
      }

      await page.close();

      return {
        url,
        content,
        contentType: 'html',
        fetchedAt: Date.now(),
        provider,
      };
    } catch (err: any) {
      console.error(`[BrowserFetcher] Error fetching ${url}:`, err.message);
      if (page) await page.close().catch(() => {});
      return null;
    }
  }

  async fetchBatch(urls: string[], provider = 'direct'): Promise<FetchedDocument[]> {
    if (!urls || urls.length === 0) return [];

    let browser: Browser | undefined;
    const results: FetchedDocument[] = [];
    
    try {
      // Launch ONE browser for the entire batch
      browser = await puppeteer.launch({
        headless: true,
        protocolTimeout: 60000,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      // Process in smaller batches of 3 tabs at a time to prevent RAM crashing
      const BATCH_SIZE = 3;
      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batchUrls = urls.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batchUrls.map(url => this.fetchPage(url, browser!, provider))
        );

        for (const doc of batchResults) {
          if (doc && doc.content) {
            results.push(doc);
          }
        }
      }

      await browser.close();
    } catch (err) {
      console.error('[BrowserFetcher] Error launching browser or fetching batch:', err);
      if (browser) await browser.close().catch(() => {});
    }

    return results;
  }
}
