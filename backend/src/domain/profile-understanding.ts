import {
  ProfileUnderstandingResponseSchema,
  type ProfileDraft,
  type ProfileUnderstandingRequest,
  type ProfileUnderstandingResponse,
} from '@airme/contracts';

import type { AiAdapter } from '../adapters/ai/types';
import { classifyUserText } from './safety';

const AREA_PATTERNS: Array<[RegExp, string]> = [
  [/第一校區|燕巢|高科大一校/iu, '高科大第一校區周邊'],
  [/建工|高科大建工/iu, '高科大建工校區周邊'],
  [/前鎮/iu, '高雄市前鎮區'],
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function firstAreaHint(text: string): string | null {
  return AREA_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** A deterministic, non-persistent fallback for fixture mode and AI failures. */
export function parseProfileDescription(text: string): {
  profile: ProfileDraft;
  commonAreaHint: string | null;
} {
  const age = Number(text.match(/(?:我|今年)?\s*(\d{1,2})\s*歲/u)?.[1] ?? 0);
  const ageGroup: ProfileDraft['ageGroup'] =
    age > 0 && age <= 12
      ? 'child'
      : age >= 18 || /成人|大學生|上班族/iu.test(text)
        ? 'adult'
        : age > 0 || /小學|國中|高中|青少年/iu.test(text)
          ? 'teen'
          : null;

  const sensitiveConditions = unique<ProfileDraft['sensitiveConditions'][number]>([
    ...(/氣喘|呼吸道|呼吸比較敏感|肺部/iu.test(text) ? ['respiratory-sensitive' as const] : []),
    ...(/心血管|心臟/iu.test(text) ? ['cardiovascular-sensitive' as const] : []),
    ...(/過敏|鼻炎|鼻子容易|花粉/iu.test(text) ? ['allergy-sensitive' as const] : []),
  ]).slice(0, 3);

  const commuteMode: ProfileDraft['commuteMode'] = /捷運|公車|火車|大眾運輸/iu.test(text)
    ? 'public-transit'
    : /機車/iu.test(text)
      ? 'scooter'
      : /汽車|開車/iu.test(text)
        ? 'car'
        : /單車|腳踏車|自行車|騎車/iu.test(text)
          ? 'bike'
          : /走路|步行|通勤|上學/iu.test(text)
            ? 'walk'
            : null;

  const commonActivities = unique<ProfileDraft['commonActivities'][number]>([
    ...(/散步|走路|步行/iu.test(text) ? ['walk' as const] : []),
    ...(/跑步|慢跑|路跑/iu.test(text) ? ['run' as const] : []),
    ...(/單車|腳踏車|自行車|騎車/iu.test(text) ? ['cycle' as const] : []),
    ...(/籃球|排球|足球|球類|打球/iu.test(text) ? ['ball-sports' as const] : []),
    ...(/體育課|戶外課/iu.test(text) ? ['outdoor-class' as const] : []),
    ...(/通勤|上學|放學/iu.test(text) ? ['commute' as const] : []),
  ]).slice(0, 6);

  return {
    profile: { ageGroup, sensitiveConditions, commuteMode, commonActivities },
    commonAreaHint: firstAreaHint(text),
  };
}

function missingFor(input: { profile: ProfileDraft; commonAreaHint: string | null }) {
  return [
    ...(input.profile.ageGroup === null ? (['ageGroup'] as const) : []),
    ...(input.profile.commuteMode === null ? (['commuteMode'] as const) : []),
    ...(input.commonAreaHint === null ? (['location'] as const) : []),
  ];
}

export class ProfileUnderstandingService {
  constructor(private readonly ai: AiAdapter) {}

  async understand(request: ProfileUnderstandingRequest): Promise<ProfileUnderstandingResponse> {
    // A personal profile can legitimately mention allergies or asthma. Only reject
    // attempts to alter the model instructions; no diagnosis is performed here.
    if (classifyUserText(request.description) === 'injection') throw new Error('INJECTION');

    let aiMode: 'live' | 'fixture' = this.ai.mode;
    let understanding: { profile: ProfileDraft; commonAreaHint: string | null };
    try {
      understanding = this.ai.understandProfile
        ? await this.ai.understandProfile(request.description)
        : parseProfileDescription(request.description);
    } catch {
      aiMode = 'fixture';
      understanding = parseProfileDescription(request.description);
    }

    return ProfileUnderstandingResponseSchema.parse({
      ...understanding,
      missing: missingFor(understanding),
      provenance: { aiMode },
    });
  }
}
