export type SafetyDisposition =
  | 'allowed'
  | 'out-of-scope'
  | 'medical-boundary'
  | 'urgent-safety'
  | 'injection';

const URGENT_PATTERN =
  /胸痛|昏倒|失去意識|意識不清|無法呼吸|呼吸困難|嘴唇.{0,4}(發紫|變紫)|抽搐/iu;
const INJECTION_PATTERN =
  /忽略.{0,12}(前面|先前|規則|指令|限制)|system\s*prompt|系統提示|越獄|jailbreak|bypass|不受.{0,4}限制/iu;
const MEDICAL_PATTERN =
  /診斷|得了.{0,8}(病|氣喘|過敏)|是不是.{0,10}(生病|氣喘|過敏|心臟病)|吃什麼藥|用藥|藥物|處方|治療|症狀.{0,8}(成因|原因)/iu;
const ALLOWED_DOMAIN_PATTERN =
  /AQI|空氣|空品|污染|戶外|室內|活動|運動|慢跑|跑步|走路|散步|騎車|單車|球類|操場|口罩|時間|地點|強度|天氣|下雨|溫度|通勤|適合|改成|繼續跑/iu;
const UNSAFE_OUTPUT_PATTERN =
  /你.{0,4}(得了|罹患)|診斷為|確診|請服用|建議服用|應服用|停藥|加藥|症狀.{0,8}(是因為|由.{0,4}造成)/iu;

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
