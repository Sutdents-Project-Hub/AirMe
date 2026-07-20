import type {
  EnvironmentSnapshot,
  GeocodingSearchResponse,
  RouteMode,
  RoutePoint,
  RouteResponse,
} from '@airme/contracts';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { borders, radii, spacing, typography, usePalette } from '../design/tokens';
import { RouteMap, formatDistance, formatDuration } from './route-map';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface RoutePlannerProps {
  defaultOrigin: RoutePoint | null;
  environment: EnvironmentSnapshot | null;
  route: RouteResponse | null;
  routeError: string | null;
  routeLoading: boolean;
  onSearchPlaces(query: string): Promise<GeocodingSearchResponse | null>;
  onPlanRoute(input: {
    origin: RoutePoint;
    destination: RoutePoint;
    mode: RouteMode;
  }): Promise<RouteResponse | null>;
}

const MODE_OPTIONS: { id: RouteMode; label: string; description: string }[] = [
  { id: 'walking', label: '步行', description: '以步行路網估算' },
  { id: 'cycling', label: '單車', description: '以自行車路網估算' },
  { id: 'driving', label: '開車／機車', description: '以道路路網估算' },
];

export function RoutePlanner({
  defaultOrigin,
  environment,
  route,
  routeError,
  routeLoading,
  onSearchPlaces,
  onPlanRoute,
}: RoutePlannerProps) {
  const palette = usePalette();
  const [chosenOrigin, setChosenOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [mode, setMode] = useState<RouteMode>('walking');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const origin = chosenOrigin ?? defaultOrigin;

  const selectedRoute = useMemo(
    () => route?.alternatives.find((alternative) => alternative.id === selectedRouteId) ?? route?.alternatives[0] ?? null,
    [route, selectedRouteId],
  );
  const canPlan = Boolean(origin && destination && !routeLoading);
  const aqi = environment?.airQuality.aqi;

  const plan = async () => {
    if (!origin || !destination) return;
    await onPlanRoute({ origin, destination, mode });
  };

  const openExternalMap = async () => {
    if (!origin || !destination) return;
    const query = new URLSearchParams({
      api: '1',
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      travelmode: mode === 'cycling' ? 'bicycling' : mode === 'walking' ? 'walking' : 'driving',
    });
    await Linking.openURL(`https://www.google.com/maps/dir/?${query.toString()}`);
  };

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.heading}>
          <AppText variant="title" weight="800">
            規劃這次移動
          </AppText>
          <AppText tone="muted">
            選擇起終點後，AirMe 會計算可比較的路線。地點與精確座標只用在這次查詢，不會寫入 AirMe 的日誌或資料庫。
          </AppText>
        </View>
        <View style={styles.form}>
          <PlacePicker
            label="從哪裡出發？"
            key={`origin-${origin?.latitude ?? 'none'}-${origin?.longitude ?? 'none'}`}
            selected={origin}
            onSearch={onSearchPlaces}
            onSelect={setChosenOrigin}
            placeholder="搜尋車站、學校、公園或地址"
          />
          <PlacePicker
            label="要去哪裡？"
            key={`destination-${destination?.latitude ?? 'none'}-${destination?.longitude ?? 'none'}`}
            selected={destination}
            onSearch={onSearchPlaces}
            onSelect={setDestination}
            placeholder="搜尋目的地"
          />
          <View style={styles.field}>
            <AppText weight="700">移動方式</AppText>
            <View accessibilityLabel="移動方式" style={styles.modes}>
              {MODE_OPTIONS.map((option) => {
                const selected = mode === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.label}，${option.description}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => setMode(option.id)}
                    style={({ pressed }) => [
                      styles.mode,
                      {
                        backgroundColor: selected ? palette.accentSoft : palette.surface,
                        borderColor: selected ? palette.accent : palette.border,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}>
                    <AppText weight="800" style={{ color: selected ? palette.primary : palette.text }}>
                      {option.label}
                    </AppText>
                    <AppText variant="caption" tone="muted">{option.description}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <AppButton
            label="取得路線方案"
            onPress={() => void plan()}
            disabled={!canPlan}
            loading={routeLoading}
          />
        </View>
      </Card>

      <Card style={{ backgroundColor: palette.accentSoft }}>
        <AppText variant="body-small" weight="800" tone="accent">
          出發前環境提醒
        </AppText>
        <AppText variant="title-small" weight="800">
          {aqi === undefined
            ? '先更新環境資料，再判斷戶外區段。'
            : aqi >= 101
              ? `出發地 AQI ${aqi}，比較路線後仍建議縮短戶外暴露時間。`
              : `出發地 AQI ${aqi}，仍請依活動強度與當下感受調整。`}
        </AppText>
        <AppText variant="body-small" tone="muted">
          這是起點／選定區域的官方環境資料，不代表沿途街道濃度，也不會標示「最低污染」或保證安全。
        </AppText>
      </Card>

      {routeError ? (
        <Card accessibilityRole="alert" style={{ backgroundColor: palette.warningSoft }}>
          <View style={styles.alert}>
            <AppText weight="800">目前無法取得內嵌路線</AppText>
            <AppText>{routeError}</AppText>
            {origin && destination ? (
              <AppButton label="改用外部地圖查看" onPress={() => void openExternalMap()} variant="secondary" />
            ) : null}
          </View>
        </Card>
      ) : null}

      {route ? (
        <View style={styles.results}>
          <RouteMap
            route={route}
            selectedRouteId={selectedRoute?.id ?? null}
            onSelectRoute={setSelectedRouteId}
          />
          {selectedRoute ? (
            <Card>
              <View style={styles.summary}>
                <AppText variant="title-small" weight="800">
                  選擇的方案
                </AppText>
                <AppText weight="800">
                  {formatDistance(selectedRoute.distanceMeters)} · 約 {formatDuration(selectedRoute.durationSeconds)}
                </AppText>
                <AppText tone="muted">
                  以上是路線引擎估算，不包含即時路況、交通班次或背景導航。
                </AppText>
                <View style={styles.steps}>
                  {selectedRoute.steps.slice(0, 4).map((step, index) => (
                    <AppText key={`${index}-${step.instruction}`} variant="body-small">
                      {index + 1}. {step.instruction}
                    </AppText>
                  ))}
                </View>
                <AppButton label="改用外部地圖導航" onPress={() => void openExternalMap()} variant="secondary" />
              </View>
            </Card>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PlacePicker({
  label,
  selected,
  placeholder,
  onSearch,
  onSelect,
}: {
  label: string;
  selected: RoutePoint | null;
  placeholder: string;
  onSearch: (query: string) => Promise<GeocodingSearchResponse | null>;
  onSelect: (point: RoutePoint) => void;
}) {
  const palette = usePalette();
  const [query, setQuery] = useState(selected?.name ?? '');
  const [results, setResults] = useState<GeocodingSearchResponse['results']>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const response = await onSearch(query.trim());
    setResults(response?.results ?? []);
    setSearching(false);
  };

  return (
    <View style={styles.field}>
      <AppText weight="700">{label}</AppText>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel={label}
          autoCorrect={false}
          maxLength={120}
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          value={query}
        />
        <AppButton label="搜尋" onPress={() => void search()} disabled={query.trim().length < 2} loading={searching} variant="secondary" />
      </View>
      {selected ? (
        <AppText variant="caption" tone="accent">
          已選：{selected.name}
        </AppText>
      ) : null}
      {results.length > 0 ? (
        <View accessibilityLabel={`${label}搜尋結果`} style={styles.placeResults}>
          {results.map((result) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`選擇 ${result.name}`}
              key={result.id}
              onPress={() => {
                onSelect({
                  name: result.name,
                  latitude: result.latitude,
                  longitude: result.longitude,
                });
                setQuery(result.name);
                setResults([]);
              }}
              style={({ pressed }) => [
                styles.placeResult,
                { borderColor: palette.border, opacity: pressed ? 0.76 : 1 },
              ]}>
              <AppText weight="700">{result.name}</AppText>
              <AppText variant="caption" tone="muted">
                {result.administrativeArea ?? '臺灣'} · {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  heading: { gap: spacing.sm },
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  searchRow: { alignItems: 'stretch', flexDirection: 'row', gap: spacing.sm },
  input: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mode: {
    borderRadius: radii.md,
    borderWidth: borders.thin,
    flexBasis: 150,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 76,
    padding: spacing.md,
  },
  placeResults: { gap: spacing.xs },
  placeResult: { borderBottomWidth: borders.thin, gap: 2, paddingVertical: spacing.sm },
  alert: { gap: spacing.sm },
  results: { gap: spacing.lg },
  summary: { gap: spacing.sm },
  steps: { gap: spacing.xs },
});
