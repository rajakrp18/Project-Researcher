import { FetchedDocument } from '../types';
import { EngineConfig } from '../config';
import { parseHtml } from './HtmlParser';

export class DocumentFetcher {
  async fetch(url: string, provider = 'direct'): Promise<FetchedDocument | null> {
    try {
      const res = await globalThis.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(EngineConfig.fetchTimeoutMs),
        redirect: 'follow',
      });

      if (!res.ok) {
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      let docType: 'html' | 'pdf' | 'text' | 'unknown' = 'unknown';

      if (contentType.includes('html')) docType = 'html';
      else if (contentType.includes('pdf')) docType = 'pdf';
      else if (contentType.includes('text')) docType = 'text';

      let content: string;

      if (docType === 'pdf') {
        const buffer = await res.arrayBuffer();
        try {
          const pdfParse = (await import('pdf-parse')).default;
          const result = await pdfParse(Buffer.from(buffer ?? new ArrayBuffer(0)));
          content = result.text || '';
        } catch {
          content = '';
        }
      } else {
        const rawText = await res.text();
        content = rawText ?? '';

        if (docType === 'html') {
          content = parseHtml(content);
        }
      }

      if (content.length > EngineConfig.maxDocumentLength) {
        content = content.slice(0, EngineConfig.maxDocumentLength);
      }

      return {
        url,
        content,
        contentType: docType,
        fetchedAt: Date.now(),
        provider,
      };
    } catch (err: any) {
      return null;
    }
  }

  async fetchBatch(urls: string[], provider = 'direct'): Promise<FetchedDocument[]> {
    const results: FetchedDocument[] = [];
    const batches: string[][] = [];

    for (let i = 0; i < urls.length; i += EngineConfig.fetchBatchSize) {
      batches.push(urls.slice(i, i + EngineConfig.fetchBatchSize));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(url => this.fetch(url, provider))
      );

      for (const doc of batchResults) {
        if (doc && doc.content) {
          results.push(doc);
        }
      }
    }

    return results;
  }
}
