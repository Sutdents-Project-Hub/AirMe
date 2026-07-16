import {
  ActionCardDraftSchema,
  ActivityIntentSchema,
  FollowUpDraftSchema,
  type ActionCardDraft,
  type ActivityIntent,
  type FollowUpDraft,
} from '@airme/contracts';

import type { RecommendationContext } from '../../domain/context-token';
import type { ActionCardAiInput, AiAdapter } from './types';

interface LiangjieAiAdapterOptions {
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  jsonMode?: 'auto' | 'enabled' | 'disabled';
  fetcher?: typeof fetch;
}

const SYSTEM_PROMPT = `你是 AirMe 空氣健康小管家的行動方案整理器。
你只能處理空氣品質、天氣、活動安全與一般自我保護。
官方規則底線不可降低，不得自行發明 AQI 門檻。
不得診斷疾病、判定症狀原因、建議用藥或治療。
只輸出一個符合使用者要求欄位的 JSON 物件，不要使用 Markdown。`;

function extractContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const root = payload as Record<string, unknown>;
  const choices = root.choices;
  if (!Array.isArray(choices)) return null;
  const first = choices[0];
  if (typeof first !== 'object' || first === null) return null;
  const message = (first as Record<string, unknown>).message;
  if (typeof message !== 'object' || message === null) return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === 'string' ? content : null;
}

function parseJson<T>(content: string, schema: { parse(value: unknown): T }): T {
  try {
    return schema.parse(JSON.parse(content));
  } catch {
    throw new Error('AI_INVALID_RESPONSE');
  }
}

function coarseActivityLocation(text: string | null | undefined): string | null {
  if (!text) return null;
  if (/操場/u.test(text)) return '操場';
  if (/公園/u.test(text)) return '公園';
  if (/道路|路邊|通勤/u.test(text)) return '道路或通勤路線';
  if (/室內|健身房|體育館/u.test(text)) return '室內活動空間';
  if (/戶外|室外/u.test(text)) return '一般戶外空間';
  return null;
}

export class LiangjieAiAdapter implements AiAdapter {
  readonly mode = 'live' as const;
  private readonly fetcher: typeof fetch;
  private readonly endpoint: string;

  constructor(private readonly options: LiangjieAiAdapterOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.endpoint = `${options.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  }

  async createActionCard(input: ActionCardAiInput): Promise<ActionCardDraft> {
    const confirmed = input.request.confirmedIntent;
    const activity = confirmed
      ? {
          activity: confirmed.activity,
          time: confirmed.time,
          locationType: coarseActivityLocation(confirmed.location),
          intensity: confirmed.intensity,
          durationMinutes: confirmed.durationMinutes,
          currentCondition: confirmed.currentCondition,
          userGoal: confirmed.userGoal,
        }
      : { activitySummary: input.request.activityText.slice(0, 160) };
    const content = await this.complete({
      activity,
      profileContext: {
        ageGroup: input.request.profile.ageGroup,
        sensitiveConditions: input.request.profile.sensitiveConditions,
      },
      selectedArea: input.request.location.administrativeArea ?? '粗略區域已由後端比對',
      environment: {
        airQuality: input.environment.airQuality,
        weather: input.environment.weather,
        provenance: input.environment.provenance,
        sources: input.environment.sources.map((source) => ({
          provider: source.provider,
          observedAt: source.observedAt,
          stale: source.stale,
        })),
      },
      officialRuleFloor: input.rules,
      outputShape: {
        riskLevel: 'low | moderate | high | very-high',
        headline: 'string',
        recommendedPlan: {
          timing: 'string',
          location: 'string',
          intensity: 'string',
          equipment: ['string'],
        },
        why: ['string'],
        safetyNotes: ['string'],
      },
    });
    return parseJson(content, ActionCardDraftSchema);
  }

  async parseActivityIntent(activityText: string): Promise<ActivityIntent> {
    const content = await this.complete({
      activityText,
      instruction: '只擷取使用者明示的內容；不知道就使用 null 或 unspecified，不得猜測。',
      outputShape: {
        activity: 'string',
        time: 'string | null',
        location: 'string | null',
        intensity: 'light | moderate | vigorous | unspecified',
        durationMinutes: 'integer | null',
        currentCondition: 'string | null',
        userGoal: 'string | null',
      },
    });
    return parseJson(content, ActivityIntentSchema);
  }

  async answerFollowUp(input: {
    question: string;
    context: RecommendationContext;
  }): Promise<FollowUpDraft> {
    const content = await this.complete({
      question: input.question,
      context: input.context,
      outputShape: { answer: 'string', suggestedQuestions: ['string'] },
    });
    return parseJson(content, FollowUpDraftSchema);
  }

  private async complete(input: Record<string, unknown>): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const jsonMode = this.options.jsonMode ?? 'auto';
    const body: Record<string, unknown> = {
      model: this.options.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.2,
    };
    if (jsonMode !== 'disabled') {
      body.response_format = { type: 'json_object' };
    }

    let response: Response;
    try {
      response = await this.request(body, controller.signal);
      if (
        !response.ok &&
        jsonMode === 'auto' &&
        body.response_format &&
        [400, 404, 422].includes(response.status)
      ) {
        delete body.response_format;
        response = await this.request(body, controller.signal);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('AI_TIMEOUT');
      throw new Error('AI_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error('AI_UNAVAILABLE');
    const payload = (await response.json().catch(() => null)) as unknown;
    const content = extractContent(payload);
    if (!content) throw new Error('AI_INVALID_RESPONSE');
    return content;
  }

  private async request(body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
    return this.fetcher(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.options.apiKey}`,
      },
      signal,
      body: JSON.stringify(body),
    });
  }
}
