import type { AiAdapter } from './adapters/ai/types';
import { FixtureAiAdapter } from './adapters/ai/fixture';
import { LiangjieAiAdapter } from './adapters/ai/liangjie';
import { createCwaLoader } from './adapters/environment/cwa';
import { EnvironmentService } from './adapters/environment/service';
import { getEnvironmentFixture } from './adapters/environment/fixture';
import { createMoenvLoader } from './adapters/environment/moenv';
import { readApiConfig } from './config';
import { PostgresStore } from './database/postgres-store';
import type { OperationalStore } from './database/types';
import { ContextTokenService } from './domain/context-token';
import { FollowUpService } from './domain/follow-up';
import { RecommendationService } from './domain/recommendation';
import { createApiHandlers } from './http/handlers';

const unavailableAirQuality = async () => {
  throw new Error('MOENV_UNAVAILABLE');
};
const unavailableWeather = async () => {
  throw new Error('CWA_UNAVAILABLE');
};

export interface AirMeApplication {
  handlers: ReturnType<typeof createApiHandlers>;
  store: OperationalStore | null;
}

export function createApplication(): AirMeApplication {
  const config = readApiConfig();
  if (config.databaseRequired && !config.databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
  if (config.aiMode === 'live' && (!config.liangjieAiModel || !config.liangjieAiApiKey)) {
    throw new Error('LIANGJIE_AI_CONFIG_REQUIRED');
  }
  const store = config.databaseUrl ? new PostgresStore(config.databaseUrl) : null;
  const environmentService = new EnvironmentService({
    loadAirQuality: config.moenvApiKey
      ? createMoenvLoader({ apiKey: config.moenvApiKey, timeoutMs: config.requestTimeoutMs })
      : unavailableAirQuality,
    loadWeather: config.cwaApiKey
      ? createCwaLoader({ apiKey: config.cwaApiKey, timeoutMs: config.requestTimeoutMs })
      : unavailableWeather,
    getFixture: getEnvironmentFixture,
    persistentCache: store ?? undefined,
  });

  let ai: AiAdapter = new FixtureAiAdapter();
  if (config.aiMode === 'live') {
    ai = new LiangjieAiAdapter({
      baseUrl: config.liangjieAiBaseUrl,
      model: config.liangjieAiModel!,
      apiKey: config.liangjieAiApiKey!,
      timeoutMs: config.requestTimeoutMs,
      jsonMode: config.liangjieAiJsonMode,
    });
  }

  const contextTokens = new ContextTokenService({
    secret: config.contextSigningSecret,
    ttlSeconds: config.contextTtlSeconds,
  });
  const recommendationService = new RecommendationService({
    getEnvironment: (location, mode) => environmentService.getSnapshot(location, mode),
    ai,
    contextTokens,
  });
  const followUpService = new FollowUpService({ contextTokens, ai });

  return {
    store,
    handlers: createApiHandlers({
      allowedOrigins: config.allowedOrigins,
      getEnvironment: (location, mode) => environmentService.getSnapshot(location, mode),
      createRecommendation: (request) => recommendationService.create(request),
      answerFollowUp: (request) => followUpService.answer(request),
      isReady: async () => !config.databaseRequired || (await store?.isHealthy()) === true,
    }),
  };
}
