import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

const COMMUTE_LABEL = {
  walk: '步行',
  bike: '單車',
  'public-transit': '大眾運輸',
  car: '汽車',
  scooter: '機車',
} as const;

function StatBadge({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.statBadge,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}>
      <AppText variant="title-small" weight="900">{value}</AppText>
      <AppText variant="caption" tone="muted">{label}</AppText>
    </View>
  );
}

export default function SettingsScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  return (
    <PageShell>
      <Screen maxWidth={1000}>
        <AppHeader />
        <View style={styles.hero}>
          <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
            <AppText variant="body-small" weight="900" tone="accent">
              我的 AirMe
            </AppText>
          </View>
          <AppText variant="display" weight="900">
            這是你的裝置檔案，{`\n`}資料去留由你決定。
          </AppText>
          <View style={styles.stats}>
            <StatBadge label="Air 日誌" value={`${app.local.history.length} 筆`} />
            <StatBadge
              label="敏感條件"
              value={`${app.local.profile?.sensitiveConditions.length ?? 0} 項`}
            />
            <StatBadge
              label="常用通勤"
              value={
                app.local.profile
                  ? COMMUTE_LABEL[app.local.profile.commuteMode]
                  : '尚未設定'
              }
            />
          </View>
        </View>
        <View style={styles.grid}>
          <Card
            pattern="dots"
            patternColor={palette.yellow}
            style={wide ? styles.cardWide : styles.cardNarrow}>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <AppText variant="title-small" weight="800">
                  決賽示範模式
                </AppText>
                <AppText variant="body-small" tone="muted">
                  使用固定、可重播資料，不需要網路或 API 金鑰。環境與行動卡會清楚標示示範資料來源。
                </AppText>
                <AppText variant="caption" weight="800" tone="accent">
                  {app.local.demoMode ? '目前已開啟' : '目前已關閉'}
                </AppText>
              </View>
              <Switch
                accessibilityLabel="決賽示範模式"
                value={app.local.demoMode}
                onValueChange={app.setDemoMode}
                trackColor={{ false: palette.border, true: palette.air }}
              />
            </View>
          </Card>
          <Card
            pattern="grid"
            patternColor={palette.teal}
            style={wide ? styles.cardWide : styles.cardNarrow}>
            <AppText variant="title-small" weight="800">
              此裝置個人檔案
            </AppText>
            <AppText weight="700">
              {app.local.deviceProfile?.displayName ?? '尚未設定暱稱'}
            </AppText>
            <AppText tone="muted">
              常用地點：{app.local.savedLocation?.name ?? '尚未設定'}
            </AppText>
            <AppText tone="muted">
              敏感條件：{app.local.profile?.sensitiveConditions.length ?? 0} 項 · 紀錄：
              {app.local.history.length} 筆
            </AppText>
            <AppButton
              label="編輯個人檔案"
              onPress={() => router.push('/onboarding' as Href)}
              variant="secondary"
            />
          </Card>
          <Card
            pattern="stripes"
            patternColor={palette.surface}
            style={[
              wide ? styles.cardWide : styles.cardNarrow,
              { backgroundColor: palette.teal, borderColor: palette.ink },
            ]}>
            <AppText variant="title-small" weight="800">
              帳號與隱私
            </AppText>
            <AppText>
              {`• 已登入：${app.account?.email ?? '帳號狀態載入中'}`}
            </AppText>
            <AppText>• 個人檔案、日誌摘要與回饋先保存在這台裝置；啟用同步時會加密同步至目前帳號。</AppText>
            <AppText>• Live 模式只把當次推論必要內容送往 AirMe 後端。</AppText>
            <AppText>• AirMe 不做醫療診斷、不判定症狀原因，也不取代緊急協助。</AppText>
            <AppButton
              label="查看帳號"
              onPress={() => router.push('/account' as Href)}
              variant="secondary"
            />
          </Card>
          <Card
            pattern="dots"
            patternColor={palette.coral}
            style={wide ? styles.cardWide : styles.cardNarrow}>
            <AppText variant="title-small" weight="800">
              清除裝置端資料
            </AppText>
            <AppText tone="muted">這會刪除個人偏好、活動摘要與回饋，無法復原。</AppText>
            {confirmClear ? (
              <View style={styles.confirm}>
                <AppButton
                  label="確認清除全部資料"
                  variant="danger"
                  onPress={async () => {
                    await app.clearAll();
                    router.replace('/onboarding' as Href);
                  }}
                />
                <AppButton label="取消" variant="ghost" onPress={() => setConfirmClear(false)} />
              </View>
            ) : (
              <AppButton
                label="清除全部資料"
                variant="secondary"
                onPress={() => setConfirmClear(true)}
              />
            )}
          </Card>
        </View>
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 680 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statBadge: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
    minWidth: 116,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  cardWide: { flexBasis: '46%', flexGrow: 1 },
  cardNarrow: { width: '100%' },
  settingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  settingCopy: { flex: 1, gap: spacing.xs },
  confirm: { gap: spacing.sm },
});
