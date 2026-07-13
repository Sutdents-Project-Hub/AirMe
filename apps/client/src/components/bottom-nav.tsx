import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, usePalette } from '../design/tokens';
import { AppText } from './ui/app-text';

const ITEMS = [
  { href: '/' as Href, label: '今日', icon: 'weather-windy' as const },
  { href: '/history' as Href, label: '紀錄', icon: 'history' as const },
  { href: '/settings' as Href, label: '設定', icon: 'tune-variant' as const },
];

export function BottomNav() {
  const palette = usePalette();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navWidth = Math.min(width - spacing.xl * 2, 480);

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
              { backgroundColor: selected ? palette.accentSoft : 'transparent', opacity: pressed ? 0.7 : 1 },
            ]}>
            <MaterialCommunityIcons
              name={item.icon}
              color={selected ? palette.accent : palette.textMuted}
              size={22}
            />
            <AppText
              variant="caption"
              weight={selected ? '800' : '600'}
              style={{ color: selected ? palette.accent : palette.textMuted }}>
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
    borderWidth: 1,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    position: 'absolute',
  },
  item: { alignItems: 'center', borderRadius: radii.md, flex: 1, gap: 2, minHeight: 52, justifyContent: 'center' },
});
