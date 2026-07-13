import { describe, expect, it } from 'vitest';

import { ContextTokenError, ContextTokenService } from './context-token';

const payload = {
  activitySummary: '下午在操場慢跑 30 分鐘',
  locationName: '高雄市前鎮區',
  environment: {
    aqi: 118,
    category: 'unhealthy-sensitive' as const,
    weatherSummary: '多雲短暫雨',
  },
  minimumRiskLevel: 'high' as const,
  restrictions: ['避免長時間或劇烈戶外活動'],
};

describe('ContextTokenService', () => {
  it('round-trips a signed, expiring context', () => {
    const service = new ContextTokenService({
      secret: 'test-secret-with-at-least-32-characters',
      ttlSeconds: 1_800,
      now: () => new Date('2026-07-13T02:00:00.000Z'),
    });

    const token = service.sign(payload);

    expect(service.verify(token)).toMatchObject(payload);
  });

  it('rejects a tampered signature', () => {
    const service = new ContextTokenService({
      secret: 'test-secret-with-at-least-32-characters',
      ttlSeconds: 1_800,
      now: () => new Date('2026-07-13T02:00:00.000Z'),
    });
    const token = service.sign(payload);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(() => service.verify(tampered)).toThrow(ContextTokenError);
  });

  it('rejects an expired token with a stable reason', () => {
    let now = new Date('2026-07-13T02:00:00.000Z');
    const service = new ContextTokenService({
      secret: 'test-secret-with-at-least-32-characters',
      ttlSeconds: 60,
      now: () => now,
    });
    const token = service.sign(payload);
    now = new Date('2026-07-13T02:02:00.000Z');

    expect(() => service.verify(token)).toThrowError(
      expect.objectContaining({ reason: 'expired' }),
    );
  });
});
