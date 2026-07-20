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

  it('rejects a configured context secret shorter than 32 bytes', () => {
    expect(() =>
      readApiConfig({ AI_MODE: 'live', CONTEXT_SIGNING_SECRET: 'too-short' }),
    ).toThrow('CONTEXT_SIGNING_SECRET_TOO_SHORT');
  });

  it('creates an ephemeral session HMAC key for fixture mode but requires one in live mode', () => {
    const first = readApiConfig({ AI_MODE: 'fixture' });
    const second = readApiConfig({ AI_MODE: 'fixture' });

    expect(first.authSessionHmacSecret).toHaveLength(43);
    expect(second.authSessionHmacSecret).not.toBe(first.authSessionHmacSecret);
    expect(() =>
      readApiConfig({
        AI_MODE: 'live',
        CONTEXT_SIGNING_SECRET: 'a context signing secret that is at least 32 bytes',
      }),
    ).toThrow('AUTH_SESSION_HMAC_SECRET_REQUIRED');
  });

  it('rejects short configured session HMAC keys', () => {
    expect(() =>
      readApiConfig({ AI_MODE: 'fixture', AUTH_SESSION_HMAC_SECRET: 'too-short' }),
    ).toThrow('AUTH_SESSION_HMAC_SECRET_TOO_SHORT');
  });

  it('reads AI cost-protection limits', () => {
    const config = readApiConfig({
      AI_MODE: 'fixture',
      AI_MAX_REQUESTS_PER_MINUTE: '30',
      AI_MAX_CONCURRENCY: '2',
      ENVIRONMENT_MAX_REQUESTS_PER_MINUTE: '90',
      ENVIRONMENT_MAX_CONCURRENCY: '6',
    });

    expect(config.aiMaxRequestsPerMinute).toBe(30);
    expect(config.aiMaxConcurrency).toBe(2);
    expect(config.environmentMaxRequestsPerMinute).toBe(90);
    expect(config.environmentMaxConcurrency).toBe(6);
  });

  it('uses internal mapping defaults and applies their independent limits', () => {
    const config = readApiConfig({
      AI_MODE: 'fixture',
      VALHALLA_ROUTE_URL: 'http://routing.internal/route/',
      PHOTON_SEARCH_URL: 'http://places.internal/api/',
      ROUTING_MAX_REQUESTS_PER_MINUTE: '18',
      ROUTING_MAX_CONCURRENCY: '2',
    });

    expect(config.valhallaRouteUrl).toBe('http://routing.internal/route');
    expect(config.photonSearchUrl).toBe('http://places.internal/api');
    expect(config.routingMaxRequestsPerMinute).toBe(18);
    expect(config.routingMaxConcurrency).toBe(2);
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
