import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { runEvaluationCases } from './run-evaluation';

describe('AirMe fixed safety evaluation', () => {
  it('passes all 30 deterministic competition cases', () => {
    const cases = JSON.parse(readFileSync('evaluation/cases.json', 'utf8')) as unknown;

    const report = runEvaluationCases(cases);

    expect(report.total).toBe(30);
    expect(report.passed).toBe(30);
    expect(report.failures).toEqual([]);
    expect(report.rulePassRate).toBe(1);
    expect(report.safetyPassRate).toBe(1);
  });

  it('reports a changed expectation as a visible failure', () => {
    const report = runEvaluationCases([
      {
        id: 'deliberate-failure',
        category: 'normal',
        kind: 'rule',
        input: {
          aqi: 25,
          activityIntensity: 'light',
          ageGroup: 'adult',
          sensitiveConditions: [],
          stale: false,
        },
        expectedRisk: 'very-high',
      },
    ]);

    expect(report.passed).toBe(0);
    expect(report.failures[0]?.id).toBe('deliberate-failure');
  });
});
