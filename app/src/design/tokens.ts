import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const borders = {
  thin: 1,
  thick: 1,
} as const;

export const shadows = {
  offset: { width: 0, height: 8 },
  color: 'rgba(31, 94, 65, 0.12)',
} as const;

export const typography = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', web: 'Noto Sans TC, system-ui' }),
  size: {
    caption: 12,
    body: 16,
    bodySmall: 14,
    titleSmall: 18,
    title: 26,
    display: 48,
  },
  lineHeight: {
    caption: 18,
    body: 25,
    bodySmall: 22,
    titleSmall: 26,
    title: 36,
    display: 58,
  },
} as const;

const light = {
  background: '#F4FBF7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  text: '#173B2A',
  textMuted: '#617268',
  border: '#D8E7DF',
  primary: '#237A50',
  onPrimary: '#FFFFFF',
  accent: '#237A50',
  accentSoft: '#DDF4E7',
  airSoft: '#DDF4E7',
  air: '#2F8D62',
  coral: '#237A50',
  yellow: '#E8F6ED',
  teal: '#DDF4E7',
  sky: '#BCEACC',
  cream: '#F4FBF7',
  ink: '#173B2A',
  destructive: '#B42318',
  destructiveSoft: '#FDE3DF',
  warning: '#765B00',
  warningSoft: '#FFF4CC',
  success: '#176B53',
  successSoft: '#DDF4E7',
  high: '#9B3B0A',
  highSoft: '#FFE4D1',
  overlay: 'rgba(23,59,42,0.45)',
} as const;

export type Palette = typeof light;

export function usePalette(): Palette {
  return light;
}

export const lightPalette = light;
