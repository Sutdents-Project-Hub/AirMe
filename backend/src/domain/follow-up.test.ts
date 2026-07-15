import { describe, expect, it, vi } from 'vitest';

import { ContextTokenService } from './context-token';
import { FollowUpService } from './follow-up';

const contextTokens = new ContextTokenService({
  secret: 'test-secret-with-at-least-32-characters',
  ttlSeconds: 1_800,
  now: () => new Date('2026-07-13T02:00:00.000Z'),
});
const token = contextTokens.sign({
  activitySummary: '下午在操場慢跑 30 分鐘',
  locationName: '高雄市前鎮區',
  environment: {
    aqi: 118,
    category: 'unhealthy-sensitive',
    weatherSummary: '多雲短暫雨',
  },
  minimumRiskLevel: 'high',
  restrictions: ['避免長時間或劇烈戶外活動'],
});

describe('FollowUpService', () => {
  it('returns a fixed medical boundary without calling AI', async () => {
    const ai = { answerFollowUp: vi.fn() };
    const service = new FollowUpService({ contextTokens, ai, requestId: () => 'req_follow' });

    const response = await service.answer({ question: '我要吃什麼藥？', contextToken: token });

    expect(response.disposition).toBe('medical-boundary');
    expect(response.answer).toContain('不能診斷');
    expect(ai.answerFollowUp).not.toHaveBeenCalled();
  });

  it('returns urgent fixed guidance before any model call', async () => {
    const ai = { answerFollowUp: vi.fn() };
    const service = new FollowUpService({ contextTokens, ai, requestId: () => 'req_follow' });

    const response = await service.answer({ question: '我胸痛快昏倒了', contextToken: token });

    expect(response.disposition).toBe('urgent-safety');
    expect(response.answer).toContain('立即停止活動');
    expect(ai.answerFollowUp).not.toHaveBeenCalled();
  });

  it('uses AI only for an allowed in-context question', async () => {
    const ai = {
      answerFollowUp: vi.fn().mockResolvedValue({
        answer: '改成室內低強度走路較符合目前規則底線。',
        suggestedQuestions: ['多久後再確認 AQI？'],
      }),
    };
    const service = new FollowUpService({ contextTokens, ai, requestId: () => 'req_follow' });

    const response = await service.answer({ question: '改成室內走路可以嗎？', contextToken: token });

    expect(response.disposition).toBe('answered');
    expect(response.answer).toContain('室內');
    expect(ai.answerFollowUp).toHaveBeenCalledTimes(1);
  });

  it('falls back to a deterministic answer when AI is unavailable', async () => {
    const ai = { answerFollowUp: vi.fn().mockRejectedValue(new Error('provider secret body')) };
    const service = new FollowUpService({ contextTokens, ai, requestId: () => 'req_follow' });

    const response = await service.answer({ question: '改成室內走路可以嗎？', contextToken: token });

    expect(response.disposition).toBe('answered');
    expect(response.answer).toContain('規則底線');
    expect(response.answer).not.toContain('provider secret');
  });
});
