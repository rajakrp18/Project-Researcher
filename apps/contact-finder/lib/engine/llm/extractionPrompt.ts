import { Subject } from '../types';

export function buildExtractionPrompt(pageText: string, subject: Subject): string {
  const subjectInfo = [
    `Name: ${subject.name}`,
    subject.fatherName ? `Father's Name: ${subject.fatherName}` : '',
    `Address: ${subject.address}`,
    subject.company ? `Company: ${subject.company}` : '',
  ].filter(Boolean).join('\n');

  return `You are an expert at extracting contact information from Indian web pages.

SUBJECT (the person we are investigating):
${subjectInfo}

TASK: From the text below, extract ALL Indian mobile phone numbers (10-digit numbers starting with 6, 7, 8, or 9). For each phone number found, identify:
1. The exact phone number (digits only, 10 digits)
2. The name of the person this phone belongs to (if mentioned near the phone)
3. The relationship to the subject: "self", "father", "mother", "spouse", "child", "sibling", "relative", "business_partner", "neighbor", "colleague", "unknown"
4. Any business or organization name associated with this phone
5. The address associated with this phone (if mentioned)

Rules:
- Only extract valid Indian mobile numbers (10 digits, starting with 6-9)
- If a phone appears near the subject's name, relationship is "self"
- If a phone appears near the subject's father's name, relationship is "father"
- Look for patterns like "Mr X", "Mrs Y", "Contact: ", "Phone: ", "Mobile: "
- Include ALL phones found, even if uncertain about the owner

Respond ONLY in valid JSON:
{
  "phones": [
    {
      "number": "9876543210",
      "owner": "Person Name or null",
      "relationship": "self|father|spouse|child|relative|business_partner|neighbor|colleague|unknown",
      "business": "Business name or null",
      "address": "Address or null"
    }
  ]
}

If no phones found, respond: { "phones": [] }

TEXT TO ANALYZE:
${pageText.slice(0, 15000)}`;
}
