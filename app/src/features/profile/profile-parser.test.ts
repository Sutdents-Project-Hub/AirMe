import { describe, expect, it } from 'vitest';

import { createManualLocation, parseProfileDescription } from './profile-parser';

describe('profile description parser', () => {
  it('keeps only controlled profile fields and a coarse known location', () => {
    const result = parseProfileDescription(
      '我 15 歲，平常騎單車到高科大第一校區，鼻子容易過敏，放學會跑步。',
    );

    expect(result.profile).toEqual({
      ageGroup: 'teen',
      sensitiveConditions: ['allergy-sensitive'],
      commuteMode: 'bike',
      commonActivities: ['run', 'cycle', 'commute'],
    });
    expect(result.location?.latitude).toBe(22.75);
    expect(JSON.stringify(result)).not.toContain('鼻子容易過敏');
  });

  it('accepts manually entered coordinates only after rounding to two decimals', () => {
    expect(
      createManualLocation({ name: '楠梓區周邊', latitude: '22.71234', longitude: '120.30123' }),
    ).toEqual({ name: '楠梓區周邊', latitude: 22.71, longitude: 120.3 });
  });

  it('keeps a controlled county for live weather lookup', () => {
    expect(
      createManualLocation({
        name: '高雄市楠梓區周邊',
        latitude: '22.712',
        longitude: '120.301',
      }),
    ).toMatchObject({ administrativeArea: '高雄市' });
  });

  it('normalizes the common 台 spelling for official weather area names', () => {
    expect(
      createManualLocation({
        name: '台中市西屯區周邊',
        latitude: '24.181',
        longitude: '120.646',
      }),
    ).toMatchObject({ name: '台中市西屯區周邊', administrativeArea: '臺中市' });
  });

  it('rejects manual coordinates outside the Taiwan service area', () => {
    expect(
      createManualLocation({ name: '東京', latitude: '35.681', longitude: '139.767' }),
    ).toBeNull();
  });
});
