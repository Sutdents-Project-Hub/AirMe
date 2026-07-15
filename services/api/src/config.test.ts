import { describe, expect, it } from 'vitest';

import { readApiConfig } from './config';

describe('readApiConfig', () => {
  it('creates a new fixture-only context secret when none is configured', () => {
    const first = readApiConfig({ AI_MODE: 'fixture' });
    const second = readApiConfig({ AI_MODE: 'fixture' });

    expect(first.contextSigningSecret).toHaveLength(43);
    expect(second.contextSigningSecret).not.toBe(first.contextSigningSecret);
  });

  it('requires a configured context secret in live mode', () => {
    expect(() => readApiConfig({ AI_MODE: 'live' })).toThrow('CONTEXT_SIGNING_SECRET_REQUIRED');
  });

  it('builds a safely encoded PostgreSQL URL from Coolify-style settings', () => {
    const config = readApiConfig({
      AI_MODE: 'fixture',
      DATABASE_HOST: 'postgres',
      DATABASE_PORT: '5432',
      DATABASE_NAME: 'airme',
      DATABASE_USER: 'airme',
      DATABASE_PASSWORD: 'safe password/with symbols',
    });

    expect(config.databaseUrl).toBe(
      'postgresql://airme:safe%20password%2Fwith%20symbols@postgres:5432/airme',
    );
  });
});
