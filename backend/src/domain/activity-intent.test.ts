import { describe, expect, it } from 'vitest';

import { FixtureAiAdapter } from '../adapters/ai/fixture';
import { ActivityIntentService, parseActivityIntent } from './activity-intent';

describe('activity intent understanding', () => {
  it('extracts the decision fields without inventing missing values', () => {
    expect(parseActivityIntent('今天下午四點想在操場全力跑步 30 分鐘，鼻子有點塞')).toMatchObject({
      activity: '跑步',
      time: '今天下午四點',
      location: '操場',
      intensity: 'vigorous',
      durationMinutes: 30,
    });
  });

  it('asks only one clarification question', async () => {
    const result = await new ActivityIntentService(new FixtureAiAdapter()).understand({
      activityText: '今天想在戶外散步',
      locale: 'zh-TW',
      timeZone: 'Asia/Taipei',
      dataMode: 'fixture',
    });

    expect(result.missingField).toBe('duration');
    expect(result.clarificationQuestion).toBe('這次預計活動多久？');
  });
});
