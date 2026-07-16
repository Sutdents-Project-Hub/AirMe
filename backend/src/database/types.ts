import type { EnvironmentSnapshot } from '@airme/contracts';

export interface EnvironmentCacheEntry {
  storedAt: number;
  snapshot: EnvironmentSnapshot;
}

export interface OperationalStore {
  getEnvironmentCache(cacheKey: string): Promise<EnvironmentCacheEntry | null>;
  setEnvironmentCache(
    cacheKey: string,
    snapshot: EnvironmentSnapshot,
    options?: { preserveStoredAt?: number },
  ): Promise<void>;
  recordRequestEvent(input: {
    requestId: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }): Promise<void>;
  isHealthy(): Promise<boolean>;
  migrate(): Promise<void>;
  close(): Promise<void>;
}
