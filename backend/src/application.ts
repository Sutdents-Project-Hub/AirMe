import type { AiAdapter } from './adapters/ai/types';
import { FixtureAiAdapter } from './adapters/ai/fixture';
import { LiangjieAiAdapter } from './adapters/ai/liangjie';
import { createCwaLoader } from './adapters/environment/cwa';
import { withFallback } from './adapters/environment/fallback';
import {
  createOpenMeteoAirQualityLoader,
  createOpenMeteoWeatherLoader,
} from './adapters/environment/open-meteo';
import { EnvironmentService } from './adapters/environment/service';
import { getEnvironmentFixture } from './adapters/environment/fixture';
import { createMoenvLoader } from './adapters/environment/moenv';
import { createPhotonGeocodingAdapter } from './adapters/geocoding/photon';
import { createValhallaRoutingAdapter } from './adapters/routing/valhalla';
import { readApiConfig } from './config';
import { PostgresStore } from './database/postgres-store';
import type { OperationalStore } from './database/types';
import { ContextTokenService } from './domain/context-token';
import { ActivityIntentService } from './domain/activity-intent';
import { AccountAuthService } from './domain/account-auth';
import { AccountCloudSyncService } from './domain/account-cloud-sync';
import { createGeocodingService } from './domain/geocoding/service';
import { FollowUpService } from './domain/follow-up';
import { RecommendationService } from './domain/recommendation';
import { createRoutingService } from './domain/routing/service';
import { createApiHandlers } from './http/handlers';
import { RequestGate } from './lib/request-gate';

const unavailableAirQuality = async () => {
  throw new Error('MOENV_UNAVAILABLE');
};
const unavailableWeather = async () => {
  throw new Error('CWA_UNAVAILABLE');
};

export interface AirMeApplication {
  handlers: ReturnType<typeof createApiHandlers>;
  store: OperationalStore | null;
  allowedOrigins: string[];
}

export function createApplication(): AirMeApplication {
  const config = readApiConfig();
  if (config.databaseRequired && !config.databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
  if (config.aiMode === 'live' && (!config.liangjieAiModel || !config.liangjieAiApiKey)) {
    throw new Error('LIANGJIE_AI_CONFIG_REQUIRED');
  }
  const store = config.databaseUrl ? new PostgresStore(config.databaseUrl) : null;
  const fallbackAirQuality = config.openMeteoFallbackEnabled
    ? createOpenMeteoAirQualityLoader({ timeoutMs: config.requestTimeoutMs })
    : unavailableAirQuality;
  const fallbackWeather = config.openMeteoFallbackEnabled
    ? createOpenMeteoWeatherLoader({ timeoutMs: config.requestTimeoutMs })
    : unavailableWeather;
  const officialAirQuality = config.moenvApiKey
    ? createMoenvLoader({ apiKey: config.moenvApiKey, timeoutMs: config.requestTimeoutMs })
    : null;
  const officialWeather = config.cwaApiKey
    ? createCwaLoader({ apiKey: config.cwaApiKey, timeoutMs: config.requestTimeoutMs })
    : null;
  const environmentService = new EnvironmentService({
    loadAirQuality: officialAirQuality
      ? config.openMeteoFallbackEnabled
        ? withFallback(officialAirQuality, fallbackAirQuality)
        : officialAirQuality
      : fallbackAirQuality,
    loadWeather: officialWeather
      ? config.openMeteoFallbackEnabled
        ? withFallback(officialWeather, fallbackWeather)
        : officialWeather
      : fallbackWeather,
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
  const activityIntentService = new ActivityIntentService(ai);
  const accountAuthService = new AccountAuthService({
    store,
    sessionHmacSecret: config.authSessionHmacSecret,
    sessionTtlSeconds: config.authSessionTtlSeconds,
  });
  const accountCloudSyncService =
    store && config.cloudSyncEncryptionKey
      ? new AccountCloudSyncService({
          auth: accountAuthService,
          store,
          encryptionKey: config.cloudSyncEncryptionKey,
        })
      : null;
  const routingService = createRoutingService({
    live: createValhallaRoutingAdapter({
      endpoint: config.valhallaRouteUrl,
      timeoutMs: config.requestTimeoutMs,
    }),
  });
  const geocodingService = createGeocodingService({
    live: createPhotonGeocodingAdapter({
      endpoint: config.photonSearchUrl,
      timeoutMs: config.requestTimeoutMs,
    }),
  });
  const aiGate = new RequestGate({
    maxRequests: config.aiMaxRequestsPerMinute,
    windowMs: 60_000,
    maxConcurrent: config.aiMaxConcurrency,
  });
  const environmentGate = new RequestGate({
    maxRequests: config.environmentMaxRequestsPerMinute,
    windowMs: 60_000,
    maxConcurrent: config.environmentMaxConcurrency,
  });
  const routingGate = new RequestGate({
    maxRequests: config.routingMaxRequestsPerMinute,
    windowMs: 60_000,
    maxConcurrent: config.routingMaxConcurrency,
  });

  return {
    store,
    allowedOrigins: config.allowedOrigins,
    handlers: createApiHandlers({
      allowedOrigins: config.allowedOrigins,
      getEnvironment: (location, mode) =>
        environmentGate.run(() => environmentService.getSnapshot(location, mode)),
      understandActivity: (request) => aiGate.run(() => activityIntentService.understand(request)),
      createRecommendation: (request) => aiGate.run(() => recommendationService.create(request)),
      answerFollowUp: (request) => aiGate.run(() => followUpService.answer(request)),
      auth: accountAuthService,
      cloudState: accountCloudSyncService ?? undefined,
      getRoute: (request) => routingGate.run(() => routingService.getRoute(request)),
      searchPlaces: (request) => routingGate.run(() => geocodingService.search(request)),
      isReady: async () => !config.databaseRequired || (await store?.isHealthy()) === true,
    }),
  };
}
