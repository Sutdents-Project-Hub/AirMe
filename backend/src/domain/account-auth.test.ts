import type { Account, EnvironmentSnapshot } from '@airme/contracts';
import { describe, expect, it } from 'vitest';

import type { AccountRecord, EnvironmentCacheEntry, OperationalStore, StoredSession } from '../database/types';
import {
  AccountAuthError,
  AccountAuthService,
  extractBearerToken,
  hashPassword,
  verifyPassword,
} from './account-auth';

const now = new Date('2026-07-20T03:00:00.000Z');

class MemoryStore implements OperationalStore {
  readonly accounts = new Map<string, AccountRecord>();
  readonly sessions = new Map<string, StoredSession>();
  readonly revokedDigests = new Set<string>();

  async getEnvironmentCache(_cacheKey: string): Promise<EnvironmentCacheEntry | null> {
    return null;
  }

  async setEnvironmentCache(
    _cacheKey: string,
    _snapshot: EnvironmentSnapshot,
    _options?: { preserveStoredAt?: number },
  ): Promise<void> {}

  async recordRequestEvent(_input: {
    requestId: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }): Promise<void> {}

  async createAccountWithSession(input: {
    account: AccountRecord;
    privacyConsentedAt: Date;
    session: { id: string; tokenDigest: string; expiresAt: Date; createdAt: Date };
  }): Promise<void> {
    if (this.accounts.has(input.account.email)) {
      throw Object.assign(new Error('duplicate'), { code: '23505' });
    }
    this.accounts.set(input.account.email, input.account);
    this.sessions.set(input.session.tokenDigest, {
      account: publicAccount(input.account),
      expiresAt: input.session.expiresAt,
    });
  }

  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    return this.accounts.get(email) ?? null;
  }

  async createSession(input: {
    id: string;
    accountId: string;
    tokenDigest: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<void> {
    const account = [...this.accounts.values()].find((item) => item.id === input.accountId);
    if (!account) throw new Error('missing account');
    this.sessions.set(input.tokenDigest, { account: publicAccount(account), expiresAt: input.expiresAt });
  }

  async findSessionByTokenDigest(tokenDigest: string): Promise<StoredSession | null> {
    if (this.revokedDigests.has(tokenDigest)) return null;
    const session = this.sessions.get(tokenDigest);
    return session && session.expiresAt > now ? session : null;
  }

  async revokeSessionByTokenDigest(tokenDigest: string): Promise<void> {
    this.revokedDigests.add(tokenDigest);
  }

  async deleteAccount(accountId: string): Promise<void> {
    const account = [...this.accounts.values()].find((item) => item.id === accountId);
    if (!account) return;
    this.accounts.delete(account.email);
    for (const [digest, session] of this.sessions) {
      if (session.account.id === accountId) this.sessions.delete(digest);
    }
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async migrate(): Promise<void> {}

  async close(): Promise<void> {}
}

function publicAccount(account: AccountRecord): Account {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
}

function service(store: OperationalStore | null): AccountAuthService {
  return new AccountAuthService({
    store,
    sessionHmacSecret: 'this-is-a-test-only-session-hmac-secret',
    sessionTtlSeconds: 60 * 60,
    now: () => now,
  });
}

async function authFailure(action: () => Promise<unknown>): Promise<AccountAuthError> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(AccountAuthError);
    return error as AccountAuthError;
  }
  throw new Error('expected authentication failure');
}

describe('password hashing', () => {
  it('uses scrypt verifiers that only accept the original password', async () => {
    const hash = await hashPassword('a long enough test password');

    expect(hash).toMatch(/^scrypt\$N=16384,r=8,p=1\$/);
    await expect(verifyPassword('a long enough test password', hash)).resolves.toBe(true);
    await expect(verifyPassword('different password', hash)).resolves.toBe(false);
    await expect(verifyPassword('a long enough test password', 'plain-text-password')).resolves.toBe(false);
  });
});

describe('AccountAuthService', () => {
  it('registers a normalized account and persists only a password verifier plus a session digest', async () => {
    const store = new MemoryStore();
    const result = await service(store).register({
      email: 'Student@Example.COM',
      password: 'correct horse battery staple',
      displayName: ' 小明 ',
      privacyConsent: true,
    });

    expect(result.account).toMatchObject({ email: 'student@example.com', displayName: '小明' });
    expect(result.expiresAt).toBe('2026-07-20T04:00:00.000Z');
    const stored = store.accounts.get('student@example.com')!;
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain('correct horse battery staple');
    expect([...store.sessions.keys()]).not.toContain(result.accessToken);
    expect(JSON.stringify([...store.sessions.keys()])).not.toContain(result.accessToken);
  });

  it('uses a stable non-leaking invalid-credentials failure for absent and wrong-password accounts', async () => {
    const store = new MemoryStore();
    const auth = service(store);
    await auth.register({
      email: 'student@example.com',
      password: 'correct horse battery staple',
      displayName: '小明',
      privacyConsent: true,
    });

    await expect(
      authFailure(() => auth.login({ email: 'nobody@example.com', password: 'any password' })),
    ).resolves.toMatchObject({ reason: 'invalid-credentials' });
    await expect(
      authFailure(() => auth.login({ email: 'student@example.com', password: 'wrong password' })),
    ).resolves.toMatchObject({ reason: 'invalid-credentials' });
  });

  it('rejects duplicate emails and supports session inspection, logout, and account deletion', async () => {
    const store = new MemoryStore();
    const auth = service(store);
    const registration = await auth.register({
      email: 'student@example.com',
      password: 'correct horse battery staple',
      displayName: '小明',
      privacyConsent: true,
    });

    await expect(
      authFailure(() =>
        auth.register({
          email: 'STUDENT@example.com',
          password: 'another correct password',
          displayName: '小明',
          privacyConsent: true,
        }),
      ),
    ).resolves.toMatchObject({ reason: 'email-exists' });
    await expect(auth.getSession(registration.accessToken)).resolves.toMatchObject({
      account: registration.account,
    });
    await auth.logout(registration.accessToken);
    await expect(authFailure(() => auth.getSession(registration.accessToken))).resolves.toMatchObject({
      reason: 'session-expired',
    });

    const login = await auth.login({ email: 'student@example.com', password: 'correct horse battery staple' });
    await auth.deleteAccount(login.accessToken);
    expect(store.accounts).toHaveLength(0);
    await expect(authFailure(() => auth.getSession(login.accessToken))).resolves.toMatchObject({
      reason: 'session-expired',
    });
  });

  it('does not offer account operations while PostgreSQL is unavailable', async () => {
    await expect(
      authFailure(() =>
        service(null).register({
          email: 'student@example.com',
          password: 'correct horse battery staple',
          displayName: '小明',
          privacyConsent: true,
        }),
      ),
    ).resolves.toMatchObject({ reason: 'unavailable' });
  });
});

describe('extractBearerToken', () => {
  it('accepts only a complete opaque bearer token', () => {
    const token = 'a'.repeat(43);
    expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
    expect(extractBearerToken(`Basic ${token}`)).toBeNull();
    expect(extractBearerToken('Bearer short')).toBeNull();
  });
});
