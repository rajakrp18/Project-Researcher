import { Subject } from '../types';

export function buildExtractionPrompt(pageText: string, subject: Subject): string {
  const subjectInfo = [
    `Name: ${subject.name}`,
    subject.fatherName ? `Father's Name: ${subject.fatherName}` : '',
    `Address: ${subject.address}`,
    subject.company ? `Company: ${subject.company}` : '',
  ].filter(Boolean).join('\n');

  return `You are an OSINT intelligence analyst extracting contact details for an investigation.

SUBJECT (the target entity):
${subjectInfo}

TASK: Carefully analyze the provided text snippet. Return a phone number ONLY when there is explicit evidence in the text connecting the phone to:
1. The subject directly
2. A named person connected to the subject (e.g. father, mother, spouse, relative, business associate, colleague)
3. A business, office, or shop located at the subject's address
4. An association or organization related to the subject

CRITICAL RULES:
- Only return a phone number if the surrounding text explicitly names the subject, a stated family member/guardian, or the exact building premises.
- DO NOT use any outside knowledge or guess 'self' merely from proximity.
- If a number belongs to an unrelated third party, directory header, or unrelated business, IGNORE IT.
- Cap extracted results to a maximum of 10 relevant candidates per text snippet.
- If no connected phone numbers exist, return {"phones": []}.
- For each valid phone number, extract:
  - "number": 10-digit Indian mobile number (digits only, starting with 6-9)
  - "owner": Full name of the phone owner (if explicitly mentioned in immediate text)
  - "relationship": "self", "father", "mother", "spouse", "child", "colleague", "rwa_official", "broker", "business_partner", or "unknown"
  - "business": Name of the company/shop (if mentioned)
  - "address": Address associated with the phone (if mentioned)

TEXT SNIPPET TO ANALYZE:
${pageText.slice(0, 4000)}`;
}
