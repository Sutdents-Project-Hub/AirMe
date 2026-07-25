import { describe, expect, it } from 'vitest';

import {
  ActivityIntentResponseSchema,
  ApiErrorSchema,
  EnvironmentRequestSchema,
  EnvironmentSnapshotSchema,
  FeedbackSchema,
  FollowUpRequestSchema,
  ProfileUnderstandingRequestSchema,
  ProfileUnderstandingResponseSchema,
  RecommendationRequestSchema,
  RecommendationResponseSchema,
} from './schemas.js';

describe('activity intent contract', () => {
  it('keeps clarification to a single explicit question', () => {
    expect(
      ActivityIntentResponseSchema.safeParse({
        intent: {
          activity: '跑步',
          time: '下午四點',
          location: '操場',
          intensity: 'vigorous',
          durationMinutes: null,
          currentCondition: '鼻子有點塞',
          userGoal: '完成 1600 公尺',
        },
        missingField: 'duration',
        clarificationQuestion: '這次預計活動多久？',
        provenance: { aiMode: 'fixture' },
      }).success,
    ).toBe(true);
  });
});

describe('profile understanding contract', () => {
  it('allows explicitly unknown onboarding fields without accepting raw extra data', () => {
    expect(
      ProfileUnderstandingRequestSchema.safeParse({
        description: '我會在放學後運動。',
        locale: 'zh-TW',
        dataMode: 'live',
      }).success,
    ).toBe(true);
    expect(
      ProfileUnderstandingResponseSchema.safeParse({
        profile: {
          ageGroup: null,
          sensitiveConditions: [],
          commuteMode: null,
          commonActivities: ['run'],
        },
        commonAreaHint: null,
        missing: ['ageGroup', 'commuteMode', 'location'],
        provenance: { aiMode: 'live' },
      }).success,
    ).toBe(true);
    expect(
      ProfileUnderstandingRequestSchema.safeParse({
        description: '我會在放學後運動。',
        locale: 'zh-TW',
        rawAddress: '不應接受',
      }).success,
    ).toBe(false);
  });
});

const environment = {
  location: { name: '高雄市前鎮區', latitude: 22.6, longitude: 120.31 },
  airQuality: {
    aqi: 82,
    category: 'moderate',
    primaryPollutant: '細懸浮微粒',
  },
  weather: {
    summary: '多雲，午後短暫陣雨',
    temperatureC: 30,
    rainProbability: 40,
  },
  sources: [
    {
      provider: 'moenv',
      label: '環境部空氣品質監測網',
      url: 'https://data.moenv.gov.tw/',
      observedAt: '2026-07-13T02:00:00.000Z',
      fetchedAt: '2026-07-13T02:03:00.000Z',
      stale: false,
    },
  ],
  provenance: 'live',
} as const;

