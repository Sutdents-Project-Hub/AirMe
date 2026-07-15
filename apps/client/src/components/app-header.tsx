import { usePathname, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { borders, radii, shadows, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';

const NAV_ITEMS = [
  { href: '/' as Href, label: '今日' },
  { href: '/history' as Href, label: '活動紀錄' },
  { href: '/settings' as Href, label: '設定' },
];

export function AppHeader({ demoMode }: { demoMode: boolean }) {
  const palette = usePalette();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  return (
    <View style={[styles.header, { borderBottomColor: palette.ink }]}>
      <View style={styles.brand}>
        <View
          style={[
            styles.mark,
            styles.markShadow,
            { backgroundColor: palette.surface, borderColor: palette.ink },
          ]}>
          <AppText variant="title-small" weight="900">
            A
          </AppText>
        </View>
        <View>
          <AppText variant="title-small" weight="900">
            AirMe
          </AppText>
          <AppText variant="caption" tone="muted">
            空氣健康小管家
          </AppText>
        </View>
      </View>
      {desktop ? (
        <View style={styles.navigation}>
          {NAV_ITEMS.map((item) => {
            const selected = pathname === item.href;
            return (
              <Pressable
                key={String(item.href)}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => router.replace(item.href)}
                style={({ pressed }) => [
                  styles.navItem,
                  {
                    backgroundColor: selected ? palette.yellow : 'transparent',
                    borderColor: selected ? palette.ink : 'transparent',
                    opacity: pressed ? 0.68 : 1,
                  },
                ]}>
                <AppText variant="body-small" weight="800">
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View
        style={[
          styles.mode,
          {
            backgroundColor: demoMode ? palette.yellow : palette.teal,
            borderColor: palette.ink,
          },
        ]}>
        <AppText variant="caption" weight="800">
          {demoMode ? 'DEMO' : 'LIVE'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: borders.thick,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    minHeight: 64,
    paddingBottom: spacing.lg,
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  mark: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: borders.thick,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  markShadow: {
    ...Platform.select({
      web: { boxShadow: `4px 4px 0 ${shadows.color}` },
      default: {
        elevation: 4,
        shadowColor: shadows.color,
        shadowOffset: { height: 4, width: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
    }),
  },
  navigation: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  navItem: {
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  mode: {
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
