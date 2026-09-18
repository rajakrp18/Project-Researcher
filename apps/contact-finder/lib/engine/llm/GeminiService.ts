import { GoogleGenAI, Type } from '@google/genai';
import { Subject, LLMExtraction, LLMExtractor } from '../types';
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
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                phones: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      number: { type: Type.STRING },
                      owner: { type: Type.STRING, nullable: true },
                      relationship: { type: Type.STRING, nullable: true },
                      business: { type: Type.STRING, nullable: true },
                      address: { type: Type.STRING, nullable: true }
                    }
                  }
                }
              }
            }
          },
        });

        const text = response.text || '{}';
        const parsed = JSON.parse(text);
        return this.validateExtraction(parsed);
      } catch (err: any) {
        if (err.status === 429 || err.message?.includes('429')) {
          if (attempt === EngineConfig.rateLimit.geminiRetries) {
            console.warn(`[GeminiService] Gemini rate limited (429) on final attempt. Returning empty array gracefully.`);
            return { phones: [] };
          }
          const delay = Math.min(
            EngineConfig.rateLimit.geminiBaseDelayMs * Math.pow(2, attempt),
            EngineConfig.rateLimit.geminiMaxDelayMs
          );
          console.warn(`[GeminiService] Gemini rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1})`);
          await this.sleep(delay);
          continue;
        }

        if (attempt === EngineConfig.rateLimit.geminiRetries) {
          console.error(`[GeminiService] Gemini extraction failed: ${err.message}`);
          return { phones: [] };
        }
      }
    }

    return { phones: [] };
  }

  async extractContactsFromVision(base64Image: string, subject: Subject): Promise<LLMExtraction> {
    try {
      console.log('[GeminiService] Running Vision Extraction...');
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          `Find any contact phone numbers for "${subject.name}" or related to "${subject.company || 'their business'}" in this image. Return empty array if none found.`,
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              phones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.STRING },
                    owner: { type: Type.STRING, nullable: true },
                    relationship: { type: Type.STRING, nullable: true },
                    business: { type: Type.STRING, nullable: true },
                    address: { type: Type.STRING, nullable: true }
                  }
                }
              }
            }
          }
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return this.validateExtraction(parsed);
    } catch (err: any) {
      console.error('[GeminiService] Vision Extraction failed:', err.message);
      return { phones: [] };
    }
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

  async isSameEntity(nameA: string, nameB: string): Promise<boolean> {
    if (!nameA || !nameB) return false;

    const normA = nameA.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
    const normB = nameB.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');

    if (!normA || !normB) return false;
    if (normA === normB) return true;

    // Fast local token overlap matching without wasting API rate limit budget
    const tokensA = normA.split(' ');
    const tokensB = normB.split(' ');
    const overlap = tokensA.filter(t => t.length > 2 && tokensB.includes(t));

    if (overlap.length >= Math.min(tokensA.length, tokensB.length) && overlap.length >= 1) {
      return true;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Are "${nameA}" and "${nameB}" likely referring to the same person? Consider Indian naming conventions, typos, and abbreviations (e.g. "S. Gupta" and "Sanyogita Gupta"). Respond ONLY with {"isMatch": true} or {"isMatch": false}.`,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isMatch: { type: Type.BOOLEAN }
            }
          }
        },
      });
      const data = JSON.parse(response.text || '{}');
      return !!data.isMatch;
    } catch {
      // If Gemini fails or hits 429 rate limit, fallback to token overlap check
      return overlap.length > 0;
    }
  }
}
