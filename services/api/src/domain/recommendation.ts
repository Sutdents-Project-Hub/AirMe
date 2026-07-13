import {
  ActionCardDraftSchema,
  RecommendationResponseSchema,
  type ActionCardDraft,
  type EnvironmentSnapshot,
  type RecommendationRequest,
  type RecommendationResponse,
} from '@airme/contracts';

import { createFixtureActionCard } from '../adapters/ai/fixture';
import type { AiAdapter } from '../adapters/ai/types';
import type { ContextTokenService } from './context-token';
import { evaluateActivityRules, enforceMinimumRisk, type ActivityIntensity } from './rules';
import { classifyUserText, containsUnsafeMedicalClaim } from './safety';

interface RecommendationServiceOptions {
  getEnvironment: (
    location: RecommendationRequest['location'],
    mode: RecommendationRequest['dataMode'],
  ) => Promise<EnvironmentSnapshot>;
  ai: AiAdapter;
  contextTokens: ContextTokenService;
  requestId?: () => string;
}

function inferIntensity(text: string): ActivityIntensity {
  if (/全力|衝刺|劇烈|高強度|比賽/iu.test(text)) return 'vigorous';
  if (/跑|球|騎|單車|中強度/iu.test(text)) return 'moderate';
  return 'light';
}

function hasUnsafeClaim(draft: ActionCardDraft): boolean {
  return [
    draft.headline,
    draft.recommendedPlan.timing,
    draft.recommendedPlan.location,
    draft.recommendedPlan.intensity,
    ...draft.why,
    ...draft.safetyNotes,
  ].some(containsUnsafeMedicalClaim);
}

export class RecommendationService {
  constructor(private readonly options: RecommendationServiceOptions) {}

  async create(request: RecommendationRequest): Promise<RecommendationResponse> {
    const disposition = classifyUserText(request.activityText);
    if (disposition !== 'allowed') throw new Error(disposition.toUpperCase().replaceAll('-', '_'));

    const environment = await this.options.getEnvironment(request.location, request.dataMode);
    const rules = evaluateActivityRules({
      aqi: environment.airQuality.aqi,
      activityIntensity: inferIntensity(request.activityText),
      ageGroup: request.profile.ageGroup,
      sensitiveConditions: request.profile.sensitiveConditions,
      stale: environment.sources.some((source) => source.stale),
    });
    const input = { request, environment, rules };

    let aiMode: 'live' | 'fixture' = this.options.ai.mode;
    let draft: ActionCardDraft;
    try {
      draft = ActionCardDraftSchema.parse(await this.options.ai.createActionCard(input));
      if (hasUnsafeClaim(draft)) throw new Error('AI_UNSAFE_OUTPUT');
    } catch {
      aiMode = 'fixture';
      draft = createFixtureActionCard(input);
    }

    const restrictionText = rules.restrictions.join('；');
    const intensity =
      restrictionText && !draft.recommendedPlan.intensity.includes(restrictionText)
        ? `${draft.recommendedPlan.intensity} 規則底線：${restrictionText}。`
        : draft.recommendedPlan.intensity;
    const overall =
      environment.provenance === 'fixture'
        ? 'fixture'
        : environment.provenance === 'partial' || aiMode === 'fixture'
          ? 'partial'
          : 'live';
    const requestId = (this.options.requestId ?? (() => crypto.randomUUID()))();
    const contextToken = this.options.contextTokens.sign({
      activitySummary: request.activityText.slice(0, 160),
      locationName: request.location.name,
      environment: {
        aqi: environment.airQuality.aqi,
        category: environment.airQuality.category,
        weatherSummary: environment.weather.summary,
      },
      minimumRiskLevel: rules.minimumRiskLevel,
      restrictions: rules.restrictions,
    });

    return RecommendationResponseSchema.parse({
      actionCard: {
        ...draft,
        riskLevel: enforceMinimumRisk(draft.riskLevel, rules.minimumRiskLevel),
        recommendedPlan: { ...draft.recommendedPlan, intensity },
        environment,
        provenance: {
          overall,
          environmentMode: environment.provenance,
          aiMode,
          rulesVersion: rules.rulesVersion,
        },
      },
      contextToken,
      requestId,
    });
  }
}
