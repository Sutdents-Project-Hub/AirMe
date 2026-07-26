import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing, usePalette } from '../../design/tokens';
import { AppText } from './app-text';
import { Card } from './card';

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared page framing for the primary AirMe flows.
 *
 * It keeps the stronger card hierarchy from the UI exploration while using the
 * existing tokens and static decoration, so it remains inexpensive and does
 * not compete with system reduced-motion preferences.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  style,
}: PropsWithChildren<PageHeroProps>) {
  const palette = usePalette();

  return (
    <Card
      pattern="dots"
      patternColor={palette.accent}
      style={[styles.card, { backgroundColor: palette.surface }, style]}>
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.cornerCircle, { backgroundColor: palette.accentSoft }]}
      />
      <View style={styles.content}>
        <View style={[styles.eyebrow, { backgroundColor: palette.accentSoft }]}>
          <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
          <AppText variant="body-small" weight="900" tone="accent">
            {eyebrow}
          </AppText>
        </View>
        <AppText variant="display" weight="900" style={styles.title}>
          {title}
        </AppText>
        {description ? <AppText tone="muted" style={styles.description}>{description}</AppText> : null}
        {children}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'center', maxWidth: 860, width: '100%' },
  content: { gap: spacing.md, maxWidth: 760 },
  eyebrow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statusDot: { borderRadius: radii.pill, height: 8, width: 8 },
  title: { maxWidth: 680 },
  description: { maxWidth: 680 },
  cornerCircle: {
    borderRadius: radii.pill,
    height: 96,
    position: 'absolute',
    right: -32,
    top: -34,
    width: 96,
  },
});
