import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function SettingsScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <PageShell>
      <Screen maxWidth={760}>
        <AppHeader demoMode={app.local.demoMode} />
        <AppText variant="display" weight="900">
          設定與資料
        </AppText>
        <Card>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <AppText variant="title-small" weight="800">
                決賽示範模式
              </AppText>
              <AppText variant="body-small" tone="muted">
                使用固定、可重播資料，不需要網路或 API 金鑰。畫面會一直清楚標示 DEMO。
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
        <Card>
          <AppText variant="title-small" weight="800">
            個人設定摘要
          </AppText>
          <AppText tone="muted">常用地點：{app.local.savedLocation?.name ?? '尚未設定'}</AppText>
          <AppText tone="muted">
            敏感條件：{app.local.profile?.sensitiveConditions.length ?? 0} 項 · 紀錄：
            {app.local.history.length} 筆
          </AppText>
          <AppButton
            label="重新設定個人偏好"
            onPress={() => router.push('/onboarding' as Href)}
            variant="secondary"
          />
        </Card>
        <Card style={{ backgroundColor: palette.airSoft, borderColor: palette.airSoft }}>
          <AppText variant="title-small" weight="800">
            隱私與安全邊界
          </AppText>
          <AppText>• 個人設定、活動摘要與回饋預設只在這台裝置。</AppText>
          <AppText>• Live 模式只把當次推論必要內容送往 AirMe 後端。</AppText>
          <AppText>• AirMe 不做醫療診斷、不判定症狀原因，也不取代緊急協助。</AppText>
        </Card>
        <Card>
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
            <AppButton label="清除全部資料" variant="secondary" onPress={() => setConfirmClear(true)} />
          )}
        </Card>
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  settingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  settingCopy: { flex: 1, gap: spacing.xs },
  confirm: { gap: spacing.sm },
});
