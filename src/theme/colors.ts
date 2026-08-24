export const Lime = '#BEF264';
export const LimeDeep = '#A3E635';
export const LimeWash = '#F4FCE3';

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

export type Palette = {
  scheme: ColorScheme;
  lime: string;
  limeDeep: string;
  limeWash: string;
  ink: string;
  inkSoft: string;
  grey: string;
  greyLight: string;
  canvas: string;
  surface: string;
  surfaceHigh: string;
  outline: string;
  outlineStrong: string;
  onLime: string;
  pdfRed: string;
  docBlue: string;
  imageGreen: string;
  amber: string;
  error: string;
  overlay: string;
  shadow: string;
};

export const lightPalette: Palette = {
  scheme: 'light',
  lime: Lime,
  limeDeep: LimeDeep,
  limeWash: LimeWash,
  ink: '#0B1B3F',
  inkSoft: '#16264D',
  grey: '#6B7385',
  greyLight: '#9AA1B1',
  canvas: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceHigh: '#F1F4FA',
  outline: '#E3E8F0',
  outlineStrong: '#C9D2E0',
  onLime: '#0B1B3F',
  pdfRed: '#E8443A',
  docBlue: '#2C7BE5',
  imageGreen: '#16A75C',
  amber: '#F5A524',
  error: '#E8443A',
  overlay: 'rgba(11, 27, 63, 0.55)',
  shadow: 'rgba(11, 27, 63, 0.10)',
};

export const darkPalette: Palette = {
  scheme: 'dark',
  lime: Lime,
  limeDeep: LimeDeep,
  limeWash: '#243018',
  ink: '#E8ECF6',
  inkSoft: '#C5CDDC',
  grey: '#9AA5BD',
  greyLight: '#7B8599',
  canvas: '#0C1424',
  surface: '#131D30',
  surfaceHigh: '#1B263C',
  outline: '#27334A',
  outlineStrong: '#3C4A66',
  onLime: '#0B1B3F',
  pdfRed: '#FF7A70',
  docBlue: '#5AA0FF',
  imageGreen: '#3DDB86',
  amber: '#FFC46B',
  error: '#FF7A70',
  overlay: 'rgba(6, 11, 24, 0.72)',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const Radius = {
  field: 16,
  button: 999,
  card: 20,
  sheet: 28,
  chip: 12,
};

export const Sizes = {
  fieldHeight: 58,
  buttonHeight: 58,
};
