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
import {
  classifyUserText,
  containsUngroundedPersonalClaim,
  containsUnsafeMedicalClaim,
  contradictsSafetyFloor,
} from './safety';

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

function confirmedIntensity(request: RecommendationRequest): ActivityIntensity {
  const value = request.confirmedIntent?.intensity;
  return value === 'vigorous' || value === 'moderate' || value === 'light'
    ? value
    : inferIntensity(request.activityText);
}

function draftTexts(draft: ActionCardDraft): string[] {
  return [
    draft.headline,
    draft.recommendedPlan.timing,
    draft.recommendedPlan.location,
    draft.recommendedPlan.intensity,
    ...draft.recommendedPlan.equipment,
    ...draft.why,
    ...draft.safetyNotes,
  ];
}

function hasUnsafeClaim(draft: ActionCardDraft): boolean {
  return draftTexts(draft).some(containsUnsafeMedicalClaim);
}

function contradictsRuleFloor(draft: ActionCardDraft, rules: ReturnType<typeof evaluateActivityRules>): boolean {
  const recommendation = draftTexts(draft).join(' ');
  return contradictsSafetyFloor(
    recommendation,
    rules.minimumRiskLevel,
    rules.restrictions,
  );
}

function containsUngroundedReason(draft: ActionCardDraft): boolean {
  return draftTexts(draft).some(containsUngroundedPersonalClaim);
}

function groundedReasons(
  request: RecommendationRequest,
  environment: EnvironmentSnapshot,
  intensity: ActivityIntensity,
): string[] {
  const reasons = [
    `本次使用的官方／標示資料為 AQI ${environment.airQuality.aqi}（${environment.airQuality.category}）。`,
    `已確認的活動為${request.confirmedIntent?.activity ?? '使用者輸入的活動'}，強度為${intensity === 'vigorous' ? '高強度' : intensity === 'moderate' ? '中強度' : '低強度'}。`,
  ];
  if (request.profile.sensitiveConditions.length > 0) {
    reasons.push('你本次明示的個人設定包含空品敏感條件。');
  } else if (environment.sources.some((source) => source.stale)) {
    reasons.push('環境資料已超過更新時效，因此採用較保守的規則底線。');
  }
  return reasons.slice(0, 3);
}

function isFutureActivity(request: RecommendationRequest): boolean {
  const time = request.confirmedIntent?.time ?? request.activityText;
  return /明天|後天|下週|下星期|週[一二三四五六日天]|星期[一二三四五六日天]/u.test(time);
}

function requiresIndoorLocation(rules: ReturnType<typeof evaluateActivityRules>): boolean {
  return rules.restrictions.some((restriction) =>
    /留在室內|停止戶外|改採室內/u.test(restriction),
  );
}

