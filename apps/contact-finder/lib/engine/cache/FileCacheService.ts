import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Subject, InvestigationResult } from '../types';

export const CURRENT_PARSER_VERSION = '2.0.0';
export const CURRENT_ENGINE_VERSION = '2.0.0';
export const CURRENT_SCORING_VERSION = '2.0.0';

export interface VersionedInvestigationResult extends InvestigationResult {
  parserVersion?: string;
  engineVersion?: string;
  scoringVersion?: string;
}

export class FileCacheService {
  private cacheDir: string;
  private cacheFile: string;
  private backupFile: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.cacheFile = path.join(this.cacheDir, 'investigations.json');
    this.backupFile = path.join(this.cacheDir, 'investigations.json.bak');
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
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(content);
      // Check if cache contains legacy unversioned entries (Patch 0.4)
      const keys = Object.keys(cache);
      if (keys.length > 0) {
        const firstEntry = cache[keys[0]];
        if (!firstEntry.engineVersion || firstEntry.engineVersion !== CURRENT_ENGINE_VERSION) {
          console.warn(`[Cache Quarantine] Archiving legacy unversioned cache to investigations.json.bak`);
          await fs.rename(this.cacheFile, this.backupFile);
          await fs.writeFile(this.cacheFile, JSON.stringify({}), 'utf-8');
        }
      }
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
      const entry = cache[hash] as VersionedInvestigationResult;

      if (entry) {
        if (
          entry.engineVersion === CURRENT_ENGINE_VERSION &&
          entry.scoringVersion === CURRENT_SCORING_VERSION &&
          entry.parserVersion === CURRENT_PARSER_VERSION
        ) {
          console.log(`[Cache] ⚡ HIT! Returning version-stamped result for: ${subject.name}`);
          return entry;
        } else {
          console.log(`[Cache] ⚠️ STALE VERSION. Invalidating cache entry for: ${subject.name}`);
          delete cache[hash];
          await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
        }
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

      const versionedResult: VersionedInvestigationResult = {
        ...result,
        parserVersion: CURRENT_PARSER_VERSION,
        engineVersion: CURRENT_ENGINE_VERSION,
        scoringVersion: CURRENT_SCORING_VERSION,
      };

      cache[hash] = versionedResult;
      await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
      console.log(`[Cache] 💾 SAVED version-stamped result to Database Cache for: ${subject.name}`);
    } catch (e) {
      console.error('[Cache] Error saving cache:', e);
    }
  }
}
