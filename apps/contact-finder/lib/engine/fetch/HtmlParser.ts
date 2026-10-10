import * as cheerio from 'cheerio';

export function parseHtml(html: string): string {
  if (!html) return '';

  try {
    // Inject spaces between tags before loading to prevent text from adjacent tags gluing together
    const $ = cheerio.load(html.replace(/>/g, '> '));

    $('script, style, nav, footer, header, noscript, iframe, svg, link, meta').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    $('.cookie-banner, .cookie-notice, .gdpr, .popup, .modal, .overlay').remove();
    $('aside, .sidebar, .advertisement, .ad, .ads').remove();

    const text = $('body').text();

    return text
      .replace(/\t/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  } catch {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