function namedAdministrativeArea(text: string | null | undefined): string | null {
  if (!text) return null;
  const aliases: [RegExp, string][] = [
    [/基隆(?:市)?/u, '基隆市'],
    [/(?:臺|台)北(?:市)?/u, '臺北市'],
    [/新北(?:市)?/u, '新北市'],
    [/桃園(?:市)?/u, '桃園市'],
    [/新竹縣/u, '新竹縣'],
    [/新竹(?:市)?/u, '新竹市'],
    [/苗栗(?:縣)?/u, '苗栗縣'],
    [/(?:臺|台)中(?:市)?/u, '臺中市'],
    [/彰化(?:縣)?/u, '彰化縣'],
    [/南投(?:縣)?/u, '南投縣'],
    [/雲林(?:縣)?/u, '雲林縣'],
    [/嘉義縣/u, '嘉義縣'],
    [/嘉義(?:市)?/u, '嘉義市'],
    [/(?:臺|台)南(?:市)?/u, '臺南市'],
    [/高雄(?:市)?/u, '高雄市'],
    [/屏東(?:縣)?/u, '屏東縣'],
    [/宜蘭(?:縣)?/u, '宜蘭縣'],
    [/花蓮(?:縣)?/u, '花蓮縣'],
    [/(?:臺|台)東(?:縣)?/u, '臺東縣'],
    [/澎湖(?:縣)?/u, '澎湖縣'],
    [/金門(?:縣)?/u, '金門縣'],
    [/連江(?:縣)?/u, '連江縣'],
  ];
  return aliases.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function hasLocationMismatch(request: RecommendationRequest): boolean {
  const intentArea = namedAdministrativeArea(request.confirmedIntent?.location);
  const selectedArea =
    request.location.administrativeArea ?? namedAdministrativeArea(request.location.name);
  return Boolean(intentArea && selectedArea && intentArea !== selectedArea);
}

function contextActivitySummary(request: RecommendationRequest): string {
  const intent = request.confirmedIntent;
  if (!intent) return '使用者已確認的空品相關活動';
  return [
    intent.activity,
    intent.time,
    intent.intensity === 'unspecified' ? null : `${intent.intensity} 強度`,
    intent.durationMinutes ? `${intent.durationMinutes} 分鐘` : null,
  ]
    .filter(Boolean)
    .join('；')
    .slice(0, 160);
}

export class RecommendationService {
  constructor(private readonly options: RecommendationServiceOptions) {}

  async create(request: RecommendationRequest): Promise<RecommendationResponse> {
    const disposition = classifyUserText(
      [request.activityText, request.confirmedIntent?.currentCondition].filter(Boolean).join('；'),
    );
    if (disposition !== 'allowed') throw new Error(disposition.toUpperCase().replaceAll('-', '_'));
    if (hasLocationMismatch(request)) throw new Error('ENVIRONMENT_LOCATION_MISMATCH');

    const environment = await this.options.getEnvironment(request.location, request.dataMode);
    const rules = evaluateActivityRules({
      aqi: environment.airQuality.aqi,
      activityIntensity: confirmedIntensity(request),
      ageGroup: request.profile.ageGroup,
      sensitiveConditions: request.profile.sensitiveConditions,
      stale: environment.sources.some((source) => source.stale),
    });
    const input = { request, environment, rules };

    let aiMode: 'live' | 'fixture' = this.options.ai.mode;
    let draft: ActionCardDraft;
    try {
      draft = ActionCardDraftSchema.parse(await this.options.ai.createActionCard(input));
      if (hasUnsafeClaim(draft) || contradictsRuleFloor(draft, rules) || containsUngroundedReason(draft)) {
        throw new Error('AI_UNSAFE_OUTPUT');
      }
    } catch {
      aiMode = 'fixture';
      draft = createFixtureActionCard(input);
    }

    const restrictionText = rules.restrictions.join('；');
    const activityIntensity = confirmedIntensity(request);
    const intensity = restrictionText
      ? `規則底線：${restrictionText}。`
      : draft.recommendedPlan.intensity;
    const location = requiresIndoorLocation(rules)
      ? rules.minimumRiskLevel === 'very-high'
        ? '停止戶外活動，改到安全的室內空間。'
        : '留在室內，優先選擇有空氣管理的低強度活動空間。'
      : draft.recommendedPlan.location;
    const futureActivity = isFutureActivity(request);
    const timing = futureActivity
      ? '這張卡使用目前／最近時段的環境資料；請在活動前重新取得該時段的官方資料。'
      : draft.recommendedPlan.timing;
    const safetyNotes = [
      ...draft.safetyNotes,
      ...(futureActivity ? ['活動時間尚未到，現在的 AQI 不能當作該時段預報。'] : []),
      '若活動時明顯不適，請先停止活動並告知身邊成人。',
    ].filter((item, index, items) => items.indexOf(item) === index).slice(0, 4);
    const overall =
      environment.provenance === 'fixture'
        ? 'fixture'
        : environment.provenance === 'partial' || aiMode === 'fixture' || futureActivity
          ? 'partial'
          : 'live';
    const requestId = (this.options.requestId ?? (() => crypto.randomUUID()))();
    const contextToken = this.options.contextTokens.sign({
      activitySummary: contextActivitySummary(request),
      locationName: request.location.administrativeArea ?? 'AirMe 粗略區域',
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
        recommendedPlan: { ...draft.recommendedPlan, timing, location, intensity },
        why: groundedReasons(request, environment, activityIntensity),
        safetyNotes,
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
