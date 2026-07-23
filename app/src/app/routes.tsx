import React, { useCallback, useRef } from 'react';
import {
  Redirect,
  useFocusEffect,
  useRouter,
  type Href,
} from 'expo-router';
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native';

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

  /*
   * 上方 Hero 與下方 RoutePlanner 共用同一組動畫值，
   * 因此它們會使用完全相同的動畫同步進場。
   */
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  /*
   * 使用 useFocusEffect，而不是一般 useEffect。
   *
   * 這樣每次使用者重新進入 /routes 頁面時，
   * 動畫值都會重設並重新播放。
   */
  useFocusEffect(
    useCallback(() => {
      fade.setValue(0);
      slide.setValue(12);

      const entranceAnimation = Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]);

      entranceAnimation.start();

      return () => {
        entranceAnimation.stop();
      };
    }, [fade, slide])
  );

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

        {/* 上方 Hero 灰色卡片 */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor:
                  palette.surface ?? 'rgba(0,0,0,0.02)',
                borderColor:
                  palette.border ?? 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View
              style={[
                styles.eyebrow,
                {
                  backgroundColor: palette.accentSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.eyebrowDot,
                  {
                    backgroundColor: palette.accent,
                  },
                ]}
              />

              <AppText
                variant="body-small"
                weight="900"
                tone="accent"
              >
                通勤與戶外時間
              </AppText>
            </View>

            <AppText
              variant="display"
              weight="900"
              style={styles.title}
            >
              先比較怎麼走，{`\n`}再決定何時出發。
            </AppText>

            <AppText tone="muted" style={styles.subtitle}>
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
        </Animated.View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                palette.border ?? 'rgba(0,0,0,0.06)',
            },
          ]}
        />

        {/*
         * RoutePlanner 內的兩張灰色卡片會一起執行
         * 與上方 Hero 完全相同的 fade + translateY 動畫。
         */}
        <Animated.View
          style={[
            styles.routePlannerAnimation,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <RoutePlanner
            defaultOrigin={
              app.local.savedLocation
                ? {
                    name: app.local.savedLocation.name,
                    latitude:
                      app.local.savedLocation.latitude,
                    longitude:
                      app.local.savedLocation.longitude,
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
        </Animated.View>
      </Screen>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    maxWidth: 760,
  },

  heroCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },

  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  title: {
    marginTop: spacing.xs,
  },

  subtitle: {
    maxWidth: 640,
  },

  tabSection: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },

  /*
   * 不加入背景、padding 或邊框，
   * 只負責替 RoutePlanner 內的兩張卡片套用動畫。
   */
  routePlannerAnimation: {
    width: '100%',
  },
});