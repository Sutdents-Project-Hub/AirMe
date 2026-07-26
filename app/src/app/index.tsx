import { Redirect, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActivityComposer } from '../components/activity-composer';
import { AppHeader } from '../components/app-header';
import { EnvironmentHero } from '../components/environment-hero';
import { PageShell } from '../components/page-shell';
import { AppButton } from '../components/ui/app-button';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { PageHero } from '../components/ui/page-hero';
import { Screen } from '../components/ui/screen';
import { radii, spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function HomeScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wideDashboard = width >= 880;

  if (!app.hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.accent} />
        <AppText tone="muted">正在開啟 AirMe…</AppText>
      </View>
    );
  }
  if (!app.account) return <Redirect href={'/account' as Href} />;
  if (!app.local.onboardingCompleted) return <Redirect href={'/onboarding' as Href} />;

  const submit = async (activityText: string, intent: Parameters<typeof app.createRecommendation>[1]) => {
    if (await app.createRecommendation(activityText, intent)) {
      router.push('/recommendation' as Href);
    }
  };

  const needsProfileSetup = !app.local.profile || !app.local.savedLocation;

  const environmentPanel = (
    <View
      key="environment"
      style={[styles.dashboardColumn, wideDashboard && styles.environmentColumnWide]}>
      <EnvironmentHero
        environment={app.environment}
        loading={app.environmentLoading}
        demoMode={app.local.demoMode}
        onRefresh={app.refreshEnvironment}
      />
    </View>
  );
  const composerPanel = (
    <View
      key="composer"
      style={[styles.dashboardColumn, wideDashboard && styles.composerColumnWide]}>
      <ActivityComposer
        loading={app.busy}
        onUnderstand={app.understandActivity}
        onSubmit={(activityText, intent) => void submit(activityText, intent)}
      />
    </View>
  );

  return (
    <PageShell>
      <Screen>
        <AppHeader />
        <PageHero
          eyebrow="今日空氣行動"
          title={<>先理解你，{`\n`}再決定今天怎麼動。</>}
          description={
            <>嗨，{app.local.deviceProfile?.displayName ?? '今天的你'}。直接說出活動計畫，AirMe 會結合官方環境資料與安全底線整理下一步。</>
          }>
          <View style={styles.signalBars}>
            <View style={[styles.signalBar, { backgroundColor: palette.primary }]} />
            <View style={[styles.signalBarSoft, { backgroundColor: palette.sky }]} />
          </View>
        </PageHero>
        {app.error ? (
          <Card
            accessibilityRole="alert"
            key="error"
            pattern="dots"
            patternColor={palette.destructive}
            style={{ backgroundColor: palette.destructiveSoft, borderColor: palette.ink }}>
            <AppText tone="danger" weight="800">
              目前無法完成
            </AppText>
            <AppText>{app.error}</AppText>
            {!app.local.demoMode ? (
              <AppButton
                label="切換示範模式"
                onPress={() => void app.setDemoMode(true)}
                variant="secondary"
              />
            ) : null}
            <AppButton label="關閉提醒" onPress={app.clearError} variant="ghost" />
          </Card>
        ) : null}
        {needsProfileSetup ? (
          <Card style={{ backgroundColor: palette.accentSoft }}>
            <AppText variant="title-small" weight="800">
              還差一點個人設定
            </AppText>
            <AppText tone="muted">
              先補上年齡層、常用通勤方式與粗略常用區域，AirMe 才能安全地結合環境資料給你活動建議。
            </AppText>
            <AppButton
              label="設定我的 AirMe"
              onPress={() => router.push('/onboarding' as Href)}
            />
          </Card>
        ) : (
          <View
            key="dashboard"
            style={[styles.dashboard, wideDashboard && styles.dashboardWide]}>
            {wideDashboard
              ? [environmentPanel, composerPanel]
              : [composerPanel, environmentPanel]}
          </View>
        )}
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  signalBars: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  signalBar: { borderRadius: radii.pill, height: 6, width: 72 },
  signalBarSoft: { borderRadius: radii.pill, height: 6, width: 28 },
  dashboard: { gap: spacing.xl },
  dashboardWide: { alignItems: 'stretch', flexDirection: 'row' },
  dashboardColumn: { width: '100%' },
  environmentColumnWide: { flex: 0.82 },
  composerColumnWide: { flex: 1.18 },
});
