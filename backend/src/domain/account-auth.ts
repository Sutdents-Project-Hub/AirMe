import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';

import type { Account, AuthSession, LoginRequest, RegisterRequest, SessionStatus } from '@airme/contracts';

import type { OperationalStore } from '../database/types';

const SCRYPT_PARAMETERS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const PASSWORD_KEY_LENGTH = 64;

type AuthFailureReason = 'email-exists' | 'invalid-credentials' | 'session-expired' | 'unavailable';

export class AccountAuthError extends Error {
  constructor(readonly reason: AuthFailureReason) {
    super(`AUTH_${reason.toUpperCase().replace(/-/g, '_')}`);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, SCRYPT_PARAMETERS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derivePasswordKey(password, salt);
  return `scrypt$N=${SCRYPT_PARAMETERS.N},r=${SCRYPT_PARAMETERS.r},p=${SCRYPT_PARAMETERS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, parameters, saltValue, keyValue, ...rest] = encoded.split('$');
  if (algorithm !== 'scrypt' || !parameters || !saltValue || !keyValue || rest.length > 0) return false;
  const parameterMatch = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(parameters);
  if (!parameterMatch) return false;
  const [, nText, rText, pText] = parameterMatch;
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (N !== SCRYPT_PARAMETERS.N || r !== SCRYPT_PARAMETERS.r || p !== SCRYPT_PARAMETERS.p) return false;

  try {
    const salt = Buffer.from(saltValue, 'base64url');
    const expected = Buffer.from(keyValue, 'base64url');
    if (salt.length !== 16 || expected.length !== PASSWORD_KEY_LENGTH) return false;
    const derived = await derivePasswordKey(password, salt);
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function extractBearerToken(value: string | null): string | null {
  const match = /^Bearer ([A-Za-z0-9_-]{32,512})$/i.exec(value ?? '');
  return match?.[1] ?? null;
}

export interface AccountAuthServiceOptions {
  store: OperationalStore | null;
  sessionHmacSecret: string;
  sessionTtlSeconds: number;
  now?: () => Date;
}

export class AccountAuthService {
  private readonly now: () => Date;
  private readonly dummyPasswordHash: Promise<string>;

  constructor(private readonly options: AccountAuthServiceOptions) {
    this.now = options.now ?? (() => new Date());
    // Keep login timing comparable for an unknown email without storing any
    // account-like record in PostgreSQL.
    this.dummyPasswordHash = hashPassword('airme-unknown-account-password');
  }

  async register(request: RegisterRequest): Promise<AuthSession> {
    const store = this.requireStore();
    const now = this.now();
    const account: Account = {
      id: randomUUID(),
      email: normalizeEmail(request.email),
      displayName: request.displayName.trim(),
      createdAt: now.toISOString(),
    };
    const token = this.createToken();
    const expiresAt = this.expiresAt(now);

    try {
      await store.createAccountWithSession({
        account: { ...account, passwordHash: await hashPassword(request.password) },
        privacyConsentedAt: now,
        session: {
          id: randomUUID(),
          tokenDigest: this.digestToken(token),
          expiresAt,
          createdAt: now,
        },
      });
    } catch (error) {
      if (databaseErrorCode(error) === '23505') throw new AccountAuthError('email-exists');
      throw new AccountAuthError('unavailable');
    }
    return { account, accessToken: token, expiresAt: expiresAt.toISOString() };
  }

  async login(request: LoginRequest): Promise<AuthSession> {
    const store = this.requireStore();
    const email = normalizeEmail(request.email);
    let account;
    try {
      account = await store.findAccountByEmail(email);
    } catch {
      throw new AccountAuthError('unavailable');
    }

    const passwordHash = account?.passwordHash ?? (await this.dummyPasswordHash);
    if (!(await verifyPassword(request.password, passwordHash)) || !account) {
      throw new AccountAuthError('invalid-credentials');
    }

    const now = this.now();
    const token = this.createToken();
    const expiresAt = this.expiresAt(now);
    try {
      await store.createSession({
        id: randomUUID(),
        accountId: account.id,
        tokenDigest: this.digestToken(token),
        expiresAt,
        createdAt: now,
      });
    } catch {
      throw new AccountAuthError('unavailable');
    }
    return {
      account: toPublicAccount(account),
      accessToken: token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getSession(token: string | null): Promise<SessionStatus> {
    const session = await this.findActiveSession(token);
    return { account: session.account, expiresAt: session.expiresAt.toISOString() };
  }

  async logout(token: string | null): Promise<void> {
    const digest = this.requireSessionToken(token);
    try {
      const session = await this.options.store?.findSessionByTokenDigest(digest);
      if (!session) throw new AccountAuthError('session-expired');
      await this.options.store?.revokeSessionByTokenDigest(digest);
    } catch (error) {
      if (error instanceof AccountAuthError) throw error;
      throw new AccountAuthError('unavailable');
    }
  }

  async deleteAccount(token: string | null): Promise<void> {
    const session = await this.findActiveSession(token);
    try {
      await this.options.store?.deleteAccount(session.account.id);
    } catch {
      throw new AccountAuthError('unavailable');
    }
  }

  private requireStore(): OperationalStore {
    if (!this.options.store) throw new AccountAuthError('unavailable');
    return this.options.store;
  }

  private createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private digestToken(token: string): string {
    return createHmac('sha256', this.options.sessionHmacSecret).update(token).digest('base64url');
  }

  private expiresAt(now: Date): Date {
    return new Date(now.getTime() + this.options.sessionTtlSeconds * 1_000);
  }

  private requireSessionToken(token: string | null): string {
    this.requireStore();
    if (!token) throw new AccountAuthError('session-expired');
    return this.digestToken(token);
  }

  private async findActiveSession(token: string | null): Promise<{ account: Account; expiresAt: Date }> {
    const digest = this.requireSessionToken(token);
    try {
      const session = await this.options.store?.findSessionByTokenDigest(digest);
      if (!session) throw new AccountAuthError('session-expired');
      return session;
    } catch (error) {
      if (error instanceof AccountAuthError) throw error;
      throw new AccountAuthError('unavailable');
    }
  }
}

function toPublicAccount(account: { id: string; email: string; displayName: string; createdAt: string }): Account {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
}

function databaseErrorCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;
}
