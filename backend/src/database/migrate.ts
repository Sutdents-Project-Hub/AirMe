import { readApiConfig } from '../config';
import { PostgresStore } from './postgres-store';

async function main(): Promise<void> {
  const config = readApiConfig();
  if (!config.databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
  const store = new PostgresStore(config.databaseUrl);
  try {
    await store.migrate();
  } finally {
    await store.close();
  }
}

void main().catch(() => {
  process.stderr.write('資料庫 migration 失敗。請確認 PostgreSQL 連線與 DATABASE_* 設定。\n');
  process.exitCode = 1;
});
