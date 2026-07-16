import { describe, expect, it } from 'vitest';

import { evaluateActivityRules, enforceMinimumRisk } from './rules';

describe('evaluateActivityRules', () => {
  it.each([
    [25, 'low'],
    [75, 'moderate'],
    [125, 'moderate'],
    [175, 'high'],
    [250, 'very-high'],
    [350, 'very-high'],
  ] as const)('maps AQI %s to the official baseline %s', (aqi, expected) => {
    const result = evaluateActivityRules({
      aqi,
      activityIntensity: 'light',
      ageGroup: 'adult',
      sensitiveConditions: [],
      stale: false,
    });

    expect(result.minimumRiskLevel).toBe(expected);
    expect(result.rulesVersion).toBe('moe-school-aqi-2023-12-18.v1');
  });

  it('raises the minimum risk for a sensitive teen doing vigorous activity', () => {
    const result = evaluateActivityRules({
      aqi: 125,
      activityIntensity: 'vigorous',
      ageGroup: 'teen',
      sensitiveConditions: ['respiratory-sensitive'],
      stale: false,
    });

    expect(result.minimumRiskLevel).toBe('high');
    expect(result.reasonCodes).toContain('SENSITIVE_GROUP');
    expect(result.restrictions).toContain('減少體力消耗與戶外活動，必要外出時採一般防護');
  });

  it('keeps a sensitive student indoors at red AQI', () => {
    const result = evaluateActivityRules({
      aqi: 175,
      activityIntensity: 'light',
      ageGroup: 'teen',
      sensitiveConditions: ['allergy-sensitive'],
      stale: false,
    });

    expect(result.minimumRiskLevel).toBe('high');
    expect(result.restrictions).toContain(
      '留在室內並減少體力消耗活動，必要外出時採一般防護',
    );
  });

  it('stops all outdoor activity above red AQI', () => {
    const result = evaluateActivityRules({
      aqi: 225,
      activityIntensity: 'light',
      ageGroup: 'teen',
      sensitiveConditions: [],
      stale: false,
    });

    expect(result.minimumRiskLevel).toBe('very-high');
    expect(result.restrictions).toContain('立即停止戶外活動，改採室內低強度方案');
  });

  it('uses a conservative high risk when current data is missing', () => {
    const result = evaluateActivityRules({
      aqi: null,
      activityIntensity: 'moderate',
      ageGroup: 'teen',
      sensitiveConditions: [],
      stale: true,
    });

    expect(result.minimumRiskLevel).toBe('high');
    expect(result.reasonCodes).toContain('ENVIRONMENT_DATA_MISSING');
  });

  it('never allows model output to lower the rule floor', () => {
    expect(enforceMinimumRisk('low', 'high')).toBe('high');
    expect(enforceMinimumRisk('very-high', 'moderate')).toBe('very-high');
  });
});
