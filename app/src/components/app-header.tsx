import { usePathname, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { borders, radii, shadows, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';

const NAV_ITEMS = [
  { href: '/' as Href, label: '今日' },
  { href: '/routes' as Href, label: '路線規劃' },
  { href: '/history' as Href, label: 'Air 日誌' },
  { href: '/settings' as Href, label: '我的 AirMe' },
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
            { backgroundColor: palette.accentSoft, borderColor: palette.border },
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
        <View
          accessibilityLabel="主要導覽"
          role="navigation"
          style={styles.navigation}>
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
                    backgroundColor: selected ? palette.accentSoft : 'transparent',
                    borderColor: 'transparent',
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
            backgroundColor: demoMode ? palette.warningSoft : palette.accentSoft,
            borderColor: demoMode ? palette.warningSoft : palette.accentSoft,
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
    borderBottomWidth: borders.thin,
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
    borderWidth: borders.thin,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  markShadow: {
    ...Platform.select({
      web: { boxShadow: `0 8px 20px ${shadows.color}` },
      default: {
        elevation: 4,
        shadowColor: shadows.color,
        shadowOffset: shadows.offset,
        shadowOpacity: 1,
        shadowRadius: 12,
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
    flexShrink: 0,
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
