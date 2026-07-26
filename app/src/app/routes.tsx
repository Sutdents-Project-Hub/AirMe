import { Redirect, type Href } from 'expo-router';
import { AppHeader } from '../components/app-header';
import { PageShell } from '../components/page-shell';
import { RoutePlanner } from '../components/route-planner';
import { PageHero } from '../components/ui/page-hero';
import { Screen } from '../components/ui/screen';
import { useApp } from '../state/app-provider';

export default function RoutesScreen() {
  const app = useApp();
  if (app.hydrated && !app.account) {
    return <Redirect href={'/account' as Href} />;
  }
  if (app.hydrated && !app.local.onboardingCompleted) {
    return <Redirect href={'/onboarding' as Href} />;
  }
  return (
    <PageShell>
      <Screen maxWidth={920}>
        <AppHeader />
        <PageHero
          eyebrow="通勤與戶外時間"
          title={<>先比較怎麼走，{`\n`}再決定何時出發。</>}
          description="以開源地圖與路線服務規劃步行、單車或道路行程；不冒充即時導航、交通班次或街道級空品。"
        />
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
