import { randomBytes } from 'node:crypto';

export interface ApiConfig {
  allowedOrigins: string[];
  requestTimeoutMs: number;
  aiMaxRequestsPerMinute: number;
  aiMaxConcurrency: number;
  environmentMaxRequestsPerMinute: number;
  environmentMaxConcurrency: number;
  contextSigningSecret: string;
  contextTtlSeconds: number;
  authSessionHmacSecret: string;
  authSessionTtlSeconds: number;
  valhallaRouteUrl: string;
  photonSearchUrl: string;
  routingMaxRequestsPerMinute: number;
  routingMaxConcurrency: number;
  moenvApiKey: string | null;
  cwaApiKey: string | null;
  openMeteoFallbackEnabled: boolean;
  liangjieAiBaseUrl: string;
  liangjieAiModel: string | null;
  liangjieAiApiKey: string | null;
  liangjieAiJsonMode: 'auto' | 'enabled' | 'disabled';
  cloudSyncEncryptionKey: string | null;
  databaseUrl: string | null;
  databaseRequired: boolean;
  host: string;
  port: number;
  aiMode: 'live' | 'fixture';
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === 'true';
}

function readJsonMode(value: string | undefined): ApiConfig['liangjieAiJsonMode'] {
  if (value === 'enabled' || value === 'disabled') return value;
  return 'auto';
}

function buildDatabaseUrl(env: NodeJS.ProcessEnv): string | null {
  const configured = env.DATABASE_URL?.trim();
  if (configured) return configured;

  const host = env.DATABASE_HOST?.trim();
  const user = env.DATABASE_USER?.trim();
  const password = env.DATABASE_PASSWORD;
  const database = env.DATABASE_NAME?.trim();
  if (!host || !user || !password || !database) return null;

  const port = positiveInteger(env.DATABASE_PORT, 5_432);
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function readContextSigningSecret(
  env: NodeJS.ProcessEnv,
  aiMode: ApiConfig['aiMode'],
): string {
  const configured = env.CONTEXT_SIGNING_SECRET?.trim();
  if (configured) {
    if (Buffer.byteLength(configured, 'utf8') < 32) {
      throw new Error('CONTEXT_SIGNING_SECRET_TOO_SHORT');
    }
    return configured;
  }
  if (aiMode === 'fixture') return randomBytes(32).toString('base64url');
  throw new Error('CONTEXT_SIGNING_SECRET_REQUIRED');
}

function readAuthSessionHmacSecret(
  env: NodeJS.ProcessEnv,
  aiMode: ApiConfig['aiMode'],
): string {
  const configured = env.AUTH_SESSION_HMAC_SECRET?.trim();
  if (configured) {
    if (Buffer.byteLength(configured, 'utf8') < 32) {
      throw new Error('AUTH_SESSION_HMAC_SECRET_TOO_SHORT');
    }
    return configured;
  }
  if (aiMode === 'fixture') return randomBytes(32).toString('base64url');
  throw new Error('AUTH_SESSION_HMAC_SECRET_REQUIRED');
}

function readCloudSyncEncryptionKey(env: NodeJS.ProcessEnv): string | null {
  const configured = env.CLOUD_SYNC_ENCRYPTION_KEY?.trim();
  if (!configured) return null;
  try {
    if (Buffer.from(configured, 'base64url').length !== 32) {
      throw new Error('invalid key length');
    }
    return configured;
  } catch {
    throw new Error('CLOUD_SYNC_ENCRYPTION_KEY_INVALID');
  }
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const aiMode = env.AI_MODE === 'live' ? 'live' : 'fixture';
  const databaseUrl = buildDatabaseUrl(env);

  return {
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:8081,http://localhost:19006')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    requestTimeoutMs: positiveInteger(env.REQUEST_TIMEOUT_MS, 8_000),
    aiMaxRequestsPerMinute: positiveInteger(env.AI_MAX_REQUESTS_PER_MINUTE, 60),
    aiMaxConcurrency: positiveInteger(env.AI_MAX_CONCURRENCY, 4),
    environmentMaxRequestsPerMinute: positiveInteger(
      env.ENVIRONMENT_MAX_REQUESTS_PER_MINUTE,
      120,
    ),
    environmentMaxConcurrency: positiveInteger(env.ENVIRONMENT_MAX_CONCURRENCY, 8),
    contextSigningSecret: readContextSigningSecret(env, aiMode),
    contextTtlSeconds: positiveInteger(env.CONTEXT_TTL_SECONDS, 1_800),
    authSessionHmacSecret: readAuthSessionHmacSecret(env, aiMode),
    authSessionTtlSeconds: positiveInteger(env.AUTH_SESSION_TTL_SECONDS, 60 * 60 * 24 * 30),
    valhallaRouteUrl: (env.VALHALLA_ROUTE_URL?.trim() || 'http://router:8002/route').replace(/\/$/, ''),
    photonSearchUrl: (env.PHOTON_SEARCH_URL?.trim() || 'http://geocoder:2322/api/').replace(/\/$/, ''),
    routingMaxRequestsPerMinute: positiveInteger(env.ROUTING_MAX_REQUESTS_PER_MINUTE, 30),
    routingMaxConcurrency: positiveInteger(env.ROUTING_MAX_CONCURRENCY, 4),
    moenvApiKey: env.MOENV_API_KEY?.trim() || null,
    cwaApiKey: env.CWA_API_KEY?.trim() || null,
    openMeteoFallbackEnabled: readBoolean(env.OPEN_METEO_FALLBACK_ENABLED, true),
    liangjieAiBaseUrl: (env.LIANGJIE_AI_BASE_URL?.trim() || 'https://liangjiewis.com').replace(/\/$/, ''),
    liangjieAiModel: env.LIANGJIE_AI_MODEL?.trim() || null,
    liangjieAiApiKey: env.LIANGJIE_AI_API_KEY?.trim() || null,
    liangjieAiJsonMode: readJsonMode(env.LIANGJIE_AI_JSON_MODE),
    cloudSyncEncryptionKey: readCloudSyncEncryptionKey(env),
    databaseUrl,
    databaseRequired: readBoolean(env.DATABASE_REQUIRED, aiMode === 'live'),
    host: env.HOST?.trim() || '0.0.0.0',
    port: positiveInteger(env.PORT, 3_000),
    aiMode,
  };
}
