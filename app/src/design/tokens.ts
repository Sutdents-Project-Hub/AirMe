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
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
} as const;

export const borders = {
  thin: 2,
  thick: 3,
} as const;

export const shadows = {
  offset: { width: 5, height: 5 },
  color: '#292827',
} as const;

export const typography = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', web: 'Noto Sans TC, system-ui' }),
  size: {
    caption: 12,
    body: 16,
    bodySmall: 14,
    titleSmall: 18,
    title: 24,
    display: 40,
  },
  lineHeight: {
    caption: 18,
    body: 25,
    bodySmall: 22,
    titleSmall: 26,
    title: 34,
    display: 48,
  },
} as const;

const light = {
  background: '#FFF9EC',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  text: '#292827',
  textMuted: '#5E5A55',
  border: '#292827',
  primary: '#F75B4B',
  onPrimary: '#FFFFFF',
  accent: '#08A6A6',
  accentSoft: '#C9F2EE',
  airSoft: '#C9F2EE',
  air: '#08A6A6',
  coral: '#F75B4B',
  yellow: '#FFD447',
  teal: '#08A6A6',
  sky: '#5BC0EB',
  cream: '#FFF9EC',
  ink: '#292827',
  destructive: '#B42318',
  destructiveSoft: '#FFD9D4',
  warning: '#765000',
  warningSoft: '#FFF0A8',
  success: '#176B53',
  successSoft: '#CFF3DF',
  high: '#9B3B0A',
  highSoft: '#FFD4B8',
  overlay: 'rgba(41,40,39,0.48)',
} as const;

export type Palette = typeof light;

export function usePalette(): Palette {
  return light;
}

export const lightPalette = light;
