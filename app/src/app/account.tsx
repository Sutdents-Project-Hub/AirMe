import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountForm } from '../components/account-form';
import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function AccountScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!app.hydrated) return null;
  if (app.account && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  if (app.account) {
    return (
      <PageShell>
        <Screen maxWidth={760}>
          <AppHeader demoMode={app.local.demoMode} />
          <View style={styles.hero}>
            <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
              <AppText variant="body-small" weight="900" tone="accent">
                AIRME 帳號
              </AppText>
            </View>
            <AppText variant="display" weight="900">
              歡迎回來，{`\n`}{app.account.displayName}。
            </AppText>
          </View>
          <Card>
            <View style={styles.stack}>
              <AppText variant="title-small" weight="800">
                目前登入帳號
              </AppText>
              <AppText>{app.account.email}</AppText>
              <AppText tone="muted">
                個人檔案、Air 日誌摘要與回饋會先保存在這台裝置；後端啟用同步後，會以 AES-256-GCM 加密與此帳號同步。完整活動文字、追問與路線不會上傳。
              </AppText>
              <AppButton label="回到我的 AirMe" onPress={() => router.replace('/settings' as Href)} />
              <AppButton label="登出這台裝置" onPress={() => void app.logout()} variant="secondary" loading={app.authBusy} />
              {confirmDelete ? (
                <View style={styles.stack}>
                  <AppText tone="danger" weight="800">
                    刪除後無法復原帳號、登入工作階段與加密雲端資料；這台裝置上的同步資料也會一併清除。
                  </AppText>
                  <AppButton
                    label="確認刪除 AirMe 帳號"
                    onPress={() => void app.deleteAccount()}
                    variant="danger"
                    loading={app.authBusy}
                  />
                  <AppButton label="取消" onPress={() => setConfirmDelete(false)} variant="ghost" />
                </View>
              ) : (
                <AppButton label="刪除 AirMe 帳號" onPress={() => setConfirmDelete(true)} variant="ghost" />
              )}
            </View>
          </Card>
        </Screen>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Screen maxWidth={760}>
        <AppHeader demoMode={app.local.demoMode} />
        <View style={styles.hero}>
          <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
            <AppText variant="body-small" weight="900" tone="accent">
              AIRME 帳號
            </AppText>
          </View>
          <AppText variant="display" weight="900">
            先登入，{`\n`}再建立你的 AirMe。
          </AppText>
          <AppText tone="muted">
            建立帳號後才能使用 AirMe。設定、粗略地點、日誌摘要與回饋會先留在裝置；後端啟用同步後才會加密儲存在雲端。完整活動文字、追問與路線不會同步。
          </AppText>
        </View>
        <AccountForm />
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 620 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stack: { gap: spacing.md },
});
