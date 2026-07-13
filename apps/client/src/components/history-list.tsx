import type { RecommendationHistoryItem, RiskLevel } from '@airme/contracts';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

const RISK_LABEL: Record<RiskLevel, string> = {
  low: '風險較低',
  moderate: '需要留意',
  high: '風險偏高',
  'very-high': '建議避免',
};

export function HistoryList({ items }: { items: RecommendationHistoryItem[] }) {
  const palette = usePalette();
  if (items.length === 0) {
    return (
      <Card>
        <AppText variant="title-small" weight="800">
          還沒有活動紀錄
        </AppText>
        <AppText tone="muted">產生第一張行動卡後，這裡只會保存去識別化摘要。</AppText>
      </Card>
    );
  }
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Card key={item.id}>
          <View style={styles.top}>
            <View style={styles.copy}>
              <AppText variant="body-small" tone="muted">
                {new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(
                  new Date(item.createdAt),
                )}
              </AppText>
              <AppText variant="title-small" weight="800">
                {item.activitySummary}
              </AppText>
            </View>
            <View style={[styles.badge, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="caption" weight="800" style={{ color: palette.accent }}>
                {RISK_LABEL[item.riskLevel]}
              </AppText>
            </View>
          </View>
          <AppText>{item.headline}</AppText>
          <AppText variant="caption" tone="muted">
            {item.locationName} · {item.provenance === 'fixture' ? '決賽示範' : '環境資料'}
          </AppText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
