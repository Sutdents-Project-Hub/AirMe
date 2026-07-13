import { Platform, useColorScheme } from 'react-native';

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
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', web: 'Noto Sans TC, system-ui' }),
  size: {
    caption: 12,
    body: 16,
    bodySmall: 14,
    titleSmall: 18,
    title: 24,
    display: 34,
  },
  lineHeight: {
    caption: 18,
    body: 25,
    bodySmall: 22,
    titleSmall: 26,
    title: 34,
    display: 42,
  },
} as const;

const light = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  text: '#111827',
  textMuted: '#5B6677',
  border: '#DCE2EA',
  primary: '#15181E',
  onPrimary: '#FFFFFF',
  accent: '#0B66E4',
  accentSoft: '#E9F1FC',
  airSoft: '#E7F5F3',
  air: '#24756E',
  destructive: '#B42318',
  destructiveSoft: '#FEECEB',
  warning: '#8A5A00',
  warningSoft: '#FFF4D6',
  success: '#146C43',
  successSoft: '#E7F5ED',
  high: '#A33B08',
  highSoft: '#FFF0E6',
  overlay: 'rgba(17,24,39,0.48)',
} as const;

const dark = {
  background: '#0E1116',
  surface: '#171B22',
  surfaceRaised: '#1D222B',
  text: '#F7F8FA',
  textMuted: '#B4BDC9',
  border: '#313845',
  primary: '#F7F8FA',
  onPrimary: '#111318',
  accent: '#78AFFF',
  accentSoft: '#192D49',
  airSoft: '#143632',
  air: '#7CC9C0',
  destructive: '#FF8A80',
  destructiveSoft: '#471F1D',
  warning: '#FFD070',
  warningSoft: '#3C2C10',
  success: '#7ED6A8',
  successSoft: '#163A29',
  high: '#FFAB78',
  highSoft: '#472616',
  overlay: 'rgba(0,0,0,0.68)',
} as const;

export type Palette = typeof light | typeof dark;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const lightPalette = light;
