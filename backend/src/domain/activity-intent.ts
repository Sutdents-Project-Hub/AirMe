import {
  ActivityIntentResponseSchema,
  type ActivityIntent,
  type ActivityIntentRequest,
  type ActivityIntentResponse,
} from '@airme/contracts';

import type { AiAdapter } from '../adapters/ai/types';
import { classifyUserText } from './safety';

const ACTIVITY_PATTERNS: Array<[RegExp, string]> = [
  [/跑步|慢跑|跑\s*1600|路跑/iu, '跑步'],
  [/散步|走路|步行/iu, '步行'],
  [/騎車|單車|腳踏車|自行車/iu, '騎單車'],
  [/籃球|排球|足球|球類|打球/iu, '球類活動'],
  [/羽球|網球|桌球|棒球/iu, '球拍或球類活動'],
  [/游泳/iu, '游泳'],
  [/爬山|登山|健行/iu, '登山健行'],
  [/體育課|戶外課/iu, '戶外課程'],
  [/通勤|上學|放學/iu, '通勤'],
];

function firstMatch(text: string, patterns: Array<[RegExp, string]>): string | null {
  return patterns.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function inferTime(text: string): string | null {
  return (
    text.match(/(?:今天|明天|週[一二三四五六日天]|星期[一二三四五六日天])?(?:早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}|[一二三四五六七八九十兩])(?::\d{2}|點(?:半|\d{1,2}分)?)/u)?.[0]?.trim() ??
    text.match(/今天(?:早上|上午|中午|下午|傍晚|晚上)|明天(?:早上|上午|中午|下午|傍晚|晚上)|放學後|上學前/u)?.[0] ??
    null
  );
}

function inferLocation(text: string): string | null {
  const matched = text.match(/(?:在|到|從)([^，。！？,!?]{2,30}?)(?:跑|走|騎|打球|活動|運動|上學|放學|，|。|$)/u)?.[1];
  return matched?.replace(/(?:全力|輕鬆|慢慢|高強度|低強度)$/u, '').trim() || null;
}

function inferDuration(text: string): number | null {
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:小時|鐘頭)/u)?.[1] ?? 0);
  if (hours > 0) return Math.min(720, Math.round(hours * 60));
  const minutes = Number(text.match(/(\d{1,3})\s*分鐘/u)?.[1] ?? 0);
  return minutes > 0 ? Math.min(720, minutes) : null;
}

function inferCondition(text: string): string | null {
  return (
    text.match(/(?:今天|現在|當下)?[^，。！？,!?]{0,12}(?:鼻子|喉嚨|呼吸|胸口|身體)[^，。！？,!?]{0,24}/u)?.[0]?.trim() ??
    null
  );
}

export function parseActivityIntent(text: string): ActivityIntent {
  const activity = firstMatch(text, ACTIVITY_PATTERNS) ?? '尚未確認的活動';
  const intensity = /全力|衝刺|劇烈|高強度|比賽/iu.test(text)
    ? 'vigorous'
    : /輕鬆|低強度|慢慢|散步/iu.test(text)
      ? 'light'
      : /跑|球|騎|單車|游泳|爬山|登山|健行|中強度/iu.test(text)
        ? 'moderate'
        : 'unspecified';
  return {
    activity,
    time: inferTime(text),
    location: inferLocation(text),
    intensity,
    durationMinutes: inferDuration(text),
    currentCondition: inferCondition(text),
    userGoal: /想|希望|準備|打算/iu.test(text) ? text.trim().slice(0, 160) : null,
  };
}

export function clarificationFor(intent: ActivityIntent): Pick<
  ActivityIntentResponse,
  'missingField' | 'clarificationQuestion'
> {
  if (intent.activity === '尚未確認的活動') {
    return { missingField: 'activity', clarificationQuestion: '你準備進行哪一種活動？' };
  }
  if (intent.durationMinutes === null) {
    return { missingField: 'duration', clarificationQuestion: '這次預計活動多久？' };
  }
  return { missingField: null, clarificationQuestion: null };
}

export class ActivityIntentService {
  constructor(private readonly ai: AiAdapter) {}

  async understand(request: ActivityIntentRequest): Promise<ActivityIntentResponse> {
    const disposition = classifyUserText(request.activityText);
    if (disposition !== 'allowed') throw new Error(disposition.toUpperCase().replaceAll('-', '_'));

    let aiMode: 'live' | 'fixture' = this.ai.mode;
    let intent: ActivityIntent;
    try {
      intent = this.ai.parseActivityIntent
        ? await this.ai.parseActivityIntent(request.activityText)
        : parseActivityIntent(request.activityText);
    } catch {
      aiMode = 'fixture';
      intent = parseActivityIntent(request.activityText);
    }
    const clarification = clarificationFor(intent);
    return ActivityIntentResponseSchema.parse({
      intent,
      ...clarification,
      provenance: { aiMode },
    });
  }
}
