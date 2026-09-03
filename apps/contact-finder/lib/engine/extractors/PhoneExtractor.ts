import { ExtractedPhone } from '../types';
import { EngineConfig } from '../config';

export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s\-\+\(\)\.]/g, '');

  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (EngineConfig.phone.indianMobileRegex.test(digits)) {
    return digits;
  }

  return null;
}

export function extractPhones(text: string, sourceUrl: string): ExtractedPhone[] {
  if (!text) return [];

  const results: ExtractedPhone[] = [];
  const seen = new Set<string>();
  const contextRadius = EngineConfig.contextWindowChars;

  const patterns = EngineConfig.phone.extractionPatterns;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawMatch = match[0];
      const baseDigits = match[1];
      const suffix = match[2];
      
      const phone = baseDigits ? baseDigits.replace(/[\s\-\+\(\)\.]/g, '') : normalizePhone(rawMatch);

      const processPhone = (p: string, raw: string) => {
        if (p && isValidIndianMobile(p) && !seen.has(p)) {
          seen.add(p);
          const start = Math.max(0, match.index - contextRadius);
          const end = Math.min(text.length, match.index + raw.length + contextRadius);
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
  return EngineConfig.phone.indianMobileRegex.test(phone);
}
