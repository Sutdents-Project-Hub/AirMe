import { describe, expect, it } from 'vitest';

import { parseActivityIntentLocally, privateActivitySummary } from './activity-intent';

describe('local activity intent fallback', () => {
  it('extracts an activity and asks one question when duration is missing', () => {
    const result = parseActivityIntentLocally('放學後想在操場慢跑，鼻子有點塞');

    expect(result.intent.activity).toBe('跑步');
    expect(result.missingField).toBe('duration');
    expect(result.clarificationQuestion).toBe('這次預計活動多久？');
  });

  it('builds a persistent summary without the current condition', () => {
    const result = parseActivityIntentLocally('下午四點想跑步 30 分鐘，鼻子有點塞');
    const summary = privateActivitySummary(result.intent);

    expect(summary).toContain('跑步');
    expect(summary).toContain('30 分鐘');
    expect(summary).not.toContain('鼻子');
  });

  it('keeps intensity words out of the parsed location', () => {
    const result = parseActivityIntentLocally('今天下午四點想在操場全力跑步 30 分鐘');

    expect(result.intent.time).toBe('今天下午四點');
    expect(result.intent.location).toBe('操場');
  });
});
