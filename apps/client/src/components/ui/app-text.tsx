import type { PropsWithChildren } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { typography, usePalette } from '../../design/tokens';

type TextVariant = 'display' | 'title' | 'title-small' | 'body' | 'body-small' | 'caption';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: 'default' | 'muted' | 'accent' | 'danger';
  weight?: TextStyle['fontWeight'];
}

const variantStyles: Record<TextVariant, TextStyle> = {
  display: { fontSize: typography.size.display, lineHeight: typography.lineHeight.display },
  title: { fontSize: typography.size.title, lineHeight: typography.lineHeight.title },
  'title-small': {
    fontSize: typography.size.titleSmall,
    lineHeight: typography.lineHeight.titleSmall,
  },
  body: { fontSize: typography.size.body, lineHeight: typography.lineHeight.body },
  'body-small': {
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  caption: { fontSize: typography.size.caption, lineHeight: typography.lineHeight.caption },
};

export function AppText({
  children,
  variant = 'body',
  tone = 'default',
  weight,
  style,
  ...props
}: PropsWithChildren<AppTextProps>) {
  const palette = usePalette();
  const color =
    tone === 'muted'
      ? palette.textMuted
      : tone === 'accent'
        ? palette.accent
        : tone === 'danger'
          ? palette.destructive
          : palette.text;
  return (
    <Text
      {...props}
      style={[
        { color, fontFamily: typography.family, fontWeight: weight },
        variantStyles[variant],
        style,
      ]}>
      {children}
    </Text>
  );
}
