import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Subject, InvestigationResult } from '../types';

export class FileCacheService {
  private cacheDir: string;
  private cacheFile: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.cacheFile = path.join(this.cacheDir, 'investigations.json');
  }

  private hashSubject(subject: Subject): string {
    const data = `${subject.name}|${subject.address}|${subject.city || ''}|${subject.company || ''}`.toLowerCase();
    return crypto.createHash('md5').update(data).digest('hex');
  }

  async init(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }

    try {
      await fs.access(this.cacheFile);
    } catch {
      await fs.writeFile(this.cacheFile, JSON.stringify({}), 'utf-8');
    }
  }

  async getCachedResult(subject: Subject): Promise<InvestigationResult | null> {
    try {
      await this.init();
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content);
      const hash = this.hashSubject(subject);

      if (cache[hash]) {
        console.log(`[Cache] ⚡ HIT! Returning instantly from Database Cache for: ${subject.name}`);
        return cache[hash] as InvestigationResult;
      }
      
      console.log(`[Cache] ❌ MISS. Running full investigation for: ${subject.name}`);
      return null;
    } catch (e) {
      console.error('[Cache] Error reading cache:', e);
      return null;
    }
  }

  async saveResult(subject: Subject, result: InvestigationResult): Promise<void> {
    try {
      await this.init();
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content);
      const hash = this.hashSubject(subject);

      cache[hash] = result;
      await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
      console.log(`[Cache] 💾 SAVED result to Database Cache for: ${subject.name}`);
    } catch (e) {
      console.error('[Cache] Error saving cache:', e);
    }
  }
}
