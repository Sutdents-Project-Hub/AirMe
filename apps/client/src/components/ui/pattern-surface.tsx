import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { usePalette } from '../../design/tokens';

export type PatternKind = 'grid' | 'dots' | 'stripes' | 'none';

interface PatternSurfaceProps extends ViewProps {
  pattern?: PatternKind;
  patternColor?: string;
  contentStyle?: ViewStyle;
}

const GRID_STEPS = Array.from({ length: 17 }, (_, index) => `${index * 6.25}%` as const);
const DOTS = Array.from({ length: 108 }, (_, index) => ({
  left: `${(index % 12) * 9}%` as const,
  top: `${Math.floor(index / 12) * 12.5}%` as const,
}));
const STRIPES = Array.from({ length: 14 }, (_, index) => index * 42 - 180);

export function PatternSurface({
  children,
  pattern = 'none',
  patternColor,
  contentStyle,
  style,
  ...props
}: PropsWithChildren<PatternSurfaceProps>) {
  const palette = usePalette();
  const color = patternColor ?? palette.ink;

  return (
    <View {...props} style={[styles.surface, style]}>
      {pattern === 'grid' ? (
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="pattern-grid"
          style={styles.pattern}>
          {GRID_STEPS.map((position) => (
            <View
              key={`vertical-${position}`}
              style={[styles.gridVertical, { backgroundColor: color, left: position }]}
            />
          ))}
          {GRID_STEPS.map((position) => (
            <View
              key={`horizontal-${position}`}
              style={[styles.gridHorizontal, { backgroundColor: color, top: position }]}
            />
          ))}
        </View>
      ) : null}
      {pattern === 'dots' ? (
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="pattern-dots"
          style={styles.pattern}>
          {DOTS.map((dot, index) => (
            <View
              key={`dot-${index}`}
              style={[styles.dot, dot, { backgroundColor: color }]}
            />
          ))}
        </View>
      ) : null}
      {pattern === 'stripes' ? (
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="pattern-stripes"
          style={styles.pattern}>
          {STRIPES.map((left) => (
            <View key={`stripe-${left}`} style={[styles.stripe, { backgroundColor: color, left }]} />
          ))}
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    position: 'relative',
  },
  pattern: {
    bottom: 0,
    left: 0,
    opacity: 0.12,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  gridVertical: {
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  gridHorizontal: {
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  dot: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    width: 3,
  },
  stripe: {
    height: '190%',
    position: 'absolute',
    top: '-44%',
    transform: [{ rotate: '38deg' }],
    width: 18,
  },
});
