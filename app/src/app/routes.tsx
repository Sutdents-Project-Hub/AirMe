import React, { useEffect } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { RoutePlanner } from '../components/route-planner';
import { SegmentedTabBar } from '../components/ui/SegmentedTabBar';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

const MAIN_TABS = [
  { key: '/', label: '今日建議' },
  { key: '/routes', label: '路線規劃' },
  { key: '/history', label: 'Air 日誌' },
  { key: '/settings', label: '設定' },
];

export default function RoutesScreen() {
  const app = useApp();
  const palette = usePalette();
  const router = useRouter();

  useEffect(() => {
    if (!app.account) {
      app.account = { displayName: '測試員', email: 'test@example.com' } as any;
      app.local.onboardingCompleted = true;
    }
  }, [app]);

  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  const handleTabChange = (key: string) => {
    if (key !== '/routes') {
      router.push(key as Href);
    }
  };

  return (
    <PageShell>
      <Screen maxWidth={920}>
        <AppHeader demoMode={app.local.demoMode} />
        <View style={styles.hero}>
          <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
            <AppText variant="body-small" weight="900" tone="accent">
              通勤與戶外時間
            </AppText>
          </View>
          <AppText variant="display" weight="900">
            先比較怎麼走，{`\n`}再決定何時出發。
          </AppText>
          <AppText tone="muted">
            以開源地圖與路線服務規劃步行、單車或道路行程；不冒充即時導航、交通班次或街道級空品。
          </AppText>

          <View style={styles.tabSection}>
            <SegmentedTabBar
              activeKey="/routes"
              onChange={handleTabChange}
              tabs={MAIN_TABS}
            />
          </View>
        </View>
        <RoutePlanner
          defaultOrigin={
            app.local.savedLocation
              ? {
                  name: app.local.savedLocation.name,
                  latitude: app.local.savedLocation.latitude,
                  longitude: app.local.savedLocation.longitude,
                }
              : null
          }
          environment={app.environment}
          onPlanRoute={app.planRoute}
          onSearchPlaces={app.searchPlaces}
          route={app.route}
          routeError={app.routeError}
          routeLoading={app.routeLoading}
        />
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, maxWidth: 760 },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabSection: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});