import {
  FollowUpResponseSchema,
  RecommendationResponseSchema,
  type EnvironmentSnapshot,
  type FollowUpResponse,
  type RecommendationRequest,
  type RecommendationResponse,
} from '@airme/contracts';

export const DEMO_ENVIRONMENT: EnvironmentSnapshot = {
  location: { name: '高科大第一校區周邊', latitude: 22.754, longitude: 120.335 },
  airQuality: {
    aqi: 118,
    category: 'unhealthy-sensitive',
    primaryPollutant: '細懸浮微粒',
  },
  weather: {
    summary: '決賽示範：多雲，午後短暫陣雨',
    temperatureC: 31,
    rainProbability: 40,
  },
  sources: [
    {
      provider: 'airme-fixture',
      label: 'AirMe 決賽示範資料',
      url: 'https://example.invalid/airme-fixture',
      observedAt: '2026-07-13T08:00:00.000Z',
      fetchedAt: '2026-07-13T08:00:00.000Z',
      stale: false,
    },
  ],
  provenance: 'fixture',
};

export function createDemoRecommendation(
  request: RecommendationRequest,
  requestId = `demo_${Date.now()}`,
): RecommendationResponse {
  const vigorous = /全力|衝刺|劇烈|高強度|比賽/iu.test(request.activityText);
  const high = request.profile.sensitiveConditions.length > 0 || vigorous;
  const riskLevel = high ? 'high' : 'moderate';
  const environment = { ...DEMO_ENVIRONMENT, location: request.location };

  return RecommendationResponseSchema.parse({
    actionCard: {
      riskLevel,
      headline: high
        ? '今天建議改成較短、較低強度的方案。'
        : '可以活動，先確認資料並保留調整空間。',
      recommendedPlan: {
        timing: '下午四點前再確認一次 AQI 與降雨狀況。',
        location: high ? '優先改到有通風管理的室內空間。' : '避開車流密集的道路旁。',
        intensity: high
          ? '避免長時間或劇烈戶外活動，改成 20 分鐘低強度走路。'
          : '保持能正常說話的輕到中等強度。',
        equipment: ['攜帶飲水', '準備可密合口罩備用'],
      },
      why: [
        '決賽示範 AQI 為 118，敏感族群需要減少暴露。',
        request.profile.sensitiveConditions.length > 0
          ? '你的設定包含空品敏感條件。'
          : '活動前仍需要查看資料更新時間。',
        vigorous ? '你描述的是較高強度活動。' : '方案已保留調整空間。',
      ],
      safetyNotes: ['若活動時明顯不適，先停止活動並告知身邊成人。'],
      environment,
      provenance: {
        overall: 'fixture',
        environmentMode: 'fixture',
        aiMode: 'fixture',
        rulesVersion: 'moe-school-aqi-2026.1',
      },
    },
    contextToken: `local-demo-context-${requestId}`,
    requestId,
  });
}

export function createDemoFollowUp(question: string, requestId: string): FollowUpResponse {
  let disposition: FollowUpResponse['disposition'] = 'answered';
  let answer = '依目前示範 AQI 118 與規則底線，改成室內低強度走路較保守；仍請確認通風與現場空氣狀況。';
  if (/胸痛|昏倒|失去意識|無法呼吸|呼吸困難|抽搐/iu.test(question)) {
    disposition = 'urgent-safety';
    answer = '請立即停止活動並到安全處休息，立刻告知身邊成人；若症狀嚴重或持續，請聯絡當地緊急協助。';
  } else if (/診斷|得了|吃什麼藥|用藥|藥物|治療|處方/iu.test(question)) {
    disposition = 'medical-boundary';
    answer = 'AirMe 不能診斷、建議用藥或判定症狀原因。若持續不舒服，請告知家長、老師或醫療專業人員。';
  } else if (!/AQI|空氣|空品|戶外|室內|活動|運動|跑|走|時間|地點|強度|口罩/iu.test(question)) {
    disposition = 'out-of-scope';
    answer = '我只能協助目前活動的空氣品質、活動安全與一般自我保護問題。';
  }

  return FollowUpResponseSchema.parse({
    disposition,
    answer,
    suggestedQuestions: ['多久後再確認 AQI？', '如果改成低強度活動呢？'],
    requestId,
  });
}
