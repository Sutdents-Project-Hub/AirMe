import { Redirect, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActivityComposer } from '../components/activity-composer';
import { AppHeader } from '../components/app-header';
import { EnvironmentHero } from '../components/environment-hero';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Screen } from '../components/ui/screen';
import { spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function HomeScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const { width } = useWindowDimensions();

  if (!app.hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.accent} />
        <AppText tone="muted">正在開啟 AirMe…</AppText>
      </View>
    );
  }
  if (!app.local.onboardingCompleted) return <Redirect href={'/onboarding' as Href} />;

  const submit = async (activityText: string) => {
    if (await app.createRecommendation(activityText)) {
      router.push('/recommendation' as Href);
    }
  };

  return (
    <PageShell>
      <Screen>
        <AppHeader demoMode={app.local.demoMode} />
        <View style={styles.intro}>
          <AppText variant="display" weight="900">
            先看環境，再決定怎麼動。
          </AppText>
          <AppText tone="muted">
            AirMe 把官方資料、你的最低限度設定與活動情境整理成可執行方案。
          </AppText>
        </View>
        {app.error ? (
          <Card style={{ borderColor: palette.destructive }}>
            <AppText tone="danger" weight="800">
              目前無法完成
            </AppText>
            <AppText>{app.error}</AppText>
            <AppButton label="關閉提醒" onPress={app.clearError} variant="ghost" />
          </Card>
        ) : null}
        <View style={[styles.dashboard, width >= 880 && styles.dashboardWide]}>
          <View style={styles.environmentColumn}>
            <EnvironmentHero
              environment={app.environment}
              loading={app.environmentLoading}
              demoMode={app.local.demoMode}
              onRefresh={app.refreshEnvironment}
            />
          </View>
          <View style={styles.composerColumn}>
            <ActivityComposer loading={app.busy} onSubmit={submit} />
          </View>
        </View>
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  intro: { gap: spacing.sm, maxWidth: 720 },
  dashboard: { gap: spacing.lg },
  dashboardWide: { alignItems: 'flex-start', flexDirection: 'row' },
  environmentColumn: { flex: 0.82, width: '100%' },
  composerColumn: { flex: 1.18, width: '100%' },
});
