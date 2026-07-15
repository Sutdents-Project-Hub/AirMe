import type { EnvironmentSnapshot } from '@airme/contracts';
import { useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';

import { spacing, typography, usePalette } from '../design/tokens';
import { AppButton } from './ui/app-button';
import { AppText } from './ui/app-text';
import { Card } from './ui/card';

interface RoutePlannerProps {
  defaultOrigin: string;
  environment: EnvironmentSnapshot | null;
}

function travelMode(text: string): 'walking' | 'bicycling' | 'transit' | 'driving' {
  if (/走|步行/iu.test(text)) return 'walking';
  if (/單車|自行車|腳踏車|騎車/iu.test(text)) return 'bicycling';
  if (/公車|捷運|火車|大眾運輸/iu.test(text)) return 'transit';
  return 'driving';
}

export function RoutePlanner({ defaultOrigin, environment }: RoutePlannerProps) {
  const palette = usePalette();
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState('');
  const [departure, setDeparture] = useState('');
  const [mode, setMode] = useState('');
  const [planned, setPlanned] = useState(false);
  const valid = origin.trim().length > 1 && destination.trim().length > 1 && mode.trim().length > 0;
  const aqi = environment?.airQuality.aqi;

  const openExternalMap = async () => {
    const query = new URLSearchParams({
      api: '1',
      origin: origin.trim(),
      destination: destination.trim(),
      travelmode: travelMode(mode),
    });
    await Linking.openURL(`https://www.google.com/maps/dir/?${query.toString()}`);
  };

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.heading}>
          <AppText variant="title" weight="800">
            用一句話資料規劃這次移動
          </AppText>
          <AppText tone="muted">
            AirMe 只在這個畫面使用起終點，不會保存路線；路線結果由你主動開啟外部地圖查看。
          </AppText>
        </View>
        <RouteInput label="從哪裡出發？" value={origin} onChangeText={setOrigin} placeholder="例如：高科大第一校區" />
        <RouteInput label="要去哪裡？" value={destination} onChangeText={setDestination} placeholder="例如：楠梓運動中心" />
        <RouteInput label="預計什麼時候出發？" value={departure} onChangeText={setDeparture} placeholder="例如：今天下午四點" />
        <RouteInput label="想怎麼移動？" value={mode} onChangeText={setMode} placeholder="例如：騎單車，必要時可搭公車" />
        <AppButton label="整理出發前方案" onPress={() => setPlanned(true)} disabled={!valid} />
      </Card>

      {planned ? (
        <View style={styles.results} accessibilityLiveRegion="polite">
          <Card style={{ backgroundColor: palette.accentSoft }}>
            <AppText variant="body-small" weight="800" tone="accent">
              出發前判斷
            </AppText>
            <AppText variant="title-small" weight="800">
              {aqi === undefined
                ? '先更新環境資料，再決定戶外區段。'
                : aqi >= 101
                  ? `出發地 AQI ${aqi}，優先比較戶外時間較短的方案。`
                  : `出發地 AQI ${aqi}，仍請依活動強度與當下感受調整。`}
            </AppText>
            <AppText variant="body-small" tone="muted">
              {departure.trim() || '出發時間未填'} · {mode.trim()}
            </AppText>
          </Card>

          <View style={styles.planGrid}>
            <Card style={styles.planCard}>
              <AppText variant="caption" weight="800" tone="accent">
                方案 A
              </AppText>
              <AppText variant="title-small" weight="800">最快方案</AppText>
              <AppText tone="muted">距離與時間交由外部地圖即時估算。</AppText>
            </Card>
            <Card style={styles.planCard}>
              <AppText variant="caption" weight="800" tone="accent">
                方案 B
              </AppText>
              <AppText variant="title-small" weight="800">戶外時間較短</AppText>
              <AppText tone="muted">在地圖中比較大眾運輸或較少步行區段，實際時間需再確認。</AppText>
            </Card>
          </View>

          <Card style={{ backgroundColor: palette.warningSoft }}>
            <AppText weight="800">沿途空品資料不足</AppText>
            <AppText>
              AirMe 目前只有測站／區域級環境資料，無法分辨相鄰街道的空品差異，也不會標示「最低污染」或保證安全。
            </AppText>
          </Card>

          <AppButton label="開啟外部地圖查看路線" onPress={() => void openExternalMap()} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

function RouteInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <AppText weight="700">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        maxLength={120}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  heading: { gap: spacing.sm },
  field: { gap: spacing.sm },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: typography.family,
    fontSize: typography.size.body,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  results: { gap: spacing.lg },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  planCard: { flexBasis: '46%', flexGrow: 1, minWidth: 240 },
});
