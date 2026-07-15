import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, type ViewProps } from 'react-native';

import { borders, radii, shadows, spacing, usePalette } from '../../design/tokens';
import { PatternSurface, type PatternKind } from './pattern-surface';

interface CardProps extends ViewProps {
  pattern?: PatternKind;
  patternColor?: string;
}

export function Card({
  children,
  pattern = 'none',
  patternColor,
  style,
  ...props
}: PropsWithChildren<CardProps>) {
  const palette = usePalette();
  return (
    <PatternSurface
      {...props}
      pattern={pattern}
      patternColor={patternColor}
      contentStyle={styles.content}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}>
      {children}
    </PatternSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: borders.thick,
    ...Platform.select({
      web: { boxShadow: `${shadows.offset.width}px ${shadows.offset.height}px 0 ${shadows.color}` },
      default: {
        elevation: 5,
        shadowColor: shadows.color,
        shadowOffset: shadows.offset,
        shadowOpacity: 1,
        shadowRadius: 0,
      },
    }),
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
  },
});
