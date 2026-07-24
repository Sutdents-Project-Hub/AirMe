import type { Feedback, RecommendationHistoryItem, RiskLevel } from '@airme/contracts';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { borders, radii, spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';
import { Chip } from './ui/chip';

const TAIPEI_TIME_ZONE = 'Asia/Taipei';

const RISK_LABEL: Record<RiskLevel, string> = {
  low: '風險較低',
  moderate: '需要留意',
  high: '風險偏高',
  'very-high': '建議避免',
};

const RISK_LEVELS = Object.keys(RISK_LABEL) as RiskLevel[];

const DISCOMFORT_LABEL: Record<Feedback['discomfort'], string> = {
  none: '沒有不舒服',
  mild: '有輕微不舒服',
  obvious: '有明顯不舒服',
  'prefer-not': '不想回答不舒服狀況',
};

const HELPFUL_LABEL: Record<Feedback['helpful'], string> = {
  yes: '建議有幫助',
  no: '建議沒有幫助',
  unsure: '建議是否有幫助不確定',
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-TW', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TAIPEI_TIME_ZONE,
});

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('zh-TW', {
  month: 'long',
  day: 'numeric',
  timeZone: TAIPEI_TIME_ZONE,
});

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  timeZone: TAIPEI_TIME_ZONE,
  year: 'numeric',
});

type FeedbackInput = Omit<Feedback, 'id' | 'createdAt'>;

interface HistoryListProps {
  items: RecommendationHistoryItem[];
  feedback: Feedback[];
  onCreateRecommendation: () => void;
  onSubmitFeedback: (value: FeedbackInput) => Promise<void>;
}

