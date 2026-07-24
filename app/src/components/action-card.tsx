import type { RecommendationResponse, RiskLevel } from '@airme/contracts';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { borders, radii, spacing, usePalette, type Palette } from '../design/tokens';
import { SourceDisclosure } from './source-disclosure';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

const RISK_LABELS: Record<RiskLevel, string> = {
  low: '風險較低',
  moderate: '需要留意',
  high: '風險偏高',
  'very-high': '建議避免',
};

function riskColors(level: RiskLevel, palette: Palette) {
  if (level === 'low') return { background: palette.successSoft, foreground: palette.success };
  if (level === 'moderate') return { background: palette.warningSoft, foreground: palette.warning };
  if (level === 'high') return { background: palette.highSoft, foreground: palette.high };
  return { background: palette.destructiveSoft, foreground: palette.destructive };
}

export function ActionCard({ recommendation }: { recommendation: RecommendationResponse }) {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const card = recommendation.actionCard;
  const risk = riskColors(card.riskLevel, palette);
  const compact = width < 480;
  const modeLabel = card.provenance.overall === 'live' ? '即時資料' : card.provenance.overall === 'partial' ? '部分降級' : '決賽示範';

  return (
    <View style={styles.container}>
      <Card
        pattern="dots"
        patternColor={palette.ink}
        style={{ backgroundColor: risk.background, borderColor: palette.ink }}>
        <View style={[styles.eyebrow, { backgroundColor: palette.coral, borderColor: palette.ink }]}>
          <AppText variant="caption" weight="900" style={{ color: palette.surface }}>
            AIRME ACTION PLAN
          </AppText>
        </View>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: palette.surface, borderColor: palette.ink },
            ]}>
            <AppText variant="body-small" weight="800" style={{ color: risk.foreground }}>
              {RISK_LABELS[card.riskLevel]}
            </AppText>
          </View>
          <View
            style={[
              styles.mode,
              { backgroundColor: palette.yellow, borderColor: palette.ink },
            ]}>
            <AppText variant="caption" weight="700">
              {modeLabel}
            </AppText>
          </View>
        </View>
        <View
          style={[styles.heroSummary, compact && styles.heroSummaryCompact]}
          testID="action-card-summary">
          <AppText
            variant="display"
            weight="900"
            style={[styles.heroHeadline, compact && styles.heroHeadlineCompact]}>
            {card.headline}
          </AppText>
          <View
            accessible
            accessibilityLabel={`AQI ${card.environment.airQuality.aqi}`}
            style={[
              styles.aqiOrb,
              compact && styles.aqiOrbCompact,
              { backgroundColor: risk.foreground },
            ]}>
            <AppText variant="caption" weight="900" style={{ color: palette.surface }}>
              AQI
            </AppText>
            <AppText
              variant={compact ? 'title-small' : 'title'}
              weight="900"
              style={{ color: palette.surface }}>
              {card.environment.airQuality.aqi}
            </AppText>
          </View>
        </View>
        <AppText variant="body-small" weight="700">
          {card.environment.location.name} · {card.environment.weather.summary}
          {card.environment.airQuality.primaryPollutant
            ? ` · 主要污染物 ${card.environment.airQuality.primaryPollutant}`
            : ''}
        </AppText>
      </Card>

      <Card pattern="grid" patternColor={palette.teal}>
        <AppText variant="title" weight="800">
          建議方案
        </AppText>
        <View style={styles.planGrid}>
          <PlanTile color={palette.yellow} label="時間" value={card.recommendedPlan.timing} />
          <PlanTile color={palette.sky} label="地點" value={card.recommendedPlan.location} />
          <PlanTile color={palette.teal} label="強度" value={card.recommendedPlan.intensity} />
          {card.recommendedPlan.equipment.length > 0 ? (
            <PlanTile
              color={palette.accentSoft}
              label="準備"
              value={card.recommendedPlan.equipment.join('、')}
            />
          ) : null}
        </View>
      </Card>

      <Card pattern="dots" patternColor={palette.yellow}>
        <AppText variant="title-small" weight="800">
          本次使用的事實
        </AppText>
        {card.why.map((reason, index) => (
          <View key={reason} style={styles.reason}>
            <View style={[styles.number, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="caption" weight="800" style={{ color: palette.accent }}>
                {index + 1}
              </AppText>
            </View>
            <AppText style={styles.reasonText}>{reason}</AppText>
          </View>
        ))}
      </Card>

      <Card pattern="grid" patternColor={palette.teal}>
        <AppText variant="title-small" weight="800">
          資料來源與更新時間
        </AppText>
        <SourceDisclosure sources={card.environment.sources} />
        <AppText variant="caption" tone="muted">
          官方規則：教育部校園空品措施（2023/12/18 修正）
        </AppText>
        <AppText variant="caption" tone="muted">
          規則版本：{card.provenance.rulesVersion} · 追蹤碼：{recommendation.requestId}
        </AppText>
      </Card>

      <Card
        pattern="stripes"
        patternColor={palette.surface}
        style={{ backgroundColor: palette.teal, borderColor: palette.ink }}>
        <AppText variant="title-small" weight="800">
          安全提醒
        </AppText>
        {card.safetyNotes.map((note) => (
          <AppText key={note}>• {note}</AppText>
        ))}
        <AppText variant="body-small" tone="muted">
          AirMe 不是醫療診斷工具，也不取代醫師、家長、老師或緊急協助。
        </AppText>
      </Card>
    </View>
  );
}

function PlanTile({ label, value, color }: { label: string; value: string; color: string }) {
  const palette = usePalette();
  return (
    <View
      accessible
      accessibilityLabel={`建議方案：${label}`}
      style={[styles.planTile, { backgroundColor: color, borderColor: palette.ink }]}>
      <AppText variant="caption" weight="900">
        {label}
      </AppText>
      <AppText weight="700">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { borderRadius: radii.pill, borderWidth: borders.thin, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  mode: { borderRadius: radii.pill, borderWidth: borders.thin, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  heroSummary: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  heroSummaryCompact: { alignItems: 'flex-start', flexDirection: 'column' },
  heroHeadline: { flex: 1 },
  heroHeadlineCompact: { flex: 0, width: '100%' },
  aqiOrb: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexShrink: 0,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  aqiOrbCompact: { height: 72, width: 72 },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  planTile: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    flexBasis: '46%',
    flexGrow: 1,
    gap: spacing.sm,
    minWidth: 140,
    padding: spacing.lg,
  },
  reason: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  number: { alignItems: 'center', borderRadius: 12, borderWidth: borders.thin, height: 28, justifyContent: 'center', width: 28 },
  reasonText: { flex: 1 },
});
