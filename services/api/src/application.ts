import type { AiAdapter } from './adapters/ai/types';
import { AzureOpenAiAdapter } from './adapters/ai/azure-openai';
import { FixtureAiAdapter } from './adapters/ai/fixture';
import { createCwaLoader } from './adapters/environment/cwa';
import { EnvironmentService } from './adapters/environment/service';
import { getEnvironmentFixture } from './adapters/environment/fixture';
import { createMoenvLoader } from './adapters/environment/moenv';
import { readApiConfig } from './config';
import { ContextTokenService } from './domain/context-token';
import { FollowUpService } from './domain/follow-up';
import { RecommendationService } from './domain/recommendation';
import { createApiHandlers } from './http/handlers';

const config = readApiConfig();
const unavailableAirQuality = async () => {
  throw new Error('MOENV_UNAVAILABLE');
};
const unavailableWeather = async () => {
  throw new Error('CWA_UNAVAILABLE');
};

const environmentService = new EnvironmentService({
  loadAirQuality: config.moenvApiKey
    ? createMoenvLoader({ apiKey: config.moenvApiKey, timeoutMs: config.requestTimeoutMs })
    : unavailableAirQuality,
  loadWeather: config.cwaApiKey
    ? createCwaLoader({ apiKey: config.cwaApiKey, timeoutMs: config.requestTimeoutMs })
    : unavailableWeather,
  getFixture: getEnvironmentFixture,
});

let ai: AiAdapter = new FixtureAiAdapter();
if (
  config.aiMode === 'live' &&
  config.azureOpenAiEndpoint &&
  config.azureOpenAiDeployment
) {
  ai = new AzureOpenAiAdapter({
    endpoint: config.azureOpenAiEndpoint,
    deployment: config.azureOpenAiDeployment,
    apiVersion: config.azureOpenAiApiVersion,
    apiKey: config.azureOpenAiApiKey ?? undefined,
    timeoutMs: config.requestTimeoutMs,
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

export const apiHandlers = createApiHandlers({
  allowedOrigins: config.allowedOrigins,
  getEnvironment: (location, mode) => environmentService.getSnapshot(location, mode),
  createRecommendation: (request) => recommendationService.create(request),
  answerFollowUp: (request) => followUpService.answer(request),
});
