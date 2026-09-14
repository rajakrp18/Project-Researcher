import { Subject, InvestigationResult } from './types';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { FileCacheService } from './cache/FileCacheService';

export class InvestigationOrchestrator {
  private coordinator: CoordinatorAgent;
  private cache: FileCacheService;

  constructor() {
    this.coordinator = new CoordinatorAgent();
    this.cache = new FileCacheService();
  }

  async investigate(subject: Subject, forceRerun: boolean = false): Promise<InvestigationResult> {
    // 1. Check Database Cache First! (Unless forceRerun is true)
    if (!forceRerun) {
      const cached = await this.cache.getCachedResult(subject);
      if (cached) {
        return { ...cached, isCached: true };
      }
    }

    console.log(`[InvestigationOrchestrator] Starting multi-agent investigation for ${subject.name}...`);
    const result = await this.coordinator.investigate(subject);
    
    // 2. Save to Cache
    await this.cache.saveResult(subject, result);
    
    return result;
  }
}
