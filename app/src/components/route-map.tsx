import type { RouteResponse } from '@airme/contracts';
import { Pressable, StyleSheet, View } from 'react-native';

import { borders, radii, spacing, usePalette } from '../design/tokens';
import { formatDistance, formatDuration } from './route-format';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

export interface RouteMapProps {
  route: RouteResponse | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

/**
 * A platform-neutral safe fallback. Expo selects `route-map.web.tsx` or
 * `route-map.native.tsx` at runtime; this component keeps unsupported targets
 * and test environments useful without pretending to offer navigation.
 */
export function RouteMap({ route, selectedRouteId, onSelectRoute }: RouteMapProps) {
  if (!route || route.alternatives.length === 0) {
    return (
      <Card accessibilityRole="summary" style={styles.unavailable}>
        <AppText variant="title-small" weight="800">
          目前尚未取得可顯示的路線
        </AppText>
        <AppText tone="muted">
          待起點、終點與路線服務回應後，這裡會顯示地圖預覽。AirMe 不會以此提供即時導航或沿途空品判定。
        </AppText>
      </Card>
    );
  }

  const activeRouteId = route.alternatives.some((alternative) => alternative.id === selectedRouteId)
    ? selectedRouteId ?? route.alternatives[0].id
    : route.alternatives[0].id;

  return (
    <Card accessibilityRole="summary" style={styles.unavailable}>
      <AppText variant="title-small" weight="800">
        此裝置目前無法載入地圖預覽
      </AppText>
      <AppText tone="muted">
        你仍可選擇路線方案並查看路線引擎的估算。地圖預覽不提供轉彎導航，也不會判定沿途空氣品質。
      </AppText>
      <RouteChoices
        activeRouteId={activeRouteId}
        alternatives={route.alternatives}
        onSelectRoute={onSelectRoute}
      />
      <AppText variant="caption" tone="muted">
        路線資料：{route.attribution}
      </AppText>
    </Card>
  );
}

type RouteAlternatives = NonNullable<RouteResponse['alternatives']>;

export function RouteChoices({
  activeRouteId,
  alternatives,
  onSelectRoute,
}: {
  activeRouteId: string;
  alternatives: RouteAlternatives;
  onSelectRoute: (routeId: string) => void;
}) {
  const palette = usePalette();
  return (
    <View accessibilityLabel="路線方案" style={styles.choices}>
      {alternatives.map((alternative, index) => {
        const selected = alternative.id === activeRouteId;
        const summary = `${formatDistance(alternative.distanceMeters)} · ${formatDuration(
          alternative.durationSeconds,
        )}`;
        return (
          <Pressable
            accessibilityHint="切換為此路線的地圖預覽"
            accessibilityLabel={`路線方案 ${index + 1}，${summary}${selected ? '，已選擇' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={alternative.id}
            onPress={() => onSelectRoute(alternative.id)}
            style={({ pressed }) => [
              styles.choice,
              {
                backgroundColor: selected ? palette.accentSoft : palette.surface,
                borderColor: selected ? palette.accent : palette.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <View style={styles.choiceText}>
              <AppText weight="800">方案 {index + 1}{selected ? ' · 已選擇' : ''}</AppText>
              <AppText tone="muted" variant="body-small">
                路線引擎預估 {summary}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  unavailable: { gap: spacing.md },
  choices: { gap: spacing.sm },
  choice: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    minHeight: 64,
    padding: spacing.md,
  },
  choiceText: { gap: spacing.xs },
});