describe('RecommendationRequestSchema', () => {
  it('accepts the minimum context needed for a recommendation', () => {
    const result = RecommendationRequestSchema.safeParse({
      activityText: '下午四點想在學校操場慢跑 30 分鐘',
      profile: {
        ageGroup: 'teen',
        sensitiveConditions: ['respiratory-sensitive'],
        commuteMode: 'walk',
      },
      location: environment.location,
      locale: 'zh-TW',
      timeZone: 'Asia/Taipei',
      dataMode: 'fixture',
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown personal fields', () => {
    const result = RecommendationRequestSchema.safeParse({
      activityText: '想散步',
      profile: {
        ageGroup: 'teen',
        sensitiveConditions: [],
        commuteMode: 'walk',
        studentId: 'C123456789',
      },
      location: environment.location,
      locale: 'zh-TW',
      timeZone: 'Asia/Taipei',
      dataMode: 'fixture',
    });

    expect(result.success).toBe(false);
  });

  it('rejects coordinates more precise than three decimals', () => {
    const result = RecommendationRequestSchema.safeParse({
      activityText: '想散步',
      profile: {
        ageGroup: 'teen',
        sensitiveConditions: [],
        commuteMode: 'walk',
      },
      location: { name: '目前位置', latitude: 22.61234, longitude: 120.30123 },
      locale: 'zh-TW',
      timeZone: 'Asia/Taipei',
      dataMode: 'live',
    });

    expect(result.success).toBe(false);
  });

  it('rejects coordinates outside the Taiwan service area', () => {
    expect(
      RecommendationRequestSchema.safeParse({
        activityText: '想散步',
        profile: {
          ageGroup: 'teen',
          sensitiveConditions: [],
          commuteMode: 'walk',
        },
        location: { name: '東京', latitude: 35.681, longitude: 139.767 },
        locale: 'zh-TW',
        timeZone: 'Asia/Taipei',
        dataMode: 'live',
      }).success,
    ).toBe(false);
  });
});

describe('environment and response contracts', () => {
  it('accepts only the coarse location and requested data mode', () => {
    expect(
      EnvironmentRequestSchema.safeParse({
        location: {
          name: '高科大第一校區周邊',
          administrativeArea: '高雄市',
          latitude: 22.754,
          longitude: 120.335,
        },
        dataMode: 'live',
      }).success,
    ).toBe(true);
    expect(
      EnvironmentRequestSchema.safeParse({
        location: environment.location,
        dataMode: 'live',
        studentId: 'C123456789',
      }).success,
    ).toBe(false);
  });

  it('requires source provenance and update timestamps', () => {
    expect(EnvironmentSnapshotSchema.safeParse(environment).success).toBe(true);
    expect(
      EnvironmentSnapshotSchema.safeParse({ ...environment, sources: [] }).success,
    ).toBe(false);
  });

  it('accepts a complete action card response', () => {
    const result = RecommendationResponseSchema.safeParse({
      actionCard: {
        riskLevel: 'moderate',
        headline: '可以活動，但建議降低強度並避開車流。',
        recommendedPlan: {
          timing: '下午四點後先確認最新 AQI。',
          location: '選擇離道路較遠的操場內圈。',
          intensity: '以可以正常說話的速度慢跑。',
          equipment: ['補充水分', '攜帶可密合口罩備用'],
        },
        why: ['目前 AQI 為普通。', '你設定了呼吸道敏感條件。'],
        safetyNotes: ['若出現明顯不適，停止活動並告知身邊成人。'],
        environment,
        provenance: {
          overall: 'fixture',
          environmentMode: 'fixture',
          aiMode: 'fixture',
          rulesVersion: 'moe-school-aqi-2023-12-18.v1',
        },
      },
      contextToken: 'signed-context-token',
      requestId: 'req_123',
    });

    expect(result.success).toBe(true);
  });
});

describe('follow-up and error contracts', () => {
  it('limits a follow-up to a short question and signed context', () => {
    expect(
      FollowUpRequestSchema.safeParse({
        question: '如果改成室內走路會比較適合嗎？',
        contextToken: 'signed-context-token',
      }).success,
    ).toBe(true);
    expect(
      FollowUpRequestSchema.safeParse({
        question: 'a'.repeat(501),
        contextToken: 'signed-context-token',
      }).success,
    ).toBe(false);
  });

  it('accepts only stable public error fields', () => {
    expect(
      ApiErrorSchema.safeParse({
        error: {
          code: 'INVALID_REQUEST',
          message: '請檢查輸入內容。',
          retryable: false,
          requestId: 'req_123',
        },
      }).success,
    ).toBe(true);
    expect(
      ApiErrorSchema.safeParse({
        error: {
          code: 'INVALID_REQUEST',
          message: '請檢查輸入內容。',
          retryable: false,
          requestId: 'req_123',
          stack: 'secret stack',
        },
      }).success,
    ).toBe(false);
  });
});

describe('five-second feedback contract', () => {
  it('records activity completion, discomfort and whether the recommendation helped', () => {
    expect(
      FeedbackSchema.safeParse({
        id: 'feedback_1',
        recommendationId: 'req_1',
        completed: true,
        discomfort: 'mild',
        helpful: 'yes',
        note: '下次縮短活動時間',
        createdAt: '2026-07-16T05:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('does not accept the superseded general-feeling field as new feedback', () => {
    expect(
      FeedbackSchema.safeParse({
        id: 'feedback_1',
        recommendationId: 'req_1',
        completed: true,
        feeling: 'same',
        createdAt: '2026-07-16T05:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});
