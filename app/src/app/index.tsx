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
import { radii, spacing, usePalette } from '../design/tokens';
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

  const submit = async (activityText: string, intent: Parameters<typeof app.createRecommendation>[1]) => {
    if (await app.createRecommendation(activityText, intent)) {
      router.push('/recommendation' as Href);
    }
  };

  return (
    <PageShell>
      <Screen>
        <AppHeader demoMode={app.local.demoMode} />
        <View style={styles.intro}>
          <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
            <AppText variant="body-small" weight="900" tone="accent">
              今日空氣行動
            </AppText>
          </View>
          <AppText variant="display" weight="900">
            先理解你，{`\n`}再決定今天怎麼動。
          </AppText>
          <AppText tone="muted">
            嗨，{app.local.deviceProfile?.displayName ?? '今天的你'}。直接說出活動計畫，AirMe 會結合官方環境資料與安全底線整理下一步。
          </AppText>
          <View style={styles.signalBars}>
            <View style={[styles.signalBar, { backgroundColor: palette.primary }]} />
            <View style={[styles.signalBarSoft, { backgroundColor: palette.sky }]} />
          </View>
        </View>
        {app.error ? (
          <Card
            pattern="dots"
            patternColor={palette.destructive}
            style={{ backgroundColor: palette.destructiveSoft, borderColor: palette.ink }}>
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
            <ActivityComposer
              loading={app.busy}
              onUnderstand={app.understandActivity}
              onSubmit={(activityText, intent) => void submit(activityText, intent)}
            />
          </View>
        </View>
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  intro: { alignSelf: 'center', gap: spacing.md, maxWidth: 760, width: '100%' },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  signalBars: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  signalBar: { borderRadius: radii.pill, height: 6, width: 72 },
  signalBarSoft: { borderRadius: radii.pill, height: 6, width: 28 },
  dashboard: { gap: spacing.xl },
  dashboardWide: { alignItems: 'stretch', flexDirection: 'row' },
  environmentColumn: { flex: 0.82, width: '100%' },
  composerColumn: { flex: 1.18, width: '100%' },
});
