import type { ActivityIntent, ActivityIntentResponse } from '@airme/contracts';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface ActivityComposerProps {
  loading: boolean;
  onUnderstand: (value: string) => Promise<ActivityIntentResponse | null>;
  onSubmit: (value: string, intent: ActivityIntent) => void;
  initialValue?: string;
}

const INTENSITY_LABEL: Record<ActivityIntent['intensity'], string> = {
  light: '低強度',
  moderate: '中強度',
  vigorous: '高強度',
  unspecified: '未明確提及',
};

const MAX_ACTIVITY_TEXT_LENGTH = 800;
const MAX_SUPPLEMENT_LENGTH = 160;

export function ActivityComposer({
  loading,
  onUnderstand,
  onSubmit,
  initialValue = '',
}: ActivityComposerProps) {
  const palette = usePalette();
  const [value, setValue] = useState(initialValue);
  const [understanding, setUnderstanding] = useState<ActivityIntentResponse | null>(null);
  const [clarification, setClarification] = useState('');
  const [supplements, setSupplements] = useState<string[]>([]);
  const [addingSupplement, setAddingSupplement] = useState(false);
  const trimmed = value.trim();

  const buildActivityText = (extra: string[] = supplements) =>
    [trimmed, ...extra.map((item) => `補充：${item.trim()}`)]
      .filter(Boolean)
      .join('\n');
  const activityText = buildActivityText();
  const nextSupplements = clarification.trim()
    ? [...supplements, clarification.trim()]
    : supplements;
  const activityTextWithDraft = buildActivityText(nextSupplements);
  const remainingWithDraft = MAX_ACTIVITY_TEXT_LENGTH - activityTextWithDraft.length;
  const initialRemaining = MAX_ACTIVITY_TEXT_LENGTH - trimmed.length;
  const clarificationPlaceholder = getClarificationPlaceholder(
    understanding?.clarificationQuestion ?? undefined,
    addingSupplement,
  );

  const understand = async (nextValue = activityText) => {
    if (nextValue.length > MAX_ACTIVITY_TEXT_LENGTH) return null;
    const result = await onUnderstand(nextValue);
    if (result) {
      setUnderstanding(result);
      setAddingSupplement(false);
    }
    return result;
  };

  if (understanding) {
    const intent = understanding.intent;
    return (
      <Card>
        <View style={styles.heading}>
          <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
            <AppText variant="caption" weight="900" tone="accent">
              我理解的是
            </AppText>
          </View>
          <AppText variant="title" weight="800">
            先確認活動，再產生建議
          </AppText>
          <AppText tone="muted">
            {understanding.provenance.aiMode === 'live'
              ? '已由 AirMe AI 整理；只有你確認後才會送出推薦。'
              : '示範模式使用可重播解析；只有你確認後才會送出推薦。'}
          </AppText>
        </View>

        <View style={[styles.summary, { backgroundColor: palette.background }]}>
          <IntentRow label="活動" value={intent.activity} />
          <IntentRow label="時間" value={intent.time ?? '未明確提及'} />
          <IntentRow label="地點" value={intent.location ?? '使用個人檔案的常用區域'} />
          <IntentRow label="強度" value={INTENSITY_LABEL[intent.intensity]} />
          <IntentRow
            label="時長"
            value={intent.durationMinutes ? `${intent.durationMinutes} 分鐘` : '未明確提及'}
          />
          <IntentRow label="當下狀況" value={intent.currentCondition ?? '未提及'} />
        </View>

        {understanding.clarificationQuestion || addingSupplement ? (
          <View style={[styles.clarification, { backgroundColor: palette.warningSoft }]}>
            <AppText weight="800">
              {understanding.clarificationQuestion ? '只需要再確認一件事' : '補充更多活動資訊'}
            </AppText>
            <AppText>
              {understanding.clarificationQuestion ??
                '例如活動時長、強度、地點或當下狀況。'}
            </AppText>
            <TextInput
              accessibilityLabel="補充活動資訊"
              editable={!loading}
              maxLength={MAX_SUPPLEMENT_LENGTH}
              onChangeText={setClarification}
              placeholder={clarificationPlaceholder}
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
              ]}
              value={clarification}
            />
            <AppText
              accessibilityLiveRegion="polite"
              variant="caption"
              tone={remainingWithDraft < 0 ? 'danger' : 'muted'}>
              {remainingWithDraft < 0
                ? `補充後超過 800 字上限 ${Math.abs(remainingWithDraft)} 字，請縮短內容。`
                : `補充後還可輸入 ${remainingWithDraft} 字。`}
            </AppText>
            <AppButton
              label={loading ? '正在重新整理' : '加入補充並重新整理'}
              onPress={async () => {
                if (
                  clarification.trim().length < 1 ||
                  activityTextWithDraft.length > MAX_ACTIVITY_TEXT_LENGTH
                ) {
                  return;
                }
                const result = await understand(activityTextWithDraft);
                if (!result) return;
                setSupplements(nextSupplements);
                setClarification('');
              }}
              disabled={
                clarification.trim().length < 1 ||
                activityTextWithDraft.length > MAX_ACTIVITY_TEXT_LENGTH
              }
              loading={loading}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <AppText variant="caption" tone="muted">
              目前活動內容共 {activityText.length} / {MAX_ACTIVITY_TEXT_LENGTH} 字
            </AppText>
            <AppButton
              label="補充更多資訊"
              onPress={() => {
                setClarification('');
                setAddingSupplement(true);
              }}
              variant="secondary"
            />
            <AppButton
              label="修改活動描述"
              onPress={() => {
                setValue(activityText);
                setClarification('');
                setSupplements([]);
                setAddingSupplement(false);
                setUnderstanding(null);
              }}
              variant="ghost"
            />
            <AppButton
              label={loading ? '正在分析環境與活動' : '確認，產生我的行動卡'}
              onPress={() => {
                if (activityText.length <= MAX_ACTIVITY_TEXT_LENGTH) {
                  onSubmit(activityText, intent);
                }
              }}
              disabled={activityText.length > MAX_ACTIVITY_TEXT_LENGTH}
              loading={loading}
            />
          </View>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.heading}>
        <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
          <AppText variant="caption" weight="900" tone="accent">
            健康助理
          </AppText>
        </View>
        <AppText variant="title" weight="800">
          你現在想做什麼？
        </AppText>
        <AppText tone="muted">
          直接說活動、時間、地點、強度與當下狀況。AirMe 會先把理解結果交給你確認。
        </AppText>
      </View>
      <TextInput
        accessibilityLabel="描述你的活動"
        editable={!loading}
        maxLength={MAX_ACTIVITY_TEXT_LENGTH}
        multiline
        onChangeText={setValue}
        placeholder="例如：今天下午四點想在操場全力跑 1600 公尺，大約 30 分鐘，鼻子有點塞"
        placeholderTextColor={palette.textMuted}
        style={[
          styles.textarea,
          { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
        ]}
        textAlignVertical="top"
        value={value}
      />
      <View style={styles.meta}>
        <AppText variant="caption" tone="muted">
          不需要姓名或醫療診斷
        </AppText>
        <AppText
          accessibilityLiveRegion="polite"
          variant="caption"
          tone={initialRemaining < 0 ? 'danger' : 'muted'}>
          {initialRemaining < 0
            ? `超過 800 字上限 ${Math.abs(initialRemaining)} 字，請縮短內容。`
            : `還可輸入 ${initialRemaining} 字`}
        </AppText>
      </View>
      <AppButton
        label={loading ? '正在整理活動內容' : '先看看 AirMe 理解了什麼'}
        onPress={() => void understand()}
        disabled={trimmed.length < 2 || trimmed.length > MAX_ACTIVITY_TEXT_LENGTH}
        loading={loading}
      />
    </Card>
  );
}

function getClarificationPlaceholder(question: string | undefined, addingSupplement: boolean) {
  if (addingSupplement && !question) {
    return '例如：我想改在學校體育館，活動約 20 分鐘';
  }
  const prompt = question ?? '';
  if (/哪一種活動|什麼活動|活動種類|活動類型|要做什麼/iu.test(prompt)) {
    return '例如：慢跑、快走、騎單車或籃球';
  }
  if (/多久|持續|時長|幾分|分鐘|幾小時/iu.test(prompt)) return '例如：大約 30 分鐘';
  if (/地點|哪裡|在哪|何處|哪個|場所/iu.test(prompt)) {
    return '例如：在學校操場或室內體育館';
  }
  if (/強度|速度|激烈|多大|多快|全力/iu.test(prompt)) {
    return '例如：低強度快走，不會全力跑';
  }
  if (/時間|何時|幾點|時候|日期|早上|下午|晚上/iu.test(prompt)) {
    return '例如：今天下午四點';
  }
  if (/狀況|不舒服|感受/iu.test(prompt)) {
    return '例如：目前只有輕微鼻塞，沒有其他不舒服';
  }
  return '例如：大約 30 分鐘，在室內進行';
}

function IntentRow({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
      <AppText variant="body-small" tone="muted" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText weight="700" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textarea: {
    borderRadius: 18,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    minHeight: 176,
    padding: spacing.lg,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  summary: { borderRadius: 18, gap: spacing.md, padding: spacing.lg },
  summaryRow: { borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.sm },
  summaryLabel: { width: 88 },
  summaryValue: { flex: 1 },
  clarification: { borderRadius: 18, gap: spacing.md, padding: spacing.lg },
  actions: { gap: spacing.md },
});
