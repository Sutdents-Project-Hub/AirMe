import type { Account, EnvironmentSnapshot } from '@airme/contracts';

export interface EnvironmentCacheEntry {
  storedAt: number;
  snapshot: EnvironmentSnapshot;
}

/**
 * The internal account representation deliberately adds only the verifier
 * needed to authenticate a password. Profile, activity, and health data must
 * remain on the device unless a separately consented sync feature is added.
 */
export interface AccountRecord extends Account {
  passwordHash: string;
}

export interface StoredSession {
  account: Account;
  expiresAt: Date;
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
  createAccountWithSession(input: {
    account: AccountRecord;
    privacyConsentedAt: Date;
    session: { id: string; tokenDigest: string; expiresAt: Date; createdAt: Date };
  }): Promise<void>;
  findAccountByEmail(email: string): Promise<AccountRecord | null>;
  createSession(input: {
    id: string;
    accountId: string;
    tokenDigest: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<void>;
  findSessionByTokenDigest(tokenDigest: string): Promise<StoredSession | null>;
  revokeSessionByTokenDigest(tokenDigest: string): Promise<void>;
  deleteAccount(accountId: string): Promise<void>;
  isHealthy(): Promise<boolean>;
  migrate(): Promise<void>;
  close(): Promise<void>;
}
