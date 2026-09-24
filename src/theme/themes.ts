/**
 * Color themes. "Day" is the default: cream, ink, and gold in the spirit of a
 * vintage attraction poster, chosen for readability in direct sun. "Night"
 * keeps the original deep navy for evenings and dark mode.
 *
 * Each park type also gets one accent that drives its header, icon discs,
 * section labels, and progress rings. Difficulty colors stay global.
 */

export type SchemeName = 'day' | 'night';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type ParkKey = 'kingdom' | 'studios' | 'showcase' | 'adventure' | 'springs' | 'resorts';

export type ParkPalette = {
  /** Solid accent: park header, icon discs, progress rings */
  accent: string;
  /** Text and icons placed on the solid accent */
  onAccent: string;
  /** Very light wash of the accent for tinted surfaces */
  tint: string;
  /** Accent adjusted for use as small text on the theme background */
  text: string;
};

export type Chip = { bg: string; text: string };

export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  overlay: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textDark: string;
  textOnAccent: string;

  /** Gold call-to-action color */
  primary: string;
  onPrimary: string;
  primaryLight: string;

  /** Selected-state fill for chips and segmented controls */
  ink: string;
  onInk: string;

  border: string;
  borderLight: string;
  borderStrong: string;
  track: string;

  success: string;
  successLight: string;
  onSuccess: string;
  error: string;
  warning: string;

  tip: string;
  tipText: string;
  tabBar: string;
};

export type Theme = {
  name: SchemeName;
  dark: boolean;
  colors: ThemeColors;
  parks: Record<ParkKey, ParkPalette>;
  difficulty: Record<Difficulty, Chip>;
};

export const day: Theme = {
  name: 'day',
  dark: false,
  colors: {
    background: '#FFF4DC',
    backgroundSecondary: '#F7EACB',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF4DC',
    card: '#FFFFFF',
    overlay: 'rgba(31,42,68,0.55)',

    text: '#1F2A44',
    textSecondary: '#5A6280',
    textMuted: '#62698A',
    textDark: '#1F2A44',
    textOnAccent: '#FFF4DC',

    primary: '#F4B942',
    onPrimary: '#1F2A44',
    primaryLight: 'rgba(244,185,66,0.22)',

    ink: '#1F2A44',
    onInk: '#FFF4DC',

    border: 'rgba(31,42,68,0.10)',
    borderLight: 'rgba(31,42,68,0.06)',
    borderStrong: 'rgba(31,42,68,0.15)',
    track: '#F1E3C4',

    success: '#2E7D4F',
    successLight: 'rgba(46,125,79,0.16)',
    onSuccess: '#FFFFFF',
    error: '#C2262E',
    /** Amber rather than the gold accent: gold as small text on cream is unreadable (1.6:1). */
    warning: '#8A5A00',

    tip: '#FFE8B8',
    tipText: '#633806',
    tabBar: '#FFFFFF',
  },
  parks: {
    kingdom: { accent: '#2F5BEA', onAccent: '#FFFFFF', tint: '#E8EEFF', text: '#2446B8' },
    studios: { accent: '#E63946', onAccent: '#FFFFFF', tint: '#FDE6E8', text: '#C2262E' },
    showcase: { accent: '#7A4DD8', onAccent: '#FFFFFF', tint: '#EFE8FB', text: '#5E37B3' },
    adventure: { accent: '#2E7D4F', onAccent: '#FFFFFF', tint: '#E4F2EA', text: '#25663F' },
    springs: { accent: '#158C7E', onAccent: '#FFFFFF', tint: '#E0F4F1', text: '#116F64' },
    resorts: { accent: '#C2661A', onAccent: '#FFFFFF', tint: '#FBEADC', text: '#9E5215' },
  },
  difficulty: {
    Easy: { bg: '#2E7D4F', text: '#FFFFFF' },
    Medium: { bg: '#F4B942', text: '#1F2A44' },
    Hard: { bg: '#E63946', text: '#FFFFFF' },
  },
};

export const night: Theme = {
  name: 'night',
  dark: true,
  colors: {
    background: '#0B1D3A',
    backgroundSecondary: '#0F2448',
    surface: '#16295A',
    surfaceAlt: '#0F2448',
    card: '#16295A',
    overlay: 'rgba(0,0,0,0.6)',

    text: '#F5F3E7',
    textSecondary: '#B8C4DC',
    textMuted: '#93A2C6',
    textDark: '#F5F3E7',
    textOnAccent: '#0B1D3A',

    primary: '#FFC83D',
    onPrimary: '#0B1D3A',
    primaryLight: 'rgba(255,200,61,0.18)',

    ink: '#FFC83D',
    onInk: '#0B1D3A',

    border: 'rgba(245,243,231,0.12)',
    borderLight: 'rgba(245,243,231,0.06)',
    borderStrong: 'rgba(245,243,231,0.20)',
    track: '#24407A',

    success: '#4CC07A',
    successLight: 'rgba(76,192,122,0.18)',
    onSuccess: '#0B1D3A',
    error: '#FF5A6A',
    warning: '#FFC83D',

    tip: '#3A3118',
    tipText: '#FFC83D',
    tabBar: '#0F2448',
  },
  parks: {
    kingdom: { accent: '#6B8DFF', onAccent: '#0B1D3A', tint: 'rgba(107,141,255,0.16)', text: '#6B8DFF' },
    studios: { accent: '#FF5A6A', onAccent: '#0B1D3A', tint: 'rgba(255,90,106,0.16)', text: '#FF5A6A' },
    showcase: { accent: '#A98BFF', onAccent: '#0B1D3A', tint: 'rgba(169,139,255,0.16)', text: '#A98BFF' },
    adventure: { accent: '#4CC07A', onAccent: '#0B1D3A', tint: 'rgba(76,192,122,0.16)', text: '#4CC07A' },
    springs: { accent: '#3DD6C2', onAccent: '#0B1D3A', tint: 'rgba(61,214,194,0.16)', text: '#3DD6C2' },
    resorts: { accent: '#F08A3E', onAccent: '#0B1D3A', tint: 'rgba(240,138,62,0.16)', text: '#F08A3E' },
  },
  difficulty: {
    Easy: { bg: '#4CC07A', text: '#0B1D3A' },
    Medium: { bg: '#FFC83D', text: '#0B1D3A' },
    Hard: { bg: '#FF5A6A', text: '#0B1D3A' },
  },
};

export const themes: Record<SchemeName, Theme> = { day, night };
