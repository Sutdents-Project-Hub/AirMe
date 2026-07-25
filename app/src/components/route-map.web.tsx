import type { RouteResponse } from '@airme/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import 'maplibre-gl/dist/maplibre-gl.css';

import { borders, radii, spacing, usePalette } from '../design/tokens';
import { formatDistance, formatDuration } from './route-format';
import { createMapboxRasterStyle } from './mapbox-style';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

export interface RouteMapProps {
  route: RouteResponse | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

type MapLibreModule = typeof import('maplibre-gl');
type MapStatus = 'loading' | 'ready' | 'unavailable';
type RouteAlternative = RouteResponse['alternatives'][number];
type LngLat = [number, number];

const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() || null;
const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN?.trim() || null;
const DEMO_MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export function RouteMap({ route, selectedRouteId, onSelectRoute }: RouteMapProps) {
  const palette = usePalette();
  const alternatives = route?.alternatives ?? [];
  const activeRouteId = alternatives.some((alternative) => alternative.id === selectedRouteId)
    ? selectedRouteId
    : alternatives[0]?.id ?? null;
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<InstanceType<MapLibreModule['Map']> | null>(null);

  const geometry = useMemo(
    () => (route ? createRouteFeatureCollection(route) : null),
    [route],
  );
  const resolvedMapStyle =
    MAP_STYLE_URL
    ?? (MAPBOX_PUBLIC_TOKEN ? createMapboxRasterStyle(MAPBOX_PUBLIC_TOKEN) : null)
    ?? (route?.provenance === 'fixture' ? DEMO_MAP_STYLE_URL : null);

  useEffect(() => {
    if (!route || !activeRouteId || !geometry || !containerRef.current || !resolvedMapStyle) return;

    let cancelled = false;
    let map: InstanceType<MapLibreModule['Map']> | null = null;
    setMapStatus('loading');

    void import('maplibre-gl')
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;

        map = new maplibre.Map({
          container: containerRef.current,
          maxZoom: 18,
          minZoom: 5,
          style: resolvedMapStyle,
        });
        mapRef.current = map;

        map.on('load', () => {
          if (cancelled || !map) return;
          map.addSource('airme-routes', { data: geometry, type: 'geojson' });
          map.addLayer({
            id: 'airme-route-alternatives',
            type: 'line',
            source: 'airme-routes',
            filter: ['all', ['==', 'kind', 'route'], ['!=', 'routeId', activeRouteId]],
            paint: {
              'line-color': palette.textMuted,
              'line-opacity': 0.52,
              'line-width': 4,
            },
          });
          map.addLayer({
            id: 'airme-route-selected-outline',
            type: 'line',
            source: 'airme-routes',
            filter: ['all', ['==', 'kind', 'route'], ['==', 'routeId', activeRouteId]],
            paint: { 'line-color': palette.surface, 'line-width': 10 },
          });
          map.addLayer({
            id: 'airme-route-selected',
            type: 'line',
            source: 'airme-routes',
            filter: ['all', ['==', 'kind', 'route'], ['==', 'routeId', activeRouteId]],
            paint: { 'line-color': palette.accent, 'line-width': 6 },
          });
          map.addLayer({
            id: 'airme-route-origin',
            type: 'circle',
            source: 'airme-routes',
            filter: ['==', 'kind', 'origin'],
            paint: {
              'circle-color': palette.primary,
              'circle-radius': 8,
              'circle-stroke-color': palette.surface,
              'circle-stroke-width': 3,
            },
          });
          map.addLayer({
            id: 'airme-route-destination',
            type: 'circle',
            source: 'airme-routes',
            filter: ['==', 'kind', 'destination'],
            paint: {
              'circle-color': palette.destructive,
              'circle-radius': 8,
              'circle-stroke-color': palette.surface,
              'circle-stroke-width': 3,
            },
          });
          map.fitBounds(getBounds(route), { duration: 0, padding: 44 });
          map.on('click', 'airme-route-alternatives', (event) => {
            const routeId = event.features?.[0]?.properties?.routeId;
            if (typeof routeId === 'string') onSelectRoute(routeId);
          });
          map.on('mouseenter', 'airme-route-alternatives', () => {
            map?.getCanvas().style.setProperty('cursor', 'pointer');
          });
          map.on('mouseleave', 'airme-route-alternatives', () => {
            map?.getCanvas().style.removeProperty('cursor');
          });
          setMapStatus('ready');
        });
      })
      .catch(() => {
        if (!cancelled) setMapStatus('unavailable');
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [activeRouteId, geometry, onSelectRoute, palette, resolvedMapStyle, route]);

  if (!route || alternatives.length === 0 || !activeRouteId) {
    return <RouteUnavailable />;
  }

  if (!resolvedMapStyle) {
    return <RoutePreviewUnavailable route={route} activeRouteId={activeRouteId} onSelectRoute={onSelectRoute} />;
  }

  return (
    <View accessibilityLabel="路線預覽與方案選擇" style={styles.container}>
      <View style={[styles.mapFrame, { borderColor: palette.border }]}>
        <div
          aria-label={`可互動路線預覽地圖，從 ${route.origin.name} 到 ${route.destination.name}`}
          ref={containerRef}
          role="region"
          style={mapContainerStyle}
        />
        {mapStatus !== 'ready' ? (
          <View
            accessibilityLiveRegion="polite"
            pointerEvents="none"
            style={[styles.mapOverlay, { backgroundColor: palette.surfaceRaised }]}>
            <AppText weight="800">
              {mapStatus === 'unavailable' ? '這個瀏覽器目前無法載入地圖預覽' : '正在載入可互動地圖'}
            </AppText>
            <AppText tone="muted" variant="body-small">
              {mapStatus === 'unavailable'
                ? '仍可使用下方按鈕比較路線方案。'
                : '地圖載入失敗時會保留文字化的路線比較。'}
            </AppText>
          </View>
        ) : null}
        <div style={attributionStyle}>
          {MAPBOX_PUBLIC_TOKEN ? '© Mapbox © OpenStreetMap contributors' : 'MapLibre 地圖預覽'}
        </div>
      </View>

      <RouteChoices
        activeRouteId={activeRouteId}
        alternatives={alternatives}
        onSelectRoute={onSelectRoute}
      />
      <AppText variant="caption" tone="muted">
        路線：{route.attribution}。地圖只用於預覽，不提供轉彎導航或沿途空氣品質判定。
      </AppText>
    </View>
  );
}

function RouteUnavailable() {
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
    <Card accessibilityRole="summary" style={styles.unavailable}>
      <AppText variant="title-small" weight="800">
        地圖服務尚未設定
      </AppText>
      <AppText tone="muted">
        正式環境需設定自有或已授權的 MapLibre 圖磚樣式。你仍可比較下方路線方案；AirMe 不會使用公開圖磚冒充正式地圖服務。
      </AppText>
      <RouteChoices activeRouteId={activeRouteId} alternatives={route.alternatives} onSelectRoute={onSelectRoute} />
      <AppText variant="caption" tone="muted">路線：{route.attribution}</AppText>
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

function getBounds(route: RouteResponse): [[number, number], [number, number]] {
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
    [west - longitudePadding, south - latitudePadding],
    [east + longitudePadding, north + latitudePadding],
  ];
}

const mapContainerStyle = {
  borderRadius: radii.md,
  height: '100%',
  overflow: 'hidden',
  width: '100%',
};

const attributionStyle = {
  background: 'rgba(255, 255, 255, 0.88)',
  borderRadius: 6,
  bottom: 8,
  fontFamily: 'Noto Sans TC, system-ui',
  fontSize: 11,
  left: 8,
  padding: '3px 6px',
  position: 'absolute' as const,
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  unavailable: { gap: spacing.md },
  mapFrame: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    height: 320,
    overflow: 'hidden',
    position: 'relative',
  },
  mapOverlay: {
    alignItems: 'center',
    bottom: spacing.lg,
    borderRadius: radii.sm,
    gap: spacing.xs,
    left: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
  },
  choices: { gap: spacing.sm },
  choice: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    minHeight: 64,
    padding: spacing.md,
  },
  choiceText: { gap: spacing.xs },
});
