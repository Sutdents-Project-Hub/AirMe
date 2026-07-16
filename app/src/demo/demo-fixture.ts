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

const EMERGENCY_CONDITION_PATTERN =
  /胸(?:口)?(?:很)?痛|胸悶.{0,12}(?:頭暈|暈|喘)|呼吸(?:很)?困難|無法呼吸|不能呼吸|喘不過(?:氣|來)|吸不到氣|快(?:要)?(?:暈倒|昏倒|昏厥)|暈倒|昏倒|昏厥|失去意識|意識不清|嘴唇.{0,4}(?:發紫|變紫)|抽搐/iu;
const DEMO_INJECTION_PATTERN =
  /忽略.{0,12}(?:前面|先前|規則|指令|限制)|system\s*prompt|系統提示|越獄|jailbreak|bypass|不受.{0,4}限制/iu;
const DEMO_MEDICAL_PATTERN =
  /診斷|得了.{0,8}(?:病|氣喘|過敏)|是不是.{0,10}(?:生病|氣喘|過敏|心臟病)|吃什麼藥|用藥|藥物|處方|治療|症狀.{0,8}(?:成因|原因)/iu;
const DEMO_ALLOWED_PATTERN =
  /AQI|空氣品質|空品|空污|污染|戶外|室內|活動|運動|慢跑|跑步|走路|散步|健走|騎車|單車|自行車|羽球|籃球|排球|足球|網球|桌球|棒球|游泳|爬山|登山|健行|球類|體育課|操場|公園|口罩|天氣|下雨|溫度|通勤/iu;

const DEMO_SAFETY_MESSAGES = {
  injection: '這個要求會繞過安全規則，因此無法執行。你可以改問現在適合的活動方式。',
  medical:
    'AirMe 不能診斷、建議用藥或判定症狀原因。若你持續不舒服，請告知家長、老師或醫療專業人員。',
  outOfScope: 'AirMe 只能協助空氣品質、活動安全與一般自我保護問題。',
} as const;

export function createDemoRecommendation(
  request: RecommendationRequest,
  requestId = `demo_${Date.now()}`,
): RecommendationResponse {
  const currentCondition = request.confirmedIntent?.currentCondition ?? '';
  const emergency = EMERGENCY_CONDITION_PATTERN.test(
    `${request.activityText}\n${currentCondition}`,
  );
  const combinedText = `${request.activityText}\n${currentCondition}`;
  const vigorous = /全力|衝刺|劇烈|高強度|比賽/iu.test(request.activityText);
  const high = request.profile.sensitiveConditions.length > 0 || vigorous;
  const riskLevel = emergency ? 'very-high' : high ? 'high' : 'moderate';
  const environment = { ...DEMO_ENVIRONMENT, location: request.location };

  if (emergency) {
    return RecommendationResponseSchema.parse({
      actionCard: {
        riskLevel,
        headline: '立即停止活動並告知身邊成人，不要繼續運動。',
        recommendedPlan: {
          timing: '現在就停止活動，不要等待 AQI 改善或症狀自行消失。',
          location: '到安全處坐下，並立刻告知家長、老師或其他身邊成人。',
          intensity:
            '不要繼續任何活動；若症狀嚴重、持續、惡化或失去意識，請成人立即聯絡當地緊急協助。',
          equipment: ['保持身邊有成人陪同', '不要獨自返回活動'],
        },
        why: [
          '你的描述出現需要優先處理的緊急身體狀況訊號。',
          '當下的人身安全比空品與活動建議更優先。',
        ],
        safetyNotes: [
          'AirMe 不是醫療診斷工具，不會判定症狀原因。',
          '請立即停止活動並告知身邊成人；必要時由成人聯絡當地緊急協助。',
        ],
        environment,
        provenance: {
          overall: 'fixture',
          environmentMode: 'fixture',
          aiMode: 'fixture',
          rulesVersion: 'moe-school-aqi-2023-12-18.v1',
        },
      },
      contextToken: `local-demo-context-${requestId}`,
      requestId,
    });
  }

  if (DEMO_INJECTION_PATTERN.test(combinedText)) {
    throw new Error(DEMO_SAFETY_MESSAGES.injection);
  }
  if (DEMO_MEDICAL_PATTERN.test(combinedText)) {
    throw new Error(DEMO_SAFETY_MESSAGES.medical);
  }
  if (!DEMO_ALLOWED_PATTERN.test(combinedText)) {
    throw new Error(DEMO_SAFETY_MESSAGES.outOfScope);
  }

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
        rulesVersion: 'moe-school-aqi-2023-12-18.v1',
      },
    },
    contextToken: `local-demo-context-${requestId}`,
    requestId,
  });
}

export function createDemoFollowUp(question: string, requestId: string): FollowUpResponse {
  let disposition: FollowUpResponse['disposition'] = 'answered';
  let answer = '依目前示範 AQI 118 與規則底線，改成室內低強度走路較保守；仍請確認通風與現場空氣狀況。';
  if (EMERGENCY_CONDITION_PATTERN.test(question)) {
    disposition = 'urgent-safety';
    answer = '請立即停止活動並到安全處休息，立刻告知身邊成人；若症狀嚴重或持續，請聯絡當地緊急協助。';
  } else if (DEMO_INJECTION_PATTERN.test(question)) {
    disposition = 'out-of-scope';
    answer = DEMO_SAFETY_MESSAGES.injection;
  } else if (DEMO_MEDICAL_PATTERN.test(question)) {
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
