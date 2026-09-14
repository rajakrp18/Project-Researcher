import { ExtractedPhone } from '../types';
import { EngineConfig } from '../config';

const DUMMY_PHONE_BLACKLIST = new Set([
  '6350001000', // TradeIndia generic query/placeholder number
  '9696969696', '9999999999', '8888888888', '7777777777', '6666666666',
  '1234567890', '0123456789', '6789101112', '6789101314', '6171819202',
  '9000000000', '8000000000', '7000000000', '6000000000',
  '9876543210', '9111234567', '9111234600', '9111234649'
]);

const SPAM_DOMAIN_BLACKLIST = [
  'merriam-webster.com',
  'iqair.com',
  'wikipedia.org',
  'wiktionary.org',
  'github.com',
  'npmjs.com',
  'stackoverflow.com'
];

export function isDummyOrSpamPhone(phone: string, sourceUrl?: string): boolean {
  if (!phone || phone.length !== 10) return true;

  // 1. Blacklist check
  if (DUMMY_PHONE_BLACKLIST.has(phone)) return true;

  // 2. Check 6 or more identical consecutive digits (e.g. 9888888881)
  if (/(\d)\1{5,}/.test(phone)) return true;

  // 3. Sequential digit sequences (e.g. 678910, 123456)
  if (phone.includes('678910') || phone.includes('123456') || phone.includes('987654')) return true;

  // 4. Spam domain check
  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.toLowerCase();
      if (SPAM_DOMAIN_BLACKLIST.some(domain => hostname.includes(domain))) {
        return true;
      }
    } catch {}
  }

  return false;
}

export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s\-\+\(\)\.]/g, '');

  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (EngineConfig.phone.indianMobileRegex.test(digits) && !isDummyOrSpamPhone(digits)) {
    return digits;
  }

  return null;
}

export function extractPhones(text: string, sourceUrl: string): ExtractedPhone[] {
  if (!text) return [];

  // Filter out spam domains early
  if (isDummyOrSpamPhone('9999999999', sourceUrl)) {
    try {
      const hostname = new URL(sourceUrl).hostname.toLowerCase();
      if (SPAM_DOMAIN_BLACKLIST.some(domain => hostname.includes(domain))) {
        return [];
      }
    } catch {}
  }

  const results: ExtractedPhone[] = [];
  const seen = new Set<string>();
  const contextRadius = EngineConfig.contextWindowChars;

  const patterns = EngineConfig.phone.extractionPatterns;

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (!match) break;
      const currentMatch = match;
      const rawMatch = currentMatch[0];
      const baseDigits = currentMatch[1];
      const suffix = currentMatch[2];
      
      const phone = baseDigits ? baseDigits.replace(/[\s\-\+\(\)\.]/g, '') : normalizePhone(rawMatch);

      const processPhone = (p: string, raw: string) => {
        if (p && isValidIndianMobile(p) && !isDummyOrSpamPhone(p, sourceUrl) && !seen.has(p)) {
          seen.add(p);
          const start = Math.max(0, currentMatch.index - contextRadius);
          const end = Math.min(text.length, currentMatch.index + raw.length + contextRadius);
          const context = text.slice(start, end).replace(/\n/g, ' ').trim();
          results.push({ phone: p, raw, context, sourceUrl });
        }
      };

      if (phone) {
        processPhone(phone, rawMatch);

        // Newspaper Classified Shorthand Expansion (e.g., 9582888440444 -> 9582888440 & 9582888444)
        if (suffix && suffix.length >= 2 && suffix.length <= 4) {
          const prefix = phone.slice(0, 10 - suffix.length);
          const expandedPhone = prefix + suffix;
          if (expandedPhone !== phone) {
            processPhone(expandedPhone, rawMatch);
          }
        }
      }
    }
  }

  return results;
}

export function isValidIndianMobile(phone: string): boolean {
  return EngineConfig.phone.indianMobileRegex.test(phone) && !isDummyOrSpamPhone(phone);
}
