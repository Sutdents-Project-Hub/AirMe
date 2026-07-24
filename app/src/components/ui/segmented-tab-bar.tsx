import { useEffect, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { borders, radii, spacing, usePalette } from '../../design/tokens';
import { AppText } from './app-text';

export interface SegmentedTabItem {
  href: Href;
  label: string;
}

interface SegmentedTabBarProps {
  accessibilityLabel: string;
  activeHref: string;
  items: readonly SegmentedTabItem[];
}

interface TabLayout {
  width: number;
  x: number;
}

export function SegmentedTabBar({
  accessibilityLabel,
  activeHref,
  items,
}: SegmentedTabBarProps) {
  const palette = usePalette();
  const router = useRouter();
  const [layouts, setLayouts] = useState<Record<number, TabLayout>>({});
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [indicatorX] = useState(() => new Animated.Value(0));
  const [indicatorWidth] = useState(() => new Animated.Value(0));
  const activeIndex = items.findIndex((item) => String(item.href) === activeHref);

  useEffect(() => {
    let active = true;
    let subscription: { remove?: () => void } | undefined;

    try {
      const preference = AccessibilityInfo.isReduceMotionEnabled();
      Promise.resolve(preference)
        .then((enabled) => {
          if (active) setReduceMotion(enabled);
        })
        .catch(() => {
          if (active) setReduceMotion(false);
        });
      subscription = AccessibilityInfo.addEventListener?.(
        'reduceMotionChanged',
        setReduceMotion,
      );
    } catch {
      Promise.resolve().then(() => {
        if (active) setReduceMotion(false);
      });
    }

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    const activeLayout = layouts[activeIndex];
    if (!activeLayout || reduceMotion === null) return;

    indicatorX.stopAnimation();
    indicatorWidth.stopAnimation();

    if (reduceMotion) {
      indicatorX.setValue(activeLayout.x);
      indicatorWidth.setValue(activeLayout.width);
      return;
    }

    const animation = Animated.parallel([
      Animated.spring(indicatorX, {
        damping: 22,
        mass: 0.8,
        stiffness: 240,
        toValue: activeLayout.x,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorWidth, {
        damping: 22,
        mass: 0.8,
        stiffness: 240,
        toValue: activeLayout.width,
        useNativeDriver: false,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [activeIndex, indicatorWidth, indicatorX, layouts, reduceMotion]);

  const handleLayout = (index: number, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    setLayouts((current) => {
      const previous = current[index];
      if (previous?.width === width && previous.x === x) return current;
      return { ...current, [index]: { width, x } };
    });
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}>
      {activeIndex >= 0 && layouts[activeIndex] ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              backgroundColor: palette.accentSoft,
              left: indicatorX,
              width: indicatorWidth,
            },
          ]}
          testID="segmented-tab-indicator"
        />
      ) : null}
      {items.map((item, index) => {
        const selected = String(item.href) === activeHref;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            key={String(item.href)}
            onLayout={(event) => handleLayout(index, event)}
            onPress={() => {
              if (!selected) router.replace(item.href);
            }}
            style={({ pressed }) => [
              styles.tab,
              { opacity: pressed ? 0.68 : 1 },
            ]}>
            <AppText
              variant="body-small"
              weight="800"
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
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: borders.thin,
    flexDirection: 'row',
    padding: spacing.xs,
    position: 'relative',
  },
  indicator: {
    borderRadius: radii.pill,
    bottom: spacing.xs,
    position: 'absolute',
    top: spacing.xs,
  },
  tab: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
});
