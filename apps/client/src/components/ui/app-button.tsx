import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, usePalette } from '../../design/tokens';
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
      ? palette.primary
      : variant === 'danger'
        ? palette.destructive
        : variant === 'secondary'
          ? palette.surface
          : 'transparent';
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
        {
          backgroundColor,
          borderColor: variant === 'secondary' ? palette.border : backgroundColor,
          opacity: disabled ? 0.48 : pressed ? 0.78 : 1,
        },
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
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
});
