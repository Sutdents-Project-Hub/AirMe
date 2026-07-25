import { usePathname, type Href } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { borders, radii, shadows, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';
import { SegmentedTabBar } from './ui/segmented-tab-bar';

const NAV_ITEMS = [
  { href: '/' as Href, label: '今日' },
  { href: '/routes' as Href, label: '路線規劃' },
  { href: '/history' as Href, label: 'Air 日誌' },
  { href: '/settings' as Href, label: '我的 AirMe' },
];

export function AppHeader() {
  const palette = usePalette();
  const pathname = usePathname();
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
          <SegmentedTabBar
            accessibilityLabel="主要分頁"
            activeHref={pathname}
            items={NAV_ITEMS}
          />
        </View>
      ) : null}
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
    justifyContent: 'center',
  },
});
