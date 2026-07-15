import type { Profile, RiskLevel } from '@airme/contracts';

export type ActivityIntensity = 'light' | 'moderate' | 'vigorous';

export interface ActivityRuleInput {
  aqi: number | null;
  activityIntensity: ActivityIntensity;
  ageGroup: Profile['ageGroup'];
  sensitiveConditions: Profile['sensitiveConditions'];
  stale: boolean;
}

export interface ActivityRuleResult {
  minimumRiskLevel: RiskLevel;
  reasonCodes: string[];
  restrictions: string[];
  rulesVersion: string;
}

const RULES_VERSION = 'moe-school-aqi-2026.1';
const RISK_ORDER: RiskLevel[] = ['low', 'moderate', 'high', 'very-high'];

function baselineForAqi(aqi: number): RiskLevel {
  if (aqi <= 50) return 'low';
  if (aqi <= 150) return 'moderate';
  if (aqi <= 200) return 'high';
  return 'very-high';
}

function elevateRisk(risk: RiskLevel): RiskLevel {
  return RISK_ORDER[Math.min(RISK_ORDER.indexOf(risk) + 1, RISK_ORDER.length - 1)];
}

export function evaluateActivityRules(input: ActivityRuleInput): ActivityRuleResult {
  if (input.aqi === null) {
    return {
      minimumRiskLevel: 'high',
      reasonCodes: ['ENVIRONMENT_DATA_MISSING'],
      restrictions: ['先確認官方最新資料，再進行戶外活動'],
      rulesVersion: RULES_VERSION,
    };
  }

  let minimumRiskLevel = baselineForAqi(input.aqi);
  const reasonCodes = [`AQI_${Math.min(Math.floor(input.aqi / 50) + 1, 6)}`];
  const restrictions: string[] = [];
  const isSensitive = input.sensitiveConditions.length > 0;

  if (isSensitive) {
    reasonCodes.push('SENSITIVE_GROUP');
  }

  if (input.aqi > 100 && (isSensitive || input.activityIntensity === 'vigorous')) {
    minimumRiskLevel = enforceMinimumRisk('high', minimumRiskLevel);
    restrictions.push('避免長時間或劇烈戶外活動');
  } else if (input.aqi > 100) {
    restrictions.push('縮短長時間戶外活動，並留意身體狀況');
  }

  if (input.aqi > 150 && !restrictions.includes('避免長時間或劇烈戶外活動')) {
    restrictions.push('減少長時間或劇烈戶外活動');
  }

  if (input.aqi > 200) {
    restrictions.splice(0, restrictions.length, '避免戶外活動，改採室內低強度方案');
  }

  if (input.stale) {
    reasonCodes.push('ENVIRONMENT_DATA_STALE');
    minimumRiskLevel = elevateRisk(minimumRiskLevel);
    restrictions.push('資料已過更新時效，採較保守方案並重新確認官方資料');
  }

  return {
    minimumRiskLevel,
    reasonCodes,
    restrictions,
    rulesVersion: RULES_VERSION,
  };
}

export function enforceMinimumRisk(modelRisk: RiskLevel, minimumRisk: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(modelRisk) >= RISK_ORDER.indexOf(minimumRisk)
    ? modelRisk
    : minimumRisk;
}
