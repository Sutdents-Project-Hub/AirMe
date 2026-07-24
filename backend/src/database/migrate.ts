import { readApiConfig } from '../config';
import { PostgresStore } from './postgres-store';

function migrationFailureCode(error: unknown): string {
  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z0-9_]+$/.test(error.code)
  ) {
    return error.code;
  }

  return 'UNKNOWN';
}

async function main(): Promise<void> {
  const config = readApiConfig();
  if (!config.databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
  const store = new PostgresStore(config.databaseUrl);
  process.stdout.write('AirMe database migration: starting.\n');
  try {
    await store.migrate();
  } finally {
    await store.close();
  }
  process.stdout.write('AirMe database migration: complete.\n');
}

void main().catch((error: unknown) => {
  process.stderr.write(`AirMe database migration failed [${migrationFailureCode(error)}].\n`);
  process.exitCode = 1;
});
