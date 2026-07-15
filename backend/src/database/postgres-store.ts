import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { EnvironmentSnapshotSchema } from '@airme/contracts';
import { Pool } from 'pg';

import type { EnvironmentCacheEntry, OperationalStore } from './types';

export class PostgresStore implements OperationalStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10 });
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

  async setEnvironmentCache(cacheKey: string, snapshot: EnvironmentCacheEntry['snapshot']): Promise<void> {
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
