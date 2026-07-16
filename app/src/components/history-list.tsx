import type { Feedback, RecommendationHistoryItem, RiskLevel } from '@airme/contracts';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { radii, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

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
}: {
  items: RecommendationHistoryItem[];
  feedback: Feedback[];
}) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
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
      {items.map((item) => {
        const checkIn = feedback.find((entry) => entry.recommendationId === item.id);
        return (
          <Card key={item.id} style={wide ? styles.cardWide : styles.cardNarrow}>
            <View style={[styles.colorBar, { backgroundColor: riskAccent(item.riskLevel, palette) }]} />
            <View style={styles.top}>
              <View style={styles.copy}>
                <AppText variant="body-small" tone="muted">
                  {new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(
                    new Date(item.createdAt),
                  )}
                </AppText>
                <AppText variant="title-small" weight="800">{item.activitySummary}</AppText>
              </View>
              <View style={[styles.badge, { backgroundColor: riskSoft(item.riskLevel, palette) }]}>
                <AppText variant="caption" weight="800">{RISK_LABEL[item.riskLevel]}</AppText>
              </View>
            </View>

            <View style={[styles.facts, { backgroundColor: palette.background }]}>
              <AppText variant="body-small" weight="700">
                {item.aqi === undefined ? '當時環境細節未保存' : `AQI ${item.aqi} · ${item.weatherSummary}`}
              </AppText>
              <AppText variant="body-small" tone="muted">{item.locationName}</AppText>
            </View>

            <AppText weight="700">{item.headline}</AppText>
            {item.recommendedPlanSummary ? (
              <AppText variant="body-small" tone="muted">方案：{item.recommendedPlanSummary}</AppText>
            ) : null}

            <View style={[styles.checkIn, { borderTopColor: palette.border }]}>
              <AppText variant="caption" weight="800" tone="accent">活動後回饋</AppText>
              {checkIn ? (
                <>
                  <AppText variant="body-small">
                    {checkIn.completed ? '已進行活動' : '沒有進行活動'} · {DISCOMFORT_LABEL[checkIn.discomfort]}
                    {' · '}{HELPFUL_LABEL[checkIn.helpful]}
                  </AppText>
                  {checkIn.note ? <AppText variant="body-small" tone="muted">「{checkIn.note}」</AppText> : null}
                </>
              ) : (
                <AppText variant="body-small" tone="muted">尚未留下回饋</AppText>
              )}
            </View>
            <AppText variant="caption" tone="muted">
              {item.provenance === 'fixture' ? '決賽示範' : '環境資料'}
              {item.rulesVersion ? ` · 規則 ${item.rulesVersion}` : ''}
            </AppText>
          </Card>
        );
      })}
    </View>
  );
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

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  cardWide: { flexBasis: '46%', flexGrow: 1 },
  cardNarrow: { width: '100%' },
  colorBar: { borderRadius: radii.pill, height: 6, width: 72 },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  facts: { borderRadius: radii.md, gap: spacing.xs, padding: spacing.md },
  checkIn: { borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md },
});