export function HistoryList({
  items,
  feedback,
  onCreateRecommendation,
  onSubmitFeedback,
}: HistoryListProps) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<RecommendationHistoryItem | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<RecommendationHistoryItem | null>(null);

  const feedbackByRecommendation = useMemo(() => {
    const byRecommendation = new Map<string, Feedback>();
    feedback.forEach((entry) => {
      const current = byRecommendation.get(entry.recommendationId);
      if (!current || Date.parse(entry.createdAt) > Date.parse(current.createdAt)) {
        byRecommendation.set(entry.recommendationId, entry);
      }
    });
    return byRecommendation;
  }, [feedback]);

  const dates = useMemo(() => {
    const byKey = new Map<string, string>();
    items.forEach((item) => {
      const key = taipeiDateKey(item.createdAt);
      if (!byKey.has(key)) {
        byKey.set(key, DATE_LABEL_FORMATTER.format(new Date(item.createdAt)));
      }
    });
    return [...byKey].map(([key, label]) => ({ key, label }));
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (selectedDate === 'all' || taipeiDateKey(item.createdAt) === selectedDate) &&
          (selectedRisk === 'all' || item.riskLevel === selectedRisk),
      ),
    [items, selectedDate, selectedRisk],
  );

  const openFeedback = (item: RecommendationHistoryItem) => {
    setSelectedItem(null);
    setFeedbackItem(item);
  };

  if (items.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <View style={[styles.emptyIcon, { backgroundColor: palette.accentSoft }]}>
          <AppText variant="title" weight="900" tone="accent">
            ＋
          </AppText>
        </View>
        <AppText variant="title-small" weight="800" style={styles.centeredText}>
          還沒有 Air 日誌
        </AppText>
        <AppText tone="muted" style={styles.centeredText}>
          產生第一張行動卡後，這裡會保存結構化活動、環境、建議摘要與主觀回饋。
        </AppText>
        <AppButton label="回到今日建立第一張行動卡" onPress={onCreateRecommendation} />
      </Card>
    );
  }

  const selectedFeedback = selectedItem
    ? feedbackByRecommendation.get(selectedItem.id)
    : undefined;
  const feedbackTarget = feedbackItem
    ? feedbackByRecommendation.get(feedbackItem.id)
    : undefined;

  return (
    <View style={styles.list}>
      <View accessibilityLabel="Air 日誌篩選" accessibilityRole="toolbar" style={styles.filters}>
        <View style={styles.filterGroup}>
          <AppText variant="caption" weight="800" tone="muted">
            日期
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            <Chip
              accessibilityLabel="日期篩選：全部"
              label="全部"
              selected={selectedDate === 'all'}
              onPress={() => setSelectedDate('all')}
            />
            {dates.map((date) => (
              <Chip
                accessibilityLabel={`日期篩選：${date.label}`}
                key={date.key}
                label={date.label}
                selected={selectedDate === date.key}
                onPress={() => setSelectedDate(date.key)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <AppText variant="caption" weight="800" tone="muted">
            風險程度
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}>
            <Chip
              accessibilityLabel="風險篩選：全部"
              label="全部"
              selected={selectedRisk === 'all'}
              onPress={() => setSelectedRisk('all')}
            />
            {RISK_LEVELS.map((level) => (
              <Chip
                accessibilityLabel={`風險篩選：${RISK_LABEL[level]}`}
                key={level}
                label={RISK_LABEL[level]}
                selected={selectedRisk === level}
                onPress={() => setSelectedRisk(level)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {filteredItems.length === 0 ? (
        <Card style={styles.noResults}>
          <AppText variant="title-small" weight="800">
            沒有符合篩選的 Air 日誌
          </AppText>
          <AppText tone="muted">清除日期與風險條件後，可以查看全部紀錄。</AppText>
          <AppButton
            label="清除篩選"
            variant="secondary"
            onPress={() => {
              setSelectedDate('all');
              setSelectedRisk('all');
            }}
          />
        </Card>
      ) : (
        filteredItems.map((item) => {
          const checkIn = feedbackByRecommendation.get(item.id);
          return (
            <Card key={item.id} style={wide ? styles.cardWide : styles.cardNarrow}>
              <View
                style={[styles.colorBar, { backgroundColor: riskAccent(item.riskLevel, palette) }]}
              />
              <Pressable
                accessibilityHint="開啟活動、環境、建議與回饋摘要"
                accessibilityLabel={`查看 ${item.activitySummary} 詳細資訊`}
                accessibilityRole="button"
                onPress={() => setSelectedItem(item)}
                style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}>
                <View style={styles.top}>
                  <View style={styles.copy}>
                    <AppText variant="body-small" tone="muted">
                      {formatDateTime(item.createdAt)}
                    </AppText>
                    <AppText variant="title-small" weight="800">
                      {item.activitySummary}
                    </AppText>
                  </View>
                  <View
                    style={[styles.badge, { backgroundColor: riskSoft(item.riskLevel, palette) }]}>
                    <AppText variant="caption" weight="800">
                      {RISK_LABEL[item.riskLevel]}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.facts, { backgroundColor: palette.background }]}>
                  <View style={styles.environmentRow}>
                    <AppText variant="body-small" weight="700" style={styles.environmentCopy}>
                      {weatherIcon(item.weatherSummary)} {weatherLabel(item.weatherSummary)}
                    </AppText>
                    {item.aqi === undefined ? (
                      <AppText variant="caption" tone="muted">
                        AQI 未保存
                      </AppText>
                    ) : (
                      <View style={[styles.aqiBadge, { backgroundColor: aqiColor(item.aqi) }]}>
                        <AppText variant="caption" weight="900" style={styles.aqiText}>
                          AQI {item.aqi}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="body-small" tone="muted">
                    {item.locationName}
                  </AppText>
                </View>

                <AppText weight="700">{item.headline}</AppText>
                {item.recommendedPlanSummary ? (
                  <AppText variant="body-small" tone="muted">
                    方案：{item.recommendedPlanSummary}
                  </AppText>
                ) : null}
                <View style={styles.detailHint}>
                  <AppText variant="caption" weight="700" tone="muted">
                    查看詳情
                  </AppText>
                  <AppText variant="caption" weight="900" tone="muted">
                    ›
                  </AppText>
                </View>
              </Pressable>

              <View style={[styles.checkIn, { borderTopColor: palette.border }]}>
                <AppText variant="caption" weight="800" tone="accent">
                  活動後回饋
                </AppText>
                {checkIn ? (
                  <>
                    <AppText variant="body-small">{feedbackSummary(checkIn)}</AppText>
                    {checkIn.note ? (
                      <AppText variant="body-small" tone="muted">
                        「{checkIn.note}」
                      </AppText>
                    ) : null}
                  </>
                ) : (
                  <AppText variant="body-small" tone="muted">
                    尚未留下回饋
                  </AppText>
                )}
                <AppButton
                  accessibilityLabel={`${checkIn ? '編輯' : '填寫'}活動回饋：${item.activitySummary}`}
                  label={checkIn ? '編輯回饋' : '填寫回饋'}
                  variant="ghost"
                  onPress={() => openFeedback(item)}
                />
              </View>

              <AppText variant="caption" tone="muted">
                {item.provenance === 'fixture' ? '決賽示範' : '環境資料'}
                {item.rulesVersion ? ` · 規則 ${item.rulesVersion}` : ''}
              </AppText>
            </Card>
          );
        })
      )}

      {selectedItem ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setSelectedItem(null)}
          transparent
          visible>
          <View style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}>
            <View
              accessibilityLabel="Air 日誌詳細資訊"
              accessibilityViewIsModal
              role="dialog"
              style={[
                styles.modal,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeading}>
                  <View style={styles.copy}>
                    <AppText variant="caption" tone="muted">
                      Air 日誌詳細資訊
                    </AppText>
                    <AppText variant="title" weight="900">
                      {selectedItem.activitySummary}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityLabel="關閉 Air 日誌詳細資訊"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setSelectedItem(null)}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                    <AppText variant="title-small" weight="800">
                      ×
                    </AppText>
                  </Pressable>
                </View>

                <>
                  <View style={[styles.detailFact, { backgroundColor: palette.background }]}>
                    <AppText variant="body-small" weight="700" style={styles.environmentCopy}>
                      {weatherIcon(selectedItem.weatherSummary)}{' '}
                      {weatherLabel(selectedItem.weatherSummary)}
                    </AppText>
                    {selectedItem.aqi === undefined ? (
                      <AppText variant="caption" tone="muted">
                        AQI 未保存
                      </AppText>
                    ) : (
                      <View
                        style={[styles.aqiBadge, { backgroundColor: aqiColor(selectedItem.aqi) }]}>
                        <AppText variant="caption" weight="900" style={styles.aqiText}>
                          AQI {selectedItem.aqi}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="body-small" tone="muted">
                    {selectedItem.locationName} · {formatDateTime(selectedItem.createdAt)}
                  </AppText>
                  <View
                    style={[
                      styles.detailRisk,
                      { backgroundColor: riskSoft(selectedItem.riskLevel, palette) },
                    ]}>
                    <AppText variant="caption" weight="800">
                      {RISK_LABEL[selectedItem.riskLevel]}
                    </AppText>
                  </View>
                  <AppText weight="800">{selectedItem.headline}</AppText>
                  {selectedItem.recommendedPlanSummary ? (
                    <AppText tone="muted">
                      方案：{selectedItem.recommendedPlanSummary}
                    </AppText>
                  ) : null}
                  <View style={[styles.detailFeedback, { backgroundColor: palette.background }]}>
                    <AppText variant="caption" weight="800" tone="accent">
                      活動後回饋
                    </AppText>
                    {selectedFeedback ? (
                      <>
                        <AppText variant="body-small">
                          {feedbackSummary(selectedFeedback)}
                        </AppText>
                        {selectedFeedback.note ? (
                          <AppText variant="body-small" tone="muted">
                            「{selectedFeedback.note}」
                          </AppText>
                        ) : null}
                      </>
                    ) : (
                      <AppText variant="body-small" tone="muted">
                        尚未留下回饋
                      </AppText>
                    )}
                  </View>
                  <AppText variant="body-small" tone="muted">
                    摘要與回饋會先保存在這台裝置；後端啟用帳號同步時，會加密同步到你的
                    AirMe 帳號。這些紀錄不會被解讀為醫療因果。
                  </AppText>
                  <AppButton
                    label={selectedFeedback ? '編輯活動回饋' : '填寫活動回饋'}
                    variant="secondary"
                    onPress={() => openFeedback(selectedItem)}
                  />
                </>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      {feedbackItem ? (
        <Modal
          animationType="slide"
          onRequestClose={() => setFeedbackItem(null)}
          transparent
          visible>
          <View style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}>
            <View
              accessibilityLabel="活動後回饋"
              accessibilityViewIsModal
              role="dialog"
              style={[
                styles.modal,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}>
              <FeedbackEditor
                existing={feedbackTarget}
                item={feedbackItem}
                onClose={() => setFeedbackItem(null)}
                onSaved={() => setFeedbackItem(null)}
                onSubmit={onSubmitFeedback}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function FeedbackEditor({
  existing,
  item,
  onClose,
  onSaved,
  onSubmit,
}: {
  existing?: Feedback;
  item: RecommendationHistoryItem;
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (value: FeedbackInput) => Promise<void>;
}) {
  const palette = usePalette();
  const [completed, setCompleted] = useState<boolean | null>(existing?.completed ?? null);
  const [discomfort, setDiscomfort] = useState<Feedback['discomfort'] | null>(
    existing?.discomfort ?? null,
  );
  const [helpful, setHelpful] = useState<Feedback['helpful'] | null>(
    existing?.helpful ?? null,
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const complete = completed !== null && discomfort !== null && helpful !== null;

  const save = async () => {
    if (!complete || completed === null || discomfort === null || helpful === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        recommendationId: item.id,
        completed,
        discomfort,
        helpful,
        note: note.trim() || undefined,
      });
      setSaving(false);
      onSaved();
      return;
    } catch {
      setSaveError('回饋儲存失敗，內容仍保留在畫面上，請再試一次。');
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.modalContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.modalHeading}>
        <View style={styles.copy}>
          <AppText variant="caption" tone="muted">
            {item.activitySummary}
          </AppText>
          <AppText variant="title" weight="900">
            {existing ? '編輯活動後回饋' : '留下活動後回饋'}
          </AppText>
        </View>
        <Pressable
          accessibilityLabel="關閉活動後回饋"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <AppText variant="title-small" weight="800">
            ×
          </AppText>
        </Pressable>
      </View>

      <AppText variant="body-small" tone="muted">
        回饋會先保存在這台裝置；後端啟用帳號同步時會加密同步摘要與回饋。AirMe
        不會據此判定不舒服的原因或醫療因果。
      </AppText>

      <FeedbackChoices
        label="後來有進行這項活動嗎？"
        values={[
          ['有', true],
          ['沒有', false],
        ]}
        selected={completed}
        onSelect={setCompleted}
      />
      <FeedbackChoices
        label="活動後有不舒服嗎？"
        values={[
          ['沒有', 'none'],
          ['輕微', 'mild'],
          ['明顯', 'obvious'],
          ['不想回答', 'prefer-not'],
        ]}
        selected={discomfort}
        onSelect={setDiscomfort}
      />
      <FeedbackChoices
        label="這張建議有幫助嗎？"
        values={[
          ['有', 'yes'],
          ['沒有', 'no'],
          ['不確定', 'unsure'],
        ]}
        selected={helpful}
        onSelect={setHelpful}
      />

      <View style={styles.choiceGroup}>
        <AppText variant="body-small" weight="700">
          想提醒自己的事（選填）
        </AppText>
        <TextInput
          accessibilityLabel="回饋備註（選填）"
          maxLength={240}
          multiline
          onChangeText={setNote}
          placeholder="例如：下次提早出發"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.background,
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
          textAlignVertical="top"
          value={note}
        />
        <AppText variant="caption" tone="muted" style={styles.counter}>
          {note.length} / 240
        </AppText>
      </View>

      {saveError ? (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={[styles.saveError, { backgroundColor: palette.destructiveSoft }]}>
          <AppText tone="danger" weight="700">
            {saveError}
          </AppText>
        </View>
      ) : null}

      <AppButton
        label={saving ? '正在儲存回饋' : existing ? '儲存回饋修改' : '儲存活動回饋'}
        disabled={!complete}
        loading={saving}
        onPress={() => void save()}
      />
    </ScrollView>
  );
}

function FeedbackChoices<T extends string | boolean>({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly [string, T][];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <AppText variant="body-small" weight="700">
        {label}
      </AppText>
      <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.chips}>
        {values.map(([optionLabel, value]) => (
          <Chip
            accessibilityLabel={`${label}：${optionLabel}`}
            key={optionLabel}
            label={optionLabel}
            selected={selected === value}
            onPress={() => onSelect(value)}
          />
        ))}
      </View>
    </View>
  );
}

function taipeiDateKey(value: string): string {
  const parts = DATE_KEY_FORMATTER.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function feedbackSummary(entry: Feedback): string {
  return `${entry.completed ? '已進行活動' : '沒有進行活動'} · ${
    DISCOMFORT_LABEL[entry.discomfort]
  } · ${HELPFUL_LABEL[entry.helpful]}`;
}

function weatherLabel(summary?: string): string {
  return summary?.trim() || '天氣未保存';
}

function weatherIcon(summary?: string): string {
  if (!summary) return '☁';
  return /雨|雷/u.test(summary) ? '🌧' : '☁';
}

function riskAccent(level: RiskLevel, palette: ReturnType<typeof usePalette>): string {
  if (level === 'low') return palette.success;
  if (level === 'moderate') return palette.warning;
  if (level === 'high') return palette.high;
  return palette.destructive;
}

function riskSoft(level: RiskLevel, palette: ReturnType<typeof usePalette>): string {
  if (level === 'low') return palette.successSoft;
  if (level === 'moderate') return palette.warningSoft;
  if (level === 'high') return palette.highSoft;
  return palette.destructiveSoft;
}

function aqiColor(aqi: number): string {
  if (aqi <= 50) return '#238B57';
  if (aqi <= 100) return '#9A6700';
  if (aqi <= 150) return '#C45100';
  return '#B42318';
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  filters: { gap: spacing.md, width: '100%' },
  filterGroup: { gap: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  cardWide: { flexBasis: '46%', flexGrow: 1 },
  cardNarrow: { width: '100%' },
  cardBody: { gap: spacing.lg },
  colorBar: { borderRadius: radii.pill, height: 6, width: 72 },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  facts: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.md },
  environmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  environmentCopy: { flex: 1 },
  aqiBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  aqiText: { color: '#FFFFFF' },
  detailHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  checkIn: { borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md },
  pressed: { opacity: 0.72 },
  emptyCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  centeredText: { maxWidth: 460, textAlign: 'center' },
  noResults: { gap: spacing.md, width: '100%' },
  modalBackdrop: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.lg },
  modal: {
    borderRadius: radii.lg,
    borderWidth: borders.thin,
    maxHeight: '88%',
    maxWidth: 680,
    width: '100%',
  },
  modalContent: { gap: spacing.lg, padding: spacing.xl },
  modalHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  closeButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  detailFact: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  detailRisk: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailFeedback: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.md },
  choiceGroup: { gap: spacing.sm },
  input: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  counter: { alignSelf: 'flex-end' },
  saveError: { borderRadius: radii.md, padding: spacing.md },
});
