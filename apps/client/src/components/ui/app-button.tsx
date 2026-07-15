import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { borders, radii, shadows, spacing, usePalette } from '../../design/tokens';
import { AppText } from './app-text';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
  accessibilityLabel?: string;
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
  accessibilityLabel,
}: AppButtonProps) {
  const palette = usePalette();
  const backgroundColor =
    variant === 'primary'
      ? palette.coral
      : variant === 'danger'
        ? palette.destructive
        : variant === 'secondary'
          ? palette.yellow
          : palette.surface;
  const textColor =
    variant === 'primary' || variant === 'danger' ? palette.onPrimary : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.shadow,
        {
          backgroundColor,
          borderColor: palette.ink,
          opacity: disabled ? 0.48 : pressed ? 0.78 : 1,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={textColor} size="small" /> : icon}
        <AppText style={{ color: textColor }} weight="700">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: borders.thick,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  shadow: {
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
  pressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
});
