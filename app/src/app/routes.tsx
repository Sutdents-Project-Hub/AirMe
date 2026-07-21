import { Redirect, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { RoutePlanner } from '../components/route-planner';
import { AppText } from '../components/ui/app-text';
import { Screen } from '../components/ui/screen';
import { spacing, usePalette } from '../design/tokens';
import { useApp } from '../state/app-provider';

export default function RoutesScreen() {
  const app = useApp();
  const palette = usePalette();
  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }
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
});
