import type { ActionCardDraft, FollowUpDraft } from '@airme/contracts';

import type { RecommendationContext } from '../../domain/context-token';
import { parseActivityIntent } from '../../domain/activity-intent';

import type { ActionCardAiInput, AiAdapter } from './types';

export function createFixtureActionCard(input: ActionCardAiInput): ActionCardDraft {
  const restriction =
    input.rules.restrictions.length > 0
      ? input.rules.restrictions.join('；')
      : '依當下感受調整強度';
  const highRisk = input.rules.minimumRiskLevel === 'high' || input.rules.minimumRiskLevel === 'very-high';

  return {
    riskLevel: input.rules.minimumRiskLevel,
    headline: highRisk
      ? '今天建議改成較短、較低強度的方案。'
      : '可以活動，先確認更新資料並保留調整空間。',
    recommendedPlan: {
      timing: '出發前再次確認 AirMe 顯示的資料更新時間。',
      location: highRisk ? '優先選擇有通風管理的室內空間。' : '避開車流密集與污染源附近。',
      intensity: `規則底線：${restriction}。`,
      equipment: ['攜帶飲水', '準備可密合口罩備用'],
    },
    why: [
      `目前 AQI 為 ${input.environment.airQuality.aqi}（${input.environment.airQuality.category}）。`,
      input.request.profile.sensitiveConditions.length > 0
        ? '你的個人設定包含空品敏感條件。'
        : '建議仍依當下感受保留調整空間。',
    ],
    safetyNotes: ['若活動時明顯不適，先停止活動並告知身邊成人。'],
  };
}

export class FixtureAiAdapter implements AiAdapter {
  readonly mode = 'fixture' as const;

  async createActionCard(input: ActionCardAiInput): Promise<ActionCardDraft> {
    return createFixtureActionCard(input);
  }

  async parseActivityIntent(activityText: string) {
    return parseActivityIntent(activityText);
  }

  async answerFollowUp(input: {
    question: string;
    context: RecommendationContext;
  }): Promise<FollowUpDraft> {
    return {
      answer: `依目前 AQI ${input.context.environment.aqi} 與規則底線，${input.context.restrictions.join('；') || '請依身體感受調整活動'}。若改到室內，仍請確認通風與現場空氣狀況。`,
      suggestedQuestions: ['多久後再確認 AQI？', '如果改成低強度活動呢？'],
    };
  }
}
