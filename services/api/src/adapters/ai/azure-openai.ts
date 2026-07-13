import {
  ActionCardDraftSchema,
  FollowUpDraftSchema,
  type ActionCardDraft,
  type FollowUpDraft,
} from '@airme/contracts';
import { DefaultAzureCredential } from '@azure/identity';
import { z } from 'zod';

import type { ActionCardAiInput, AiAdapter } from './types';
import type { RecommendationContext } from '../../domain/context-token';

interface CredentialLike {
  getToken(scope: string): Promise<{ token: string } | null>;
}

interface AzureOpenAiAdapterOptions {
  endpoint: string;
  deployment: string;
  apiVersion: string;
  apiKey?: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
  credential?: CredentialLike;
}

const SYSTEM_PROMPT = `你是 AirMe 空氣健康小管家的行動方案整理器。
你只能處理空氣品質、天氣、活動安全與一般自我保護。
官方規則底線不可降低，不得自行發明 AQI 門檻。
不得診斷疾病、判定症狀原因、建議用藥或治療。
請以繁體中文輸出精簡、具體且可執行的 JSON。`;

function extractOutputText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === 'string') return root.output_text;
  if (!Array.isArray(root.output)) return null;
  for (const item of root.output) {
    if (typeof item !== 'object' || item === null) continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (typeof part === 'object' && part !== null) {
        const text = (part as Record<string, unknown>).text;
        if (typeof text === 'string') return text;
      }
    }
  }
  return null;
}

export class AzureOpenAiAdapter implements AiAdapter {
  readonly mode = 'live' as const;
  private readonly fetcher: typeof fetch;
  private readonly credential: CredentialLike;

  constructor(private readonly options: AzureOpenAiAdapterOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.credential = options.credential ?? new DefaultAzureCredential();
  }

  async createActionCard(input: ActionCardAiInput): Promise<ActionCardDraft> {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (this.options.apiKey) {
      headers.set('api-key', this.options.apiKey);
    } else {
      const token = await this.credential.getToken(
        'https://cognitiveservices.azure.com/.default',
      );
      if (!token) throw new Error('AI_AUTH_UNAVAILABLE');
      headers.set('authorization', `Bearer ${token.token}`);
    }

    const endpoint = `${this.options.endpoint.replace(/\/$/, '')}/openai/v1/responses?api-version=${encodeURIComponent(this.options.apiVersion)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.deployment,
          input: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify({
                activityText: input.request.activityText,
                profile: input.request.profile,
                location: input.request.location,
                environment: input.environment,
                officialRuleFloor: input.rules,
              }),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'airme_action_card',
              strict: true,
              schema: z.toJSONSchema(ActionCardDraftSchema),
            },
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('AI_TIMEOUT');
      throw new Error('AI_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error('AI_UNAVAILABLE');
    let payload: unknown;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      throw new Error('AI_INVALID_RESPONSE');
    }
    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('AI_INVALID_RESPONSE');

    try {
      return ActionCardDraftSchema.parse(JSON.parse(outputText));
    } catch {
      throw new Error('AI_INVALID_RESPONSE');
    }
  }

  async answerFollowUp(input: {
    question: string;
    context: RecommendationContext;
  }): Promise<FollowUpDraft> {
    const headers = await this.createHeaders();
    const endpoint = `${this.options.endpoint.replace(/\/$/, '')}/openai/v1/responses?api-version=${encodeURIComponent(this.options.apiVersion)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.deployment,
          input: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify({ question: input.question, context: input.context }),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'airme_follow_up',
              strict: true,
              schema: z.toJSONSchema(FollowUpDraftSchema),
            },
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('AI_TIMEOUT');
      throw new Error('AI_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error('AI_UNAVAILABLE');
    const payload = (await response.json().catch(() => null)) as unknown;
    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('AI_INVALID_RESPONSE');
    try {
      return FollowUpDraftSchema.parse(JSON.parse(outputText));
    } catch {
      throw new Error('AI_INVALID_RESPONSE');
    }
  }

  private async createHeaders(): Promise<Headers> {
    const headers = new Headers({ 'content-type': 'application/json' });
    if (this.options.apiKey) {
      headers.set('api-key', this.options.apiKey);
      return headers;
    }
    const token = await this.credential.getToken('https://cognitiveservices.azure.com/.default');
    if (!token) throw new Error('AI_AUTH_UNAVAILABLE');
    headers.set('authorization', `Bearer ${token.token}`);
    return headers;
  }
}
