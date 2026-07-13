import { readFileSync } from 'node:fs';

import { RiskLevelSchema } from '@airme/contracts';
import { z } from 'zod';

import { evaluateActivityRules } from '../domain/rules';
import { classifyUserText } from '../domain/safety';

const RuleCaseSchema = z
  .object({
    id: z.string().min(1),
    category: z.string().min(1),
    kind: z.literal('rule'),
    input: z
      .object({
        aqi: z.number().int().min(0).max(500).nullable(),
        activityIntensity: z.enum(['light', 'moderate', 'vigorous']),
        ageGroup: z.enum(['child', 'teen', 'adult']),
        sensitiveConditions: z.array(
          z.enum([
            'respiratory-sensitive',
            'cardiovascular-sensitive',
            'allergy-sensitive',
          ]),
        ),
        stale: z.boolean(),
      })
      .strict(),
    expectedRisk: RiskLevelSchema,
  })
  .strict();

const SafetyCaseSchema = z
  .object({
    id: z.string().min(1),
    category: z.string().min(1),
    kind: z.literal('safety'),
    text: z.string().min(1).max(800),
    expectedDisposition: z.enum([
      'allowed',
      'out-of-scope',
      'medical-boundary',
      'urgent-safety',
      'injection',
    ]),
  })
  .strict();

const EvaluationCasesSchema = z.array(z.discriminatedUnion('kind', [RuleCaseSchema, SafetyCaseSchema]));

interface EvaluationFailure {
  id: string;
  category: string;
  expected: string;
  actual: string;
}

export interface EvaluationReport {
  total: number;
  passed: number;
  rulePassRate: number;
  safetyPassRate: number;
  failures: EvaluationFailure[];
}

export function runEvaluationCases(input: unknown): EvaluationReport {
  const cases = EvaluationCasesSchema.parse(input);
  const failures: EvaluationFailure[] = [];
  let ruleTotal = 0;
  let rulePassed = 0;
  let safetyTotal = 0;
  let safetyPassed = 0;

  for (const item of cases) {
    if (item.kind === 'rule') {
      ruleTotal += 1;
      const actual = evaluateActivityRules(item.input).minimumRiskLevel;
      if (actual === item.expectedRisk) {
        rulePassed += 1;
      } else {
        failures.push({
          id: item.id,
          category: item.category,
          expected: item.expectedRisk,
          actual,
        });
      }
    } else {
      safetyTotal += 1;
      const actual = classifyUserText(item.text);
      if (actual === item.expectedDisposition) {
        safetyPassed += 1;
      } else {
        failures.push({
          id: item.id,
          category: item.category,
          expected: item.expectedDisposition,
          actual,
        });
      }
    }
  }

  return {
    total: cases.length,
    passed: cases.length - failures.length,
    rulePassRate: ruleTotal === 0 ? 1 : rulePassed / ruleTotal,
    safetyPassRate: safetyTotal === 0 ? 1 : safetyPassed / safetyTotal,
    failures,
  };
}

if (require.main === module) {
  const path = process.argv[2] ?? 'evaluation/cases.json';
  const report = runEvaluationCases(JSON.parse(readFileSync(path, 'utf8')) as unknown);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.failures.length > 0) process.exitCode = 1;
}
