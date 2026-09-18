import { pipeline, Pipeline } from '@xenova/transformers';

export class SemanticChunker {
  private extractor: any = null;
  private isLoaded = false;

  async init() {
    if (this.isLoaded) return;
    try {
      // Use the lightweight all-MiniLM-L6-v2 model for quick local embeddings
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.isLoaded = true;
      console.log('[SemanticChunker] Transformers loaded successfully.');
    } catch (err) {
      console.error('[SemanticChunker] Failed to load Transformers:', err);
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getRelevantChunks(text: string, queryKeywords: string[], maxChunks: number = 3, chunkSize: number = 3000): Promise<string> {
    if (!this.isLoaded || !this.extractor) {
      // Fallback to basic keyword inclusion if transformers failed to load
      return this.basicChunking(text, queryKeywords, maxChunks, chunkSize);
    }

    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    if (chunks.length <= maxChunks) {
      return chunks.join('\\n...\\n');
    }

    try {
      // Fast Lexical Pre-Filter: keep only chunks containing at least 1 keyword
      const candidateChunks = chunks.filter(c => {
        const lower = c.toLowerCase();
        return queryKeywords.some(kw => lower.includes(kw.toLowerCase()));
      });

      const chunksToEmbed = candidateChunks.length > 0 ? candidateChunks.slice(0, 5) : chunks.slice(0, maxChunks);

      const query = queryKeywords.join(' ');
      const queryOutput = await this.extractor(query, { pooling: 'mean', normalize: true });
      const queryVec = Array.from(queryOutput.data) as number[];

      const scoredChunks = [];
      for (const chunk of chunksToEmbed) {
        // Embed candidate chunks
        const chunkOutput = await this.extractor(chunk, { pooling: 'mean', normalize: true });
        const chunkVec = Array.from(chunkOutput.data) as number[];
        
        const score = this.cosineSimilarity(queryVec, chunkVec);
        scoredChunks.push({ chunk, score });
      }

      scoredChunks.sort((a, b) => b.score - a.score);
      
      return scoredChunks
        .slice(0, maxChunks)
        .map(sc => sc.chunk)
        .join('\\n...\\n');

    } catch (err) {
      console.error('[SemanticChunker] Error processing chunks, falling back to basic:', err);
      return this.basicChunking(text, queryKeywords, maxChunks, chunkSize);
    }
  }

  private basicChunking(text: string, keywords: string[], maxChunks: number, chunkSize: number): string {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    
    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const lowerChunk = chunk.toLowerCase();
      for (const kw of keywords) {
        if (lowerChunk.includes(kw.toLowerCase())) score++;
      }
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks
      .filter(sc => sc.score > 0)
      .slice(0, maxChunks)
      .map(sc => sc.chunk)
      .join('\\n...\\n');
  }
}
