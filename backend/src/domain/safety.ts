import type { RiskLevel } from '@airme/contracts';

export type SafetyDisposition =
  | 'allowed'
  | 'out-of-scope'
  | 'medical-boundary'
  | 'urgent-safety'
  | 'injection';

const URGENT_PATTERN =
  /胸痛|胸悶.{0,12}(頭暈|暈|喘)|昏倒|昏厥|快(?:要)?(?:暈倒|昏倒|昏厥)|失去意識|意識不清|無法呼吸|呼吸困難|喘不過氣|吸不到氣|嘴唇.{0,4}(發紫|變紫)|抽搐/iu;
const INJECTION_PATTERN =
  /忽略.{0,12}(前面|先前|規則|指令|限制)|system\s*prompt|系統提示|越獄|jailbreak|bypass|不受.{0,4}限制/iu;
const MEDICAL_PATTERN =
  /診斷|得了.{0,8}(病|氣喘|過敏)|是不是.{0,10}(生病|氣喘|過敏|心臟病)|吃什麼藥|用藥|藥物|處方|治療|症狀.{0,8}(成因|原因)/iu;
const ALLOWED_DOMAIN_PATTERN =
  /AQI|空氣品質|空品|空污|污染|戶外活動|室內活動|活動安全|運動|慢跑|跑步|全力跑|跑嗎|能跑|走路|散步|健走|騎車|單車|自行車|羽球|籃球|排球|足球|網球|桌球|棒球|游泳|爬山|登山|健行|球類|體育課|操場|口罩|活動時間|活動地點|活動強度|天氣|下雨|溫度|通勤|改成室內|改成低強度|繼續跑|這個建議|這項建議/iu;
const UNSAFE_OUTPUT_PATTERN =
  /你.{0,4}(得了|罹患)|診斷為|確診|請服用|建議服用|應服用|停藥|加藥|症狀.{0,8}(是因為|由.{0,4}造成)|完全安全|保證.{0,12}(安全|不會|沒事)|一定不會.{0,8}(不舒服|有事)/iu;
const UNGROUNDED_PERSONAL_PATTERN =
  /昨天|上次|過去|歷史紀錄|你平常|你通常|你的身體|你曾經|百分之\s*\d+|\d+\s*%/iu;
const UNSAFE_CONTINUE_PATTERN =
  /照常|照原計畫|不用調整|不必調整|(?:可以|可繼續|適合|沒問題).{0,12}(?:全力|衝刺|劇烈)|(?:全力|衝刺|劇烈).{0,12}(?:可以|可繼續|沒問題)/iu;
const SAFETY_NEGATION_PATTERN =
  /(?:不要|不能|避免|停止|減少|不應|不建議).{0,12}(?:照常|照原計畫|全力|衝刺|劇烈)/giu;
const OUTDOOR_PATTERN = /戶外|室外|操場|公園|道路/iu;
const POSITIVE_OUTDOOR_ADVICE_PATTERN =
  /(?:可以|可繼續|適合|照常|沒問題).{0,12}(?:戶外|室外|操場|公園|道路)|建議(?!不要|避免|停止|減少).{0,12}(?:戶外|室外|操場|公園|道路)|(?:戶外|室外|操場|公園|道路).{0,12}(?:可以繼續|沒問題)/iu;

export const FIXED_SAFETY_MESSAGES = {
  'out-of-scope': '我只能協助目前活動的空氣品質、活動安全與一般自我保護問題。',
  'medical-boundary':
    'AirMe 不能診斷、建議用藥或判定症狀原因。若你持續不舒服，請告知家長、老師或醫療專業人員。',
  'urgent-safety':
    '請立即停止活動並到安全處休息，立刻告知身邊成人；若有嚴重或持續症狀，請聯絡當地緊急協助。',
  injection: '這個要求會繞過安全規則，因此無法執行。你可以改問現在適合的活動方式。',
} as const;

export function classifyUserText(text: string): SafetyDisposition {
  const normalized = text.trim();
  if (URGENT_PATTERN.test(normalized)) return 'urgent-safety';
  if (INJECTION_PATTERN.test(normalized)) return 'injection';
  if (MEDICAL_PATTERN.test(normalized)) return 'medical-boundary';
  if (ALLOWED_DOMAIN_PATTERN.test(normalized)) return 'allowed';
  return 'out-of-scope';
}

export function containsUnsafeMedicalClaim(text: string): boolean {
  return UNSAFE_OUTPUT_PATTERN.test(text);
}

export function containsUngroundedPersonalClaim(text: string): boolean {
  return UNGROUNDED_PERSONAL_PATTERN.test(text);
}

export function contradictsSafetyFloor(
  text: string,
  minimumRiskLevel: RiskLevel,
  restrictions: string[],
): boolean {
  if (
    (minimumRiskLevel === 'high' || minimumRiskLevel === 'very-high') &&
    UNSAFE_CONTINUE_PATTERN.test(text.replace(SAFETY_NEGATION_PATTERN, ''))
  ) {
    return true;
  }
  const requiresIndoor = restrictions.some((restriction) =>
    /留在室內|停止戶外|改採室內/u.test(restriction),
  );
  return requiresIndoor && OUTDOOR_PATTERN.test(text) && POSITIVE_OUTDOOR_ADVICE_PATTERN.test(text);
}
