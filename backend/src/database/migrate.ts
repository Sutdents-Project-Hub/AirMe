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
}

void main()
  .then(
    () =>
      new Promise<void>((resolve) => {
        process.stdout.write('AirMe database migration: complete.\n', () => resolve());
      }),
  )
  .then(() => {
    // pg can retain a DNS/network handle after Pool#end resolves. This command is a
    // one-shot deployment step, so terminate only after the pool and stdout flush.
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `AirMe database migration failed [${migrationFailureCode(error)}].\n`,
      () => process.exit(1),
    );
  });
