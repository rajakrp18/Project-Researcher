import { Subject, FetchedDocument, ExtractedPhone, LLMExtractor } from '../types';
import { SemanticChunker } from '../embeddings/SemanticChunker';
import { extractPhones } from '../extractors/PhoneExtractor';
import Tesseract from 'tesseract.js';

export class ExtractorAgent {
  constructor(
    private llm: LLMExtractor,
    private chunker: SemanticChunker
  ) {}

  async init() {
    await this.chunker.init();
  }

  async extractFromDocument(doc: FetchedDocument, subject: Subject, budgetLeft: boolean): Promise<{ regexPhones: ExtractedPhone[], llmPhones: ExtractedPhone[] }> {
    let regexPhones = extractPhones(doc.content, doc.url);
    let llmPhones: ExtractedPhone[] = [];

    // 1. FAST PATH SHORT-CIRCUIT: If Regex found phones and we are in Pass 1 (!budgetLeft), SKIP LLM completely!
    if (!budgetLeft && regexPhones.length > 0) {
      console.log(`[Extractor] Found ${regexPhones.length} phones via regex. Skipping LLM for ${doc.url}`);
      return { regexPhones, llmPhones };
    }

    const keywords = ['phone', 'contact', 'mobile', 'call', subject.name];
    if (subject.company) keywords.push(subject.company);
    
    const lowerDoc = doc.content.toLowerCase();
    const hasKeyword = keywords.some(kw => lowerDoc.includes(kw.toLowerCase()));
    
    if (budgetLeft && doc.content.length > 100 && hasKeyword) {
      try {
        const relevantContent = await this.chunker.getRelevantChunks(doc.content, keywords);
        const llmResult = await this.llm.extractContacts(relevantContent, subject);
        llmPhones = llmResult.phones.map(p => ({
          phone: p.number,
          raw: p.number,
          context: [p.owner, p.relationship, p.business, p.address].filter(Boolean).join(' | '),
          sourceUrl: doc.url,
        }));
      } catch (err) {
        console.error('LLM Extraction failed', err);
      }
    }

    // 2. DEEP SEARCH (OCR & Vision): Only if explicitly allowed (budgetLeft), and if Regex/LLM found nothing
    if (budgetLeft && regexPhones.length === 0 && llmPhones.length === 0 && doc.screenshotBase64) {
      try {
        console.log(`[Extractor] Running Tesseract OCR on screenshot for ${doc.url}`);
        const buffer = Buffer.from(doc.screenshotBase64, 'base64');
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
        const ocrPhones = extractPhones(text, doc.url);
        
        if (ocrPhones.length > 0) {
           console.log(`[Extractor] Tesseract OCR found ${ocrPhones.length} phones!`);
           regexPhones = ocrPhones.map(p => ({
              ...p,
              context: '[OCR Extracted] ' + p.context
           }));
        } else {
            console.log(`[Extractor] Tesseract failed. Gemini Vision fallback has been disabled to prevent bulk rate limiting.`);
        }
      } catch (err) {
        console.error('Tesseract OCR failed', err);
      }
    }

    return { regexPhones, llmPhones };
  }
}
