import { randomBytes } from 'node:crypto';

export interface ApiConfig {
  allowedOrigins: string[];
  requestTimeoutMs: number;
  contextSigningSecret: string;
  contextTtlSeconds: number;
  moenvApiKey: string | null;
  cwaApiKey: string | null;
  azureOpenAiEndpoint: string | null;
  azureOpenAiDeployment: string | null;
  azureOpenAiApiVersion: string;
  azureOpenAiApiKey: string | null;
  aiMode: 'live' | 'fixture';
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readContextSigningSecret(
  env: NodeJS.ProcessEnv,
  aiMode: ApiConfig['aiMode'],
): string {
  const configured = env.CONTEXT_SIGNING_SECRET?.trim();
  if (configured) return configured;
  if (aiMode === 'fixture') return randomBytes(32).toString('base64url');
  throw new Error('CONTEXT_SIGNING_SECRET_REQUIRED');
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const aiMode = env.AI_MODE === 'live' ? 'live' : 'fixture';

  return {
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:8081,http://localhost:19006')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    requestTimeoutMs: positiveInteger(env.REQUEST_TIMEOUT_MS, 8_000),
    contextSigningSecret: readContextSigningSecret(env, aiMode),
    contextTtlSeconds: positiveInteger(env.CONTEXT_TTL_SECONDS, 1_800),
    moenvApiKey: env.MOENV_API_KEY?.trim() || null,
    cwaApiKey: env.CWA_API_KEY?.trim() || null,
    azureOpenAiEndpoint: env.AZURE_OPENAI_ENDPOINT?.trim() || null,
    azureOpenAiDeployment: env.AZURE_OPENAI_DEPLOYMENT?.trim() || null,
    azureOpenAiApiVersion: env.AZURE_OPENAI_API_VERSION?.trim() || '2025-04-01-preview',
    azureOpenAiApiKey: env.AZURE_OPENAI_API_KEY?.trim() || null,
    aiMode,
  };
}
