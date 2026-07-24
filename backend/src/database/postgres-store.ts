import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { AccountSchema, EnvironmentSnapshotSchema } from '@airme/contracts';
import { Pool } from 'pg';

import type {
  AccountRecord,
  EncryptedAccountCloudState,
  EnvironmentCacheEntry,
  OperationalStore,
  StoredSession,
} from './types';

export class PostgresStore implements OperationalStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      query_timeout: 10_000,
      statement_timeout: 8_000,
    });
  }

  async getEnvironmentCache(cacheKey: string): Promise<EnvironmentCacheEntry | null> {
    const result = await this.pool.query<{ stored_at: Date; snapshot: unknown }>(
      'SELECT stored_at, snapshot FROM environment_cache WHERE cache_key = $1',
      [cacheKey],
    );
    const row = result.rows[0];
    if (!row) return null;
    const snapshot = EnvironmentSnapshotSchema.safeParse(row.snapshot);
    if (!snapshot.success) return null;
    return { storedAt: new Date(row.stored_at).getTime(), snapshot: snapshot.data };
  }

  async setEnvironmentCache(
    cacheKey: string,
    snapshot: EnvironmentCacheEntry['snapshot'],
    options?: { preserveStoredAt?: number },
  ): Promise<void> {
    if (options?.preserveStoredAt !== undefined) {
      await this.pool.query(
        `INSERT INTO environment_cache (cache_key, snapshot, stored_at)
         VALUES ($1, $2::jsonb, TO_TIMESTAMP($3 / 1000.0))
         ON CONFLICT (cache_key) DO UPDATE
         SET snapshot = EXCLUDED.snapshot, stored_at = environment_cache.stored_at`,
        [cacheKey, JSON.stringify(snapshot), options.preserveStoredAt],
      );
      return;
    }
    await this.pool.query(
      `INSERT INTO environment_cache (cache_key, snapshot, stored_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (cache_key) DO UPDATE SET snapshot = EXCLUDED.snapshot, stored_at = EXCLUDED.stored_at`,
      [cacheKey, JSON.stringify(snapshot)],
    );
  }

  async recordRequestEvent(input: {
    requestId: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO service_events (request_id, route, status_code, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [input.requestId, input.route, input.statusCode, Math.max(0, Math.round(input.durationMs))],
    );
  }

  async createAccountWithSession(input: {
    account: AccountRecord;
    privacyConsentedAt: Date;
    session: { id: string; tokenDigest: string; expiresAt: Date; createdAt: Date };
  }): Promise<void> {
    await this.pool.query(
      `WITH created_account AS (
        INSERT INTO accounts (
          id, email, display_name, password_hash, privacy_consented_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      )
      INSERT INTO account_sessions (id, account_id, token_digest, expires_at, created_at)
      SELECT $7, id, $8, $9, $10 FROM created_account`,
      [
        input.account.id,
        input.account.email,
        input.account.displayName,
        input.account.passwordHash,
        input.privacyConsentedAt,
        new Date(input.account.createdAt),
        input.session.id,
        input.session.tokenDigest,
        input.session.expiresAt,
        input.session.createdAt,
      ],
    );
  }

  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    const result = await this.pool.query<{
      id: string;
      email: string;
      display_name: string;
      password_hash: string;
      created_at: Date;
    }>(
      `SELECT id, email, display_name, password_hash, created_at
       FROM accounts
       WHERE email = $1`,
      [email],
    );
    const row = result.rows[0];
    if (!row) return null;
    const account = AccountSchema.safeParse({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: new Date(row.created_at).toISOString(),
    });
    if (!account.success) throw new Error('INVALID_ACCOUNT_ROW');
    return { ...account.data, passwordHash: row.password_hash };
  }

  async createSession(input: {
    id: string;
    accountId: string;
    tokenDigest: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO account_sessions (id, account_id, token_digest, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.id, input.accountId, input.tokenDigest, input.expiresAt, input.createdAt],
    );
  }

  async findSessionByTokenDigest(tokenDigest: string): Promise<StoredSession | null> {
    const result = await this.pool.query<{
      id: string;
      email: string;
      display_name: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `SELECT a.id, a.email, a.display_name, a.created_at, s.expires_at
       FROM account_sessions s
       INNER JOIN accounts a ON a.id = s.account_id
       WHERE s.token_digest = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()`,
      [tokenDigest],
    );
    const row = result.rows[0];
    if (!row) return null;
    const expiresAt = new Date(row.expires_at);
    if (Number.isNaN(expiresAt.getTime())) throw new Error('INVALID_SESSION_ROW');
    const account = AccountSchema.safeParse({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: new Date(row.created_at).toISOString(),
    });
    if (!account.success) throw new Error('INVALID_SESSION_ROW');
    return { account: account.data, expiresAt };
  }

  async revokeSessionByTokenDigest(tokenDigest: string): Promise<void> {
    await this.pool.query(
      `UPDATE account_sessions
       SET revoked_at = NOW()
       WHERE token_digest = $1 AND revoked_at IS NULL`,
      [tokenDigest],
    );
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  }

  async getAccountCloudState(accountId: string): Promise<EncryptedAccountCloudState | null> {
    const result = await this.pool.query<{
      ciphertext: Buffer;
      iv: Buffer;
      auth_tag: Buffer;
      updated_at: Date;
    }>(
      `SELECT ciphertext, iv, auth_tag, updated_at
       FROM account_cloud_states
       WHERE account_id = $1`,
      [accountId],
    );
    const row = result.rows[0];
    if (!row || !Buffer.isBuffer(row.ciphertext) || !Buffer.isBuffer(row.iv) || !Buffer.isBuffer(row.auth_tag)) {
      return null;
    }
    const updatedAt = new Date(row.updated_at);
    if (Number.isNaN(updatedAt.getTime())) throw new Error('INVALID_CLOUD_STATE_ROW');
    return { ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag, updatedAt };
  }

  async setAccountCloudState(input: {
    accountId: string;
    ciphertext: Buffer;
    iv: Buffer;
    authTag: Buffer;
  }): Promise<Date> {
    const result = await this.pool.query<{ updated_at: Date }>(
      `INSERT INTO account_cloud_states (account_id, ciphertext, iv, auth_tag, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (account_id) DO UPDATE
       SET ciphertext = EXCLUDED.ciphertext,
           iv = EXCLUDED.iv,
           auth_tag = EXCLUDED.auth_tag,
           updated_at = NOW()
       RETURNING updated_at`,
      [input.accountId, input.ciphertext, input.iv, input.authTag],
    );
    const updatedAt = new Date(result.rows[0]?.updated_at);
    if (Number.isNaN(updatedAt.getTime())) throw new Error('INVALID_CLOUD_STATE_ROW');
    return updatedAt;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async migrate(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    );
    const migrationsDir = path.resolve(process.cwd(), 'database/migrations');
    const migrations = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();

    for (const name of migrations) {
      const existing = await this.pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (existing.rowCount) continue;

      const sql = await readFile(path.join(migrationsDir, name), 'utf8');
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
