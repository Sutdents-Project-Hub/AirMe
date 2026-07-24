import type { Feedback, RecommendationHistoryItem, RiskLevel } from '@airme/contracts';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { borders, radii, spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';
import { Chip } from './ui/chip';

const RISK_LABEL: Record<RiskLevel, string> = {
  low: '風險較低',
  moderate: '需要留意',
  high: '風險偏高',
  'very-high': '建議避免',
};

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

export function HistoryList({
  items,
  feedback,
  onSubmitFeedback,
}: {
  items: RecommendationHistoryItem[];
  feedback: Feedback[];
  onSubmitFeedback: (value: Omit<Feedback, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<RecommendationHistoryItem | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<RecommendationHistoryItem | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [discomfort, setDiscomfort] = useState<Feedback['discomfort'] | null>(null);
  const [helpful, setHelpful] = useState<Feedback['helpful'] | null>(null);
  const [note, setNote] = useState('');

  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(value));
  const dates = [...new Set(items.map((item) => item.createdAt.slice(0, 10)))];
  const filteredItems = items.filter(
    (item) =>
      (selectedDate === 'all' || item.createdAt.startsWith(selectedDate)) &&
      (selectedRisk === 'all' || item.riskLevel === selectedRisk),
  );
  const openFeedback = (item: RecommendationHistoryItem) => {
    const checkIn = feedback.find((entry) => entry.recommendationId === item.id);
    setSelectedItem(null);
    setFeedbackItem(item);
    setCompleted(checkIn?.completed ?? null);
    setDiscomfort(checkIn?.discomfort ?? null);
    setHelpful(checkIn?.helpful ?? null);
    setNote(checkIn?.note ?? '');
  };
  const feedbackTarget = feedbackItem
    ? feedback.find((entry) => entry.recommendationId === feedbackItem.id)
    : undefined;
  if (items.length === 0) {
    return (
      <Card>
        <AppText variant="title-small" weight="800">還沒有 Air 日誌</AppText>
        <AppText tone="muted">
          產生第一張行動卡後，這裡會保存結構化活動、環境、建議與主觀回饋。
        </AppText>
      </Card>
    );
  }
  return (
    <View style={styles.list}>
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <AppText variant="caption" weight="800" tone="muted">日期</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="全部" selected={selectedDate === 'all'} onPress={() => setSelectedDate('all')} />
            {dates.map((date) => (
              <Chip key={date} label={dateLabel(date)} selected={selectedDate === date} onPress={() => setSelectedDate(date)} />
            ))}
          </ScrollView>
        </View>
        <View style={styles.filterGroup}>
          <AppText variant="caption" weight="800" tone="muted">風險程度</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="全部" selected={selectedRisk === 'all'} onPress={() => setSelectedRisk('all')} />
            {(Object.keys(RISK_LABEL) as RiskLevel[]).map((level) => (
              <Chip key={level} label={RISK_LABEL[level]} selected={selectedRisk === level} onPress={() => setSelectedRisk(level)} />
            ))}
          </ScrollView>
        </View>
      </View>
      {filteredItems.length === 0 ? (
        <Card><AppText tone="muted">沒有符合目前篩選條件的 Air 日誌。</AppText></Card>
      ) : filteredItems.map((item) => {
        const checkIn = feedback.find((entry) => entry.recommendationId === item.id);
        return (
          <Card key={item.id} style={wide ? styles.cardWide : styles.cardNarrow}>
            <View style={[styles.colorBar, { backgroundColor: riskAccent(item.riskLevel, palette) }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`查看 ${item.activitySummary} 詳細資訊`}
              onPress={() => setSelectedItem(item)}
              style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}>
              <View style={styles.top}>
                <View style={styles.copy}>
                  <AppText variant="body-small" tone="muted">
                    {new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}
                  </AppText>
                  <AppText variant="title-small" weight="800">{item.activitySummary}</AppText>
                </View>
                <View style={[styles.badge, { backgroundColor: riskSoft(item.riskLevel, palette) }]}>
                  <AppText variant="caption" weight="800">{RISK_LABEL[item.riskLevel]}</AppText>
                </View>
              </View>
              <View style={[styles.facts, { backgroundColor: palette.background }]}> 
                {item.aqi === undefined ? <AppText variant="body-small" weight="700">當時環境細節未保存</AppText> : <View style={styles.environmentRow}>
                  <AppText variant="body-small" weight="700">{weatherIcon(item.weatherSummary)} {item.weatherSummary}</AppText>
                  <View style={[styles.aqiBadge, { backgroundColor: aqiColor(item.aqi) }]}><AppText variant="caption" weight="900" style={{ color: '#FFFFFF' }}>AQI {item.aqi}</AppText></View>
                </View>}
                <AppText variant="body-small" tone="muted">{item.locationName}</AppText>
              </View>
              <View style={styles.detailHint}>
                <AppText variant="caption" weight="700" tone="muted">查看詳情</AppText>
                <AppText variant="caption" weight="900" tone="muted">›</AppText>
              </View>
            </Pressable>

            <View style={[styles.checkIn, { borderTopColor: palette.border }]}>
              <AppButton
                label={checkIn ? '✏ 編輯回饋' : '＋ 填寫回饋'}
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
      })}
      <Modal visible={selectedItem !== null} animationType="fade" transparent onRequestClose={() => setSelectedItem(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeading}>
                <View style={styles.copy}>
                  <AppText variant="caption" tone="muted">Air 日誌詳細資訊</AppText>
                  <AppText variant="title" weight="900">{selectedItem?.activitySummary}</AppText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="關閉詳細資訊" onPress={() => setSelectedItem(null)} style={styles.closeButton}><AppText variant="title-small" weight="800">×</AppText></Pressable>
              </View>
              {selectedItem ? <>
                <View style={[styles.detailFact, { backgroundColor: palette.background }]}>
                  <AppText variant="body-small" weight="700">{weatherIcon(selectedItem.weatherSummary)} {selectedItem.weatherSummary ?? '天氣未保存'}</AppText>
                  {selectedItem.aqi !== undefined ? <View style={[styles.aqiBadge, { backgroundColor: aqiColor(selectedItem.aqi) }]}><AppText variant="caption" weight="900" style={{ color: '#FFFFFF' }}>AQI {selectedItem.aqi}</AppText></View> : null}
                </View>
                <AppText variant="body-small" tone="muted">{selectedItem.locationName} · {new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedItem.createdAt))}</AppText>
                <View style={[styles.detailRisk, { backgroundColor: riskSoft(selectedItem.riskLevel, palette) }]}>
                  <AppText variant="caption" weight="800">{RISK_LABEL[selectedItem.riskLevel]}</AppText>
                </View>
                <AppText weight="800">{selectedItem.headline}</AppText>
                {selectedItem.recommendedPlanSummary ? <AppText tone="muted">方案：{selectedItem.recommendedPlanSummary}</AppText> : null}
                {feedback.find((entry) => entry.recommendationId === selectedItem.id) ? (
                  <View style={[styles.detailFeedback, { backgroundColor: palette.background }]}>
                    <AppText variant="caption" weight="800" tone="accent">已留下的活動回饋</AppText>
                    <AppText variant="body-small">
                      {feedback.find((entry) => entry.recommendationId === selectedItem.id)?.completed ? '已進行活動' : '沒有進行活動'}
                      {' · '}{DISCOMFORT_LABEL[feedback.find((entry) => entry.recommendationId === selectedItem.id)!.discomfort]}
                      {' · '}{HELPFUL_LABEL[feedback.find((entry) => entry.recommendationId === selectedItem.id)!.helpful]}
                    </AppText>
                  </View>
                ) : null}
                <AppButton
                  label={feedback.find((entry) => entry.recommendationId === selectedItem.id) ? '✏ 編輯回饋' : '＋ 填寫回饋'}
                  variant="secondary"
                  onPress={() => openFeedback(selectedItem)}
                />
              </> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={feedbackItem !== null} animationType="slide" transparent onRequestClose={() => setFeedbackItem(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]}>
          <View style={[styles.modal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeading}>
                <View style={styles.copy}>
                  <AppText variant="caption" tone="muted">活動後回饋</AppText>
                  <AppText variant="title" weight="900">{feedbackTarget ? '編輯回饋' : '留下回饋'}</AppText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="關閉回饋" onPress={() => setFeedbackItem(null)} style={styles.closeButton}><AppText variant="title-small" weight="800">×</AppText></Pressable>
              </View>
              <AppText variant="body-small" tone="muted">僅保存在這台裝置，不用來判定醫療因果。</AppText>
              <FeedbackChoices label="後來有進行這項活動嗎？" values={[['有', true], ['沒有', false]]} selected={completed} onSelect={setCompleted} />
              <FeedbackChoices label="活動後有不舒服嗎？" values={[['沒有', 'none'], ['輕微', 'mild'], ['明顯', 'obvious'], ['不想回答', 'prefer-not']]} selected={discomfort} onSelect={setDiscomfort} />
              <FeedbackChoices label="這張建議有幫助嗎？" values={[['有', 'yes'], ['沒有', 'no'], ['不確定', 'unsure']]} selected={helpful} onSelect={setHelpful} />
              <TextInput accessibilityLabel="回饋備註（選填）" maxLength={240} value={note} onChangeText={setNote} placeholder="選填：記下想提醒自己的事" placeholderTextColor={palette.textMuted} style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]} />
              <AppButton label={feedbackTarget ? '儲存修改' : '儲存活動回饋'} disabled={completed === null || discomfort === null || helpful === null} onPress={() => {
                if (!feedbackItem || completed === null || discomfort === null || helpful === null) return;
                void onSubmitFeedback({ recommendationId: feedbackItem.id, completed, discomfort, helpful, note: note.trim() || undefined }).then(() => setFeedbackItem(null));
              }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FeedbackChoices<T extends string | boolean>({ label, values, selected, onSelect }: { label: string; values: readonly [string, T][]; selected: T | null; onSelect: (value: T) => void }) {
  return <View style={styles.choiceGroup}><AppText variant="body-small" weight="700">{label}</AppText><View style={styles.chips}>{values.map(([label, value]) => <Chip key={label} label={label} selected={selected === value} onPress={() => onSelect(value)} />)}</View></View>;
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
  if (aqi <= 100) return '#B77900';
  if (aqi <= 150) return '#D86500';
  return '#B42318';
}

function weatherIcon(summary?: string): string {
  if (!summary) return '☁';
  return /雨|雷/.test(summary) ? '🌧' : '☁';
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  filters: { gap: spacing.md, width: '100%' },
  filterGroup: { gap: spacing.xs },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  cardWide: { flexBasis: '46%', flexGrow: 1 },
  cardNarrow: { width: '100%' },
  colorBar: { borderRadius: radii.pill, height: 6, marginHorizontal: -spacing.lg, marginTop: -spacing.lg, width: 'auto' },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  facts: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.md },
  environmentRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  aqiBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  detailHint: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  checkIn: { borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md },
  cardBody: { gap: spacing.lg },
  pressed: { opacity: 0.72 },
  modalBackdrop: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.lg },
  modal: { borderRadius: radii.lg, borderWidth: borders.thin, maxHeight: '88%', maxWidth: 680, width: '100%' },
  modalContent: { gap: spacing.lg, padding: spacing.xl },
  modalHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  closeButton: { alignItems: 'center', borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  detailFact: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  detailRisk: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  detailFeedback: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.md },
  feedbackForm: { borderTopWidth: borders.thin, gap: spacing.md, paddingTop: spacing.lg },
  choiceGroup: { gap: spacing.sm },
  input: { borderRadius: radii.md, borderWidth: borders.thin, fontFamily: typography.family, fontSize: typography.size.body, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
});
