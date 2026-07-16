import type { EnvironmentSnapshot } from '@airme/contracts';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { borders, radii, spacing, usePalette } from '../design/tokens';
import { SourceDisclosure } from './source-disclosure';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface EnvironmentHeroProps {
  environment: EnvironmentSnapshot | null;
  loading: boolean;
  demoMode: boolean;
  onRefresh: () => void;
}

export function EnvironmentHero({
  environment,
  loading,
  demoMode,
  onRefresh,
}: EnvironmentHeroProps) {
  const palette = usePalette();
  if (!environment) {
    return (
      <Card pattern="grid" patternColor={palette.teal}>
        <AppText variant="title-small" weight="800">
          今日環境
        </AppText>
        {loading ? <ActivityIndicator color={palette.accent} /> : null}
        <AppText tone="muted">尚未取得環境資料，請重新整理。</AppText>
        <AppButton label="更新環境資料" onPress={onRefresh} variant="secondary" />
      </Card>
    );
  }

  return (
    <Card
      pattern="stripes"
      patternColor={palette.surface}
      style={{ backgroundColor: palette.teal, borderColor: palette.ink }}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <View style={[styles.eyebrow, { backgroundColor: palette.yellow, borderColor: palette.ink }]}>
            <AppText variant="caption" weight="900">
              AIR QUALITY · {environment.location.name}
            </AppText>
          </View>
          <View style={styles.aqiRow}>
            <AppText variant="display" weight="800">
              {environment.airQuality.aqi}
            </AppText>
            <View>
              <AppText variant="body-small">
                AQI
              </AppText>
              <AppText weight="700">{aqiLabel(environment.airQuality.category)}</AppText>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: palette.surface, borderColor: palette.ink },
          ]}>
          <AppText variant="caption" weight="800">
            {demoMode ? '決賽示範' : environment.provenance === 'live' ? '即時資料' : '部分降級'}
          </AppText>
        </View>
      </View>
      <View style={[styles.weather, { borderTopColor: palette.ink }]}>
        <AppText weight="700">{environment.weather.summary}</AppText>
        <AppText variant="body-small">
          {environment.weather.temperatureC === null ? '溫度未提供' : `${environment.weather.temperatureC}°C`}
          {' · '}
          {environment.weather.rainProbability === null
            ? '降雨機率未提供'
            : `降雨 ${environment.weather.rainProbability}%`}
        </AppText>
        <AppText variant="body-small" tone="muted">
          {environment.airQuality.primaryPollutant
            ? `主要污染物 ${environment.airQuality.primaryPollutant}`
            : '主要污染物未提供'}
        </AppText>
      </View>
      <SourceDisclosure sources={environment.sources} />
      <AppButton
        label={loading ? '正在更新' : '重新整理'}
        onPress={onRefresh}
        loading={loading}
        variant="ghost"
      />
    </Card>
  );
}

function aqiLabel(category: EnvironmentSnapshot['airQuality']['category']): string {
  return {
    good: '良好',
    moderate: '普通',
    'unhealthy-sensitive': '對敏感族群不健康',
    unhealthy: '對所有族群不健康',
    'very-unhealthy': '非常不健康',
    hazardous: '危害',
  }[category];
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  copy: { flex: 1, gap: spacing.xs },
  aqiRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badge: {
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weather: { borderTopWidth: borders.thick, gap: spacing.xs, paddingTop: spacing.md },
});
