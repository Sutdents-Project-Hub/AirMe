import type { ActivityIntent, ActivityIntentResponse } from '@airme/contracts';

export function parseActivityIntentLocally(text: string): ActivityIntentResponse {
  const activity = /跑步|慢跑|跑\s*1600|路跑/iu.test(text)
    ? '跑步'
    : /散步|走路|步行/iu.test(text)
      ? '步行'
      : /騎車|單車|腳踏車|自行車/iu.test(text)
        ? '騎單車'
        : /羽球|籃球|排球|足球|網球|桌球|棒球|球類|打球/iu.test(text)
          ? '球類活動'
          : /游泳/iu.test(text)
            ? '游泳'
            : /爬山|登山|健行/iu.test(text)
              ? '登山健行'
              : /通勤|上學|放學/iu.test(text)
                ? '通勤'
                : '尚未確認的活動';
  const minutes = Number(text.match(/(\d{1,3})\s*分鐘/u)?.[1] ?? 0);
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:小時|鐘頭)/u)?.[1] ?? 0);
  const durationMinutes = minutes > 0 ? Math.min(minutes, 720) : hours > 0 ? Math.min(Math.round(hours * 60), 720) : null;
  const time =
    text.match(/(?:今天|明天|週[一二三四五六日天]|星期[一二三四五六日天])?(?:早上|上午|中午|下午|傍晚|晚上)?\s*(?:\d{1,2}|[一二三四五六七八九十兩])(?::\d{2}|點(?:半|\d{1,2}分)?)/u)?.[0]?.trim() ??
    text.match(/今天(?:早上|上午|中午|下午|傍晚|晚上)|明天(?:早上|上午|中午|下午|傍晚|晚上)|放學後|上學前/u)?.[0] ??
    null;
  const rawLocation = text.match(/(?:在|到|從)([^，。！？,!?]{2,30}?)(?:跑|走|騎|打球|活動|運動|上學|放學|，|。|$)/u)?.[1]?.trim();
  const location = rawLocation?.replace(/(?:全力|輕鬆|慢慢|高強度|低強度)$/u, '').trim() || null;
  const intensity: ActivityIntent['intensity'] = /全力|衝刺|劇烈|高強度|比賽/iu.test(text)
    ? 'vigorous'
    : /輕鬆|低強度|慢慢|散步/iu.test(text)
      ? 'light'
      : /跑|球|騎|單車|中強度/iu.test(text)
        ? 'moderate'
        : 'unspecified';
  const currentCondition =
    text.match(/(?:今天|現在|當下)?[^，。！？,!?]{0,12}(?:鼻子|鼻塞|喉嚨|呼吸|胸口|身體)[^，。！？,!?]{0,24}/u)?.[0]?.trim() ?? null;
  const intent: ActivityIntent = {
    activity,
    time,
    location,
    intensity,
    durationMinutes,
    currentCondition,
    userGoal: /想|希望|準備|打算/iu.test(text) ? text.trim().slice(0, 160) : null,
  };
  if (activity === '尚未確認的活動') {
    return {
      intent,
      missingField: 'activity',
      clarificationQuestion: '你準備進行哪一種活動？',
      provenance: { aiMode: 'fixture' },
    };
  }
  if (durationMinutes === null) {
    return {
      intent,
      missingField: 'duration',
      clarificationQuestion: '這次預計活動多久？',
      provenance: { aiMode: 'fixture' },
    };
  }
  return {
    intent,
    missingField: null,
    clarificationQuestion: null,
    provenance: { aiMode: 'fixture' },
  };
}

export function privateActivitySummary(intent: ActivityIntent): string {
  return [
    intent.activity,
    intent.time,
    intent.durationMinutes ? `${intent.durationMinutes} 分鐘` : null,
    intent.intensity === 'vigorous' ? '高強度' : intent.intensity === 'moderate' ? '中強度' : intent.intensity === 'light' ? '低強度' : null,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 160);
}
