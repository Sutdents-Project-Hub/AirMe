import type { RecommendationResponse, RiskLevel } from '@airme/contracts';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, usePalette, type Palette } from '../design/tokens';
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
  const card = recommendation.actionCard;
  const risk = riskColors(card.riskLevel, palette);
  const modeLabel = card.provenance.overall === 'live' ? '即時資料' : card.provenance.overall === 'partial' ? '部分降級' : '決賽示範';

  return (
    <View style={styles.container}>
      <Card style={{ backgroundColor: risk.background, borderColor: risk.background }}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { borderColor: risk.foreground }]}>
            <AppText variant="body-small" weight="800" style={{ color: risk.foreground }}>
              {RISK_LABELS[card.riskLevel]}
            </AppText>
          </View>
          <View style={[styles.mode, { backgroundColor: palette.surface }]}>
            <AppText variant="caption" weight="700">
              {modeLabel}
            </AppText>
          </View>
        </View>
        <AppText variant="display" weight="800">
          {card.headline}
        </AppText>
        <AppText tone="muted">
          AQI {card.environment.airQuality.aqi} · {card.environment.weather.summary}
        </AppText>
      </Card>

      <Card>
        <AppText variant="title" weight="800">
          建議方案
        </AppText>
        <PlanRow label="時間" value={card.recommendedPlan.timing} />
        <PlanRow label="地點" value={card.recommendedPlan.location} />
        <PlanRow label="強度" value={card.recommendedPlan.intensity} />
        {card.recommendedPlan.equipment.length > 0 ? (
          <PlanRow label="準備" value={card.recommendedPlan.equipment.join('、')} />
        ) : null}
      </Card>

      <Card>
        <AppText variant="title-small" weight="800">
          為什麼
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

      <Card>
        <AppText variant="title-small" weight="800">
          資料來源與更新時間
        </AppText>
        <SourceDisclosure sources={card.environment.sources} />
        <AppText variant="caption" tone="muted">
          規則版本：{card.provenance.rulesVersion} · 追蹤碼：{recommendation.requestId}
        </AppText>
      </Card>

      <Card style={{ backgroundColor: palette.airSoft, borderColor: palette.airSoft }}>
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

function PlanRow({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.planRow, { borderTopColor: palette.border }]}>
      <AppText variant="body-small" tone="muted" weight="700" style={styles.planLabel}>
        {label}
      </AppText>
      <AppText style={styles.planValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  badgeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  badge: { borderRadius: radii.pill, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  mode: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  planRow: { borderTopWidth: 1, flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.md },
  planLabel: { width: 48 },
  planValue: { flex: 1 },
  reason: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  number: { alignItems: 'center', borderRadius: 12, height: 24, justifyContent: 'center', width: 24 },
  reasonText: { flex: 1 },
});
