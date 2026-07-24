import type { RouteResponse } from '@airme/contracts';
import { Component, type ReactNode, useEffect, useMemo, useState } from 'react';
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

type MapLibreNativeModule = typeof import('@maplibre/maplibre-react-native');
type MapStatus = 'loading' | 'ready' | 'unavailable';
type RouteAlternative = RouteResponse['alternatives'][number];
type LngLat = [number, number];

const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() || null;
const DEMO_MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export function RouteMap({ route, selectedRouteId, onSelectRoute }: RouteMapProps) {
  const alternatives = route?.alternatives ?? [];
  const activeRouteId = alternatives.some((alternative) => alternative.id === selectedRouteId)
    ? selectedRouteId
    : alternatives[0]?.id ?? null;
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [maplibre, setMaplibre] = useState<MapLibreNativeModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('@maplibre/maplibre-react-native')
      .then((module) => {
        if (!cancelled) {
          setMaplibre(module);
          setMapStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setMapStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(
    () => (route ? createRouteFeatureCollection(route) : null),
    [route],
  );
  const mapStyle = MAP_STYLE_URL ?? (route?.provenance === 'fixture' ? DEMO_MAP_STYLE_URL : null);

  if (!route || alternatives.length === 0 || !activeRouteId || !geometry) {
    return <RouteUnavailable />;
  }

  if (!mapStyle) {
    return <RoutePreviewUnavailable route={route} activeRouteId={activeRouteId} onSelectRoute={onSelectRoute} />;
  }

  return (
    <View accessibilityLabel="路線預覽與方案選擇" style={styles.container}>
      {mapStatus === 'ready' && maplibre ? (
        <NativeMapBoundary fallback={<NativeMapUnavailable />}>
          <NativeRouteMap
            activeRouteId={activeRouteId}
            geometry={geometry}
            maplibre={maplibre}
            mapStyle={mapStyle}
            onSelectRoute={onSelectRoute}
            route={route}
          />
        </NativeMapBoundary>
      ) : (
        <MapLoadingOrUnavailable status={mapStatus} />
      )}
      <RouteChoices
        activeRouteId={activeRouteId}
        alternatives={alternatives}
        onSelectRoute={onSelectRoute}
      />
      <AppText variant="caption" tone="muted">
        路線：{route.attribution}。地圖圖資依設定樣式的 attribution 顯示。地圖只用於預覽，不提供轉彎導航或沿途空氣品質判定。
      </AppText>
    </View>
  );
}

function NativeRouteMap({
  activeRouteId,
  geometry,
  maplibre,
  mapStyle,
  onSelectRoute,
  route,
}: {
  activeRouteId: string;
  geometry: ReturnType<typeof createRouteFeatureCollection>;
  maplibre: MapLibreNativeModule;
  mapStyle: string;
  onSelectRoute: (routeId: string) => void;
  route: RouteResponse;
}) {
  const palette = usePalette();
  const Map = maplibre.Map;
  const Camera = maplibre.Camera;
  const GeoJSONSource = maplibre.GeoJSONSource;
  const Layer = maplibre.Layer;
  const bounds = getBounds(route);

  return (
    <View
      accessibilityHint="使用下方路線方案按鈕可切換地圖上醒目的路線。"
      accessibilityLabel={`可互動路線預覽地圖，從 ${route.origin.name} 到 ${route.destination.name}`}
      accessibilityRole="image"
      style={[styles.mapFrame, { borderColor: palette.border }]}>
      <Map
        attribution
        compass
        dragPan
        logo
        mapStyle={mapStyle}
        preferredFramesPerSecond={30}
        scaleBar
        style={styles.map}
        touchRotate={false}>
        <Camera bounds={bounds} padding={{ bottom: 44, left: 44, right: 44, top: 44 }} />
        <GeoJSONSource
          data={geometry}
          id="airme-routes"
          onPress={(event) => {
            const routeId = event.nativeEvent.features
              .map((feature) => feature.properties?.routeId)
              .find((value): value is string => typeof value === 'string');
            if (routeId) onSelectRoute(routeId);
          }}>
          <Layer
            filter={['all', ['==', 'kind', 'route'], ['!=', 'routeId', activeRouteId]]}
            id="airme-route-alternatives"
            paint={{
              'line-color': palette.textMuted,
              'line-opacity': 0.52,
              'line-width': 4,
            }}
            type="line"
          />
          <Layer
            filter={['all', ['==', 'kind', 'route'], ['==', 'routeId', activeRouteId]]}
            id="airme-route-selected-outline"
            paint={{ 'line-color': palette.surface, 'line-width': 10 }}
            type="line"
          />
          <Layer
            filter={['all', ['==', 'kind', 'route'], ['==', 'routeId', activeRouteId]]}
            id="airme-route-selected"
            paint={{ 'line-color': palette.accent, 'line-width': 6 }}
            type="line"
          />
          <Layer
            filter={['==', 'kind', 'origin']}
            id="airme-route-origin"
            paint={{
              'circle-color': palette.primary,
              'circle-radius': 8,
              'circle-stroke-color': palette.surface,
              'circle-stroke-width': 3,
            }}
            type="circle"
          />
          <Layer
            filter={['==', 'kind', 'destination']}
            id="airme-route-destination"
            paint={{
              'circle-color': palette.destructive,
              'circle-radius': 8,
              'circle-stroke-color': palette.surface,
              'circle-stroke-width': 3,
            }}
            type="circle"
          />
        </GeoJSONSource>
      </Map>
    </View>
  );
}

function MapLoadingOrUnavailable({ status }: { status: MapStatus }) {
  const palette = usePalette();
  return (
    <Card accessibilityLiveRegion="polite" style={[styles.status, { backgroundColor: palette.accentSoft }]}>
      <AppText weight="800">
        {status === 'unavailable' ? '此裝置目前無法載入地圖預覽' : '正在載入可互動地圖'}
      </AppText>
      <AppText tone="muted" variant="body-small">
        {status === 'unavailable'
          ? '仍可使用下方按鈕比較路線方案。'
          : '地圖載入失敗時會保留文字化的路線比較。'}
      </AppText>
    </Card>
  );
}

function NativeMapUnavailable() {
  const palette = usePalette();
  return (
    <Card accessibilityRole="summary" style={[styles.status, { backgroundColor: palette.warningSoft }]}>
      <AppText weight="800">此 App build 尚未啟用地圖預覽</AppText>
      <AppText tone="muted" variant="body-small">
        請使用已整合 MapLibre 的 development 或 preview build；仍可從下方比較路線方案。
      </AppText>
    </Card>
  );
}

function RouteUnavailable() {
  return (
    <Card accessibilityRole="summary" style={styles.status}>
      <AppText variant="title-small" weight="800">
        目前尚未取得可顯示的路線
      </AppText>
      <AppText tone="muted">
        待起點、終點與路線服務回應後，這裡會顯示地圖預覽。AirMe 不會以此提供即時導航或沿途空品判定。
      </AppText>
    </Card>
  );
}

function RoutePreviewUnavailable({
  route,
  activeRouteId,
  onSelectRoute,
}: {
  route: RouteResponse;
  activeRouteId: string;
  onSelectRoute: (routeId: string) => void;
}) {
  return (
    <Card accessibilityRole="summary" style={styles.status}>
      <AppText variant="title-small" weight="800">
        地圖服務尚未設定
      </AppText>
      <AppText tone="muted">
        正式環境需設定自有或已授權的 MapLibre 圖磚樣式。你仍可比較下方路線方案；AirMe 不會使用公開圖磚冒充正式地圖服務。
      </AppText>
      <RouteChoices activeRouteId={activeRouteId} alternatives={route.alternatives} onSelectRoute={onSelectRoute} />
    </Card>
  );
}

function RouteChoices({
  activeRouteId,
  alternatives,
  onSelectRoute,
}: {
  activeRouteId: string;
  alternatives: RouteAlternative[];
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

function createRouteFeatureCollection(route: RouteResponse) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...route.alternatives.map((alternative) => ({
        type: 'Feature' as const,
        properties: { kind: 'route', routeId: alternative.id },
        geometry: { type: 'LineString' as const, coordinates: alternative.coordinates },
      })),
      {
        type: 'Feature' as const,
        properties: { kind: 'origin' },
        geometry: {
          type: 'Point' as const,
          coordinates: [route.origin.longitude, route.origin.latitude] as LngLat,
        },
      },
      {
        type: 'Feature' as const,
        properties: { kind: 'destination' },
        geometry: {
          type: 'Point' as const,
          coordinates: [route.destination.longitude, route.destination.latitude] as LngLat,
        },
      },
    ],
  };
}

function getBounds(route: RouteResponse): [number, number, number, number] {
  const coordinates: LngLat[] = [
    [route.origin.longitude, route.origin.latitude],
    [route.destination.longitude, route.destination.latitude],
    ...route.alternatives.flatMap((alternative) => alternative.coordinates),
  ];
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const longitudePadding = Math.max((east - west) * 0.08, 0.004);
  const latitudePadding = Math.max((north - south) * 0.08, 0.004);
  return [
    west - longitudePadding,
    south - latitudePadding,
    east + longitudePadding,
    north + latitudePadding,
  ];
}

class NativeMapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  status: { gap: spacing.sm },
  mapFrame: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    height: 320,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  choices: { gap: spacing.sm },
  choice: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    minHeight: 64,
    padding: spacing.md,
  },
  choiceText: { gap: spacing.xs },
});
