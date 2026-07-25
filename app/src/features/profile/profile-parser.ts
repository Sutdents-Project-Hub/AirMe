import {
  LocationSchema,
  TaiwanAdministrativeAreaSchema,
  type Location,
  type ProfileDraft,
  type ProfileUnderstandingResponse,
} from '@airme/contracts';

export type ProfileUnderstanding = ProfileUnderstandingResponse;

const KNOWN_LOCATIONS: { pattern: RegExp; location: Location }[] = [
  {
    pattern: /第一校區|燕巢|高科大一校/iu,
    location: {
      name: '高科大第一校區周邊',
      administrativeArea: '高雄市',
      latitude: 22.75,
      longitude: 120.34,
    },
  },
  {
    pattern: /建工|高科大建工/iu,
    location: {
      name: '高科大建工校區周邊',
      administrativeArea: '高雄市',
      latitude: 22.65,
      longitude: 120.33,
    },
  },
  {
    pattern: /前鎮/iu,
    location: {
      name: '高雄市前鎮區',
      administrativeArea: '高雄市',
      latitude: 22.6,
      longitude: 120.31,
    },
  },
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function resolveKnownLocation(areaHint: string | null): Location | null {
  if (!areaHint) return null;
  return KNOWN_LOCATIONS.find(({ pattern }) => pattern.test(areaHint))?.location ?? null;
}

export function parseProfileDescription(text: string): ProfileUnderstanding {
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

  const commonAreaHint = KNOWN_LOCATIONS.find(({ pattern }) => pattern.test(text))?.location.name ?? null;
  return {
    profile: { ageGroup, sensitiveConditions, commuteMode, commonActivities },
    commonAreaHint,
    missing: [
      ...(ageGroup === null ? (['ageGroup'] as const) : []),
      ...(commuteMode === null ? (['commuteMode'] as const) : []),
      ...(commonAreaHint === null ? (['location'] as const) : []),
    ],
    provenance: { aiMode: 'fixture' },
  };
}

export function createManualLocation(input: {
  name: string;
  latitude: string;
  longitude: string;
}): Location | null {
  const latitude = Math.round(Number(input.latitude) * 100) / 100;
  const longitude = Math.round(Number(input.longitude) * 100) / 100;
  if (!input.name.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const name = input.name.trim().slice(0, 80);
  const normalizedAdministrativeName = name.replace(/^台(?=北|中|南|東)/u, '臺');
  const administrativeArea = TaiwanAdministrativeAreaSchema.safeParse(
    normalizedAdministrativeName.match(/^(.*?[縣市])/u)?.[1],
  );
  const parsed = LocationSchema.safeParse({
    name,
    ...(administrativeArea.success ? { administrativeArea: administrativeArea.data } : {}),
    latitude,
    longitude,
  });
  return parsed.success ? parsed.data : null;
}

export const ACTIVITY_LABEL: Record<ProfileDraft['commonActivities'][number], string> = {
  walk: '散步',
  run: '跑步',
  cycle: '單車',
  'ball-sports': '球類',
  'outdoor-class': '戶外課程',
  commute: '通勤',
};
