import { Subject, LLMExtraction, LLMExtractor } from '../types';
import { EngineConfig } from '../config';
import { buildExtractionPrompt } from './extractionPrompt';

export class OpenRouterService implements LLMExtractor {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = 'meta-llama/llama-3.1-8b-instruct:free'; // Default to free Llama 3.1
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async extractContacts(pageText: string, subject: Subject): Promise<LLMExtraction> {
    const prompt = buildExtractionPrompt(pageText, subject);

    for (let attempt = 0; attempt <= EngineConfig.rateLimit.geminiRetries; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://contact-finder.local', 
            'X-Title': 'Contact Finder OSINT Engine',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
             throw new Error('429 Rate Limit');
          }
          throw new Error(`OpenRouter API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        let cleanJson = text.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

        const parsed = JSON.parse(cleanJson);
        return this.validateExtraction(parsed);
      } catch (err: any) {
        if (err.message?.includes('429')) {
          if (attempt === EngineConfig.rateLimit.geminiRetries) {
            console.warn(`OpenRouter rate limited on final attempt. Skipping.`);
            return { phones: [] };
          }
          const delay = Math.min(
            EngineConfig.rateLimit.geminiBaseDelayMs * Math.pow(2, attempt),
            EngineConfig.rateLimit.geminiMaxDelayMs
          );
          console.warn(`OpenRouter rate limited, retrying in ${delay}ms (attempt ${attempt + 1})`);
          await this.sleep(delay);
          continue;
        }

        if (attempt === EngineConfig.rateLimit.geminiRetries) {
          console.error(`OpenRouter extraction failed after ${attempt + 1} attempts: ${err.message}`);
          return { phones: [] };
        }
      }
    }

    return { phones: [] };
  }

  private validateExtraction(raw: any): LLMExtraction {
    if (!raw || !raw.phones || !Array.isArray(raw.phones)) {
      return { phones: [] };
    }

    return {
      phones: raw.phones
        .filter((p: any) => p.number && typeof p.number === 'string')
        .map((p: any) => ({
          number: p.number.replace(/[\s\-\+]/g, '').replace(/^91/, '').replace(/^0/, ''),
          owner: p.owner || undefined,
          relationship: p.relationship || 'unknown',
          business: p.business || undefined,
          address: p.address || undefined,
        })),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
