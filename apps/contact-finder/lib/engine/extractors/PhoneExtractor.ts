import { ExtractedPhone, Subject } from '../types';
import { EngineConfig } from '../config';

const DUMMY_PHONE_BLACKLIST = new Set([
  '6350001000', // TradeIndia generic query/placeholder number
  '9696969696', '9999999999', '8888888888', '7777777777', '6666666666',
  '1234567890', '0123456789', '6789101112', '6789101314', '6171819202',
  '9000000000', '8000000000', '7000000000', '6000000000',
  '9876543210', '9111234567', '9111234600', '9111234649',
  '8881390304', // Generic Mumbai fax/directory placeholder
  '7200156861', '7200156856' // Generic Maharashtra corporate landline sequence
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

export function isDummyOrSpamPhone(phone: string, sourceUrl?: string, subject?: Subject, context?: string): boolean {
  if (!phone || phone.length !== 10) return true;

  // 1. Blacklist check
  if (DUMMY_PHONE_BLACKLIST.has(phone)) return true;

  // 2. Check 5 or more identical consecutive digits (e.g. 9888888881 or 6000085601)
  if (/(\d)\1{4,}/.test(phone)) return true;

  // 3. Sequential digit sequences (e.g. 678910, 123456)
  if (phone.includes('678910') || phone.includes('123456') || phone.includes('987654')) return true;

  // 4. Check for fake synthetic zero padding inside folio numbers (e.g. 6000085601, 6060003333, 9200100001, 9500600000)
  // Rejects numbers with 4+ consecutive zeros or 3+ zeros in middle/end
  if (/0000/.test(phone)) return true;
  if (/^\d{2}000\d+/.test(phone)) return true;

  // 5. Check if phone is a substring of Subject Folio / DP ID / Client ID / Notes
  if (subject) {
    const rawTargetStrings = [
      subject.notes,
      subject.address,
      subject.name,
      subject.company,
    ].filter(Boolean) as string[];

    for (const rawStr of rawTargetStrings) {
      const cleanDigits = rawStr.replace(/\D/g, '');
      if (cleanDigits.length >= 7) {
        // Reject if the phone shares any sequence of 7 consecutive digits with the folio/address
        let hasOverlap = false;
        for (let i = 0; i <= phone.length - 7; i++) {
          if (cleanDigits.includes(phone.slice(i, i + 7))) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) return true;
      }
    }

    // Check Pincode Concatenation Artifact (e.g., Pincode 492001 + 00001 -> 9200100001)
    if (subject.address) {
      const pinMatch = subject.address.match(/\b[1-9]\d{5}\b/);
      if (pinMatch) {
        const pincode = pinMatch[0];
        const pinSuffix = pincode.slice(1); // 5 digits of pincode
        if (phone.startsWith(pinSuffix)) return true;
      }
    }
  }

  // 6. Check Context for Document Header / Table Column Keywords
  if (context) {
    const lowerCtx = context.toLowerCase();

    // Check Pincodes in context
    const pinMatches = context.match(/\b[1-9]\d{5}\b/g);
    if (pinMatches) {
      for (const pin of pinMatches) {
        const suffix = pin.slice(1);
        if (phone.startsWith(suffix)) return true;
      }
    }

    // Check Folio / Column keywords right next to the phone number
    const folioKeywords = [
      'folio', 'folio no', 'folio number', 'dp id', 'dpid', 'client id', 'clientid',
      'account no', 'account number', 'certificate', 'cert no', 's.no', 'sl.no', 'sr.no',
      'holding', 'shares', 'warrant', 'dividend', 'unclaimed amount', 'serial no'
    ];

    const phoneIndex = lowerCtx.indexOf(phone);
    if (phoneIndex !== -1) {
      const nearbyWindow = lowerCtx.slice(Math.max(0, phoneIndex - 80), Math.min(lowerCtx.length, phoneIndex + 80));
      for (const kw of folioKeywords) {
        if (nearbyWindow.includes(kw)) {
          if (/00|000|\d{10}00/.test(phone) || phone.endsWith('0000')) {
            return true;
          }
        }
      }
    }
  }

  // 7. Spam domain check
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

export function normalizePhone(raw: string, subject?: Subject): string | null {
  let digits = raw.replace(/[\s\-\+\(\)\.]/g, '');

  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (EngineConfig.phone.indianMobileRegex.test(digits) && !isDummyOrSpamPhone(digits, undefined, subject)) {
    return digits;
  }

  return null;
}

export function extractPhones(text: string, sourceUrl: string, subject?: Subject): ExtractedPhone[] {
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
      
      const phone = baseDigits ? baseDigits.replace(/[\s\-\+\(\)\.]/g, '') : normalizePhone(rawMatch, subject);

      const processPhone = (p: string, raw: string) => {
        const start = Math.max(0, currentMatch.index - contextRadius);
        const end = Math.min(text.length, currentMatch.index + raw.length + contextRadius);
        const context = text.slice(start, end).replace(/\n/g, ' ').trim();

        if (p && isValidIndianMobile(p, subject, context, sourceUrl) && !seen.has(p)) {
          seen.add(p);
          results.push({ phone: p, raw, context, sourceUrl });
        }
      };

      if (phone) {
        processPhone(phone, rawMatch);

        // Newspaper Classified Shorthand Expansion
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

export function isValidIndianMobile(phone: string, subject?: Subject, context?: string, sourceUrl?: string): boolean {
  return EngineConfig.phone.indianMobileRegex.test(phone) && !isDummyOrSpamPhone(phone, sourceUrl, subject, context);
}
