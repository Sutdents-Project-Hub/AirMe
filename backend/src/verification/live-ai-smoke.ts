import { LiangjieAiAdapter } from '../adapters/ai/liangjie';

const apiKey = process.env.LIANGJIE_AI_API_KEY?.trim();
const model = process.env.LIANGJIE_AI_MODEL?.trim();
const baseUrl = (process.env.LIANGJIE_AI_BASE_URL?.trim() || 'https://liangjiewis.com').replace(/\/$/, '');
const timeoutMs = Number(process.env.AI_LIVE_SMOKE_TIMEOUT_MS) || 20_000;

function publicFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('AI_TIMEOUT')) return 'TIMEOUT';
  if (message.includes('AI_RATE_LIMIT')) return 'RATE_LIMITED';
  if (message.includes('AI_INVALID_RESPONSE')) return 'INVALID_RESPONSE';
  return 'PROVIDER_UNAVAILABLE';
}

async function main(): Promise<void> {
  if (!apiKey || !model) {
    process.stderr.write('缺少 LIANGJIE_AI_API_KEY 或 LIANGJIE_AI_MODEL；未發出任何外部請求。\n');
    process.exitCode = 2;
    return;
  }

  const ai = new LiangjieAiAdapter({
    baseUrl,
    model,
    apiKey,
    timeoutMs,
    jsonMode: 'auto',
  });
  const environment = {
    location: { name: '測試區域', administrativeArea: '臺北市' as const, latitude: 25.033, longitude: 121.565 },
    airQuality: { aqi: 82, category: 'moderate' as const, primaryPollutant: '細懸浮微粒' },
    weather: { summary: '多雲', temperatureC: 30, rainProbability: 20 },
    sources: [
      {
        provider: 'airme-fixture' as const,
        label: '測試用固定環境資料',
        url: 'https://example.invalid/airme-fixture',
        observedAt: '2026-07-22T02:00:00.000Z',
        fetchedAt: '2026-07-22T02:00:00.000Z',
        stale: false,
      },
    ],
    provenance: 'fixture' as const,
  };

  try {
    const intent = await ai.parseActivityIntent('今天傍晚想在公園快走 20 分鐘');
    const card = await ai.createActionCard({
      request: {
        activityText: '今天傍晚想在公園快走 20 分鐘',
        profile: { ageGroup: 'adult', sensitiveConditions: [], commuteMode: 'walk' },
        location: environment.location,
        locale: 'zh-TW',
        timeZone: 'Asia/Taipei',
        dataMode: 'live',
        confirmedIntent: intent,
      },
      environment,
      rules: {
        minimumRiskLevel: 'moderate',
        restrictions: ['敏感族群應減少長時間戶外暴露'],
        reasonCodes: ['AQI_2'],
        rulesVersion: 'smoke-test.v1',
      },
    });
    const followUp = await ai.answerFollowUp({
      question: '改成室內走路可以嗎？',
      context: {
        activitySummary: '公園快走 20 分鐘',
        locationName: '測試區域',
        environment: { aqi: 82, category: 'moderate', weatherSummary: '多雲' },
        minimumRiskLevel: 'moderate',
        restrictions: ['敏感族群應減少長時間戶外暴露'],
      },
    });
    process.stdout.write(
      `${JSON.stringify({
        status: 'ok',
        model,
        checks: {
          activityIntent: Boolean(intent.activity),
          actionCard: Boolean(card.headline),
          followUp: Boolean(followUp.answer),
        },
      })}\n`,
    );
  } catch (error) {
    process.stderr.write(`Live AI smoke test failed: ${publicFailureCode(error)}\n`);
    process.exitCode = 1;
  }
}

void main();
