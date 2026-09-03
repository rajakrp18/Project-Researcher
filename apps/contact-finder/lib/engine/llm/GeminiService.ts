import { GoogleGenAI } from '@google/genai';
import { Subject, LLMExtraction } from '../types';
import { EngineConfig } from '../config';
import { buildExtractionPrompt } from './extractionPrompt';

export class GeminiService implements LLMExtractor {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
  }

  async extractContacts(pageText: string, subject: Subject): Promise<LLMExtraction> {
    const prompt = buildExtractionPrompt(pageText, subject);

    for (let attempt = 0; attempt <= EngineConfig.rateLimit.geminiRetries; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        let cleanJson = text.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

        const parsed = JSON.parse(cleanJson);
        return this.validateExtraction(parsed);
      } catch (err: any) {
        if (err.status === 429 || err.message?.includes('429')) {
          if (attempt === EngineConfig.rateLimit.geminiRetries) {
            console.warn(`Gemini rate limited on final attempt. Skipping.`);
            return { phones: [] };
          }
          const delay = Math.min(
            EngineConfig.rateLimit.geminiBaseDelayMs * Math.pow(2, attempt),
            EngineConfig.rateLimit.geminiMaxDelayMs
          );
          console.warn(`Gemini rate limited, retrying in ${delay}ms (attempt ${attempt + 1})`);
          await this.sleep(delay);
          continue;
        }

        if (attempt === EngineConfig.rateLimit.geminiRetries) {
          console.error(`Gemini extraction failed after ${attempt + 1} attempts: ${err.message}`);
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
