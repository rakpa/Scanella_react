/**
 * Design tokens, ported from the Flutter app's `lib/core/theme/brand.dart`.
 *
 * Values are named after their role rather than their hue so screens read as
 * intent ("accent", "ink") and a palette change lands in one place.
 */

/**
 * The green used for primary buttons, links, the scan target and the accent
 * half of the wordmark.
 *
 * Deep rather than bright on purpose. White bold type sits on this in every
 * filled button and clears 9:1, and a neon green would bloom against the dark
 * camera view — thickening the very page edge the scanner is tracing.
 */
export const accent = '#0E5433';
export const accentDark = '#0A4127';
export const accentBright = '#1B7249';

/** Dark-mode counterpart: a soft mint, readable on ink without glowing. */
export const accentLight = '#81CFAB';

/** Tints of the accent, for containers and selected states. */
export const accentWash = '#ECF9F3';
export const accentTint = '#D0F2E2';

/** Near-black navy used for headings and the first half of the wordmark. */
export const ink = '#0B1B3F';
export const inkSoft = '#16264D';

/** Body copy and secondary labels. */
export const grey = '#6B7385';
export const greyLight = '#9AA1B1';

/** Page and card surfaces. */
export const surface = '#FFFFFF';
export const canvas = '#F7F9FC';

/** Input and card outlines. */
export const outline = '#E3E8F0';
export const outlineStrong = '#C9D2E0';

/** Dark-mode surfaces. */
export const inkCanvas = '#0C1424';
export const inkSurface = '#131D30';
export const inkSurfaceHigh = '#1B263C';
export const inkOutline = '#27334A';
export const greyOnDark = '#9AA5BD';
export const paperOnDark = '#E8ECF6';

/** Accents used by file-type chips. */
export const pdfRed = '#E8443A';
export const docBlue = '#2C7BE5';
export const amber = '#F5A524';

export const radius = {
  field: 16,
  button: 16,
  card: 20,
  sheet: 28,
} as const;

export const buttonHeight = 58;

export type Scheme = {
  accent: string;
  onAccent: string;
  accentContainer: string;
  onAccentContainer: string;
  canvas: string;
  surface: string;
  surfaceHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  danger: string;
};

export const lightScheme: Scheme = {
  accent,
  onAccent: '#FFFFFF',
  accentContainer: accentWash,
  onAccentContainer: accentDark,
  canvas,
  surface,
  surfaceHigh: '#F1F4FA',
  onSurface: ink,
  onSurfaceVariant: grey,
  outline,
  danger: pdfRed,
};

export const darkScheme: Scheme = {
  accent: accentLight,
  onAccent: '#042315',
  accentContainer: '#11482D',
  onAccentContainer: '#D6F2E4',
  canvas: inkCanvas,
  surface: inkSurface,
  surfaceHigh: inkSurfaceHigh,
  onSurface: paperOnDark,
  onSurfaceVariant: greyOnDark,
  outline: inkOutline,
  danger: '#FF7A70',
};
