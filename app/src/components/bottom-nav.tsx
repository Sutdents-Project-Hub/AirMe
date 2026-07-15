import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borders, radii, shadows, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';

const ITEMS = [
  { href: '/' as Href, label: '今日', icon: 'weather-windy' as const },
  { href: '/routes' as Href, label: '路線', icon: 'map-marker-path' as const },
  { href: '/history' as Href, label: '日誌', icon: 'book-open-variant' as const },
  { href: '/settings' as Href, label: '我的', icon: 'account-circle-outline' as const },
];

export function BottomNav() {
  const palette = usePalette();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (width >= 900) return null;

  const navWidth = Math.min(width - spacing.lg * 2, 480);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          left: (width - navWidth) / 2,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          width: navWidth,
        },
      ]}>
      {ITEMS.map((item) => {
        const selected = pathname === item.href;
        return (
          <Pressable
            key={String(item.href)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => router.replace(item.href)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: selected ? palette.accentSoft : 'transparent',
                borderColor: 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <MaterialCommunityIcons
              name={item.icon}
              color={selected ? palette.primary : palette.textMuted}
              size={22}
            />
            <AppText
              variant="caption"
              weight={selected ? '800' : '600'}
              style={{ color: selected ? palette.primary : palette.textMuted }}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: radii.lg,
    borderWidth: borders.thin,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    position: 'absolute',
    ...Platform.select({
      web: { boxShadow: `0 12px 32px ${shadows.color}` },
      default: {
        elevation: 4,
        shadowColor: shadows.color,
        shadowOffset: shadows.offset,
        shadowOpacity: 1,
        shadowRadius: 18,
      },
    }),
  },
  item: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: borders.thin,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 52,
  },
});
