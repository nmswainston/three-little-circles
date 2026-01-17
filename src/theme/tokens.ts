import { Platform } from 'react-native';

/**
 * Theme tokens for Three Little Circles app
 * Extracted from HomeScreen branding for consistency
 */

// Color Palette - Archival Disney aesthetic
export const colors = {
  // Backgrounds – immersive, evening-sky feel
  background: '#0B1D3A',            // deep twilight blue
  backgroundSecondary: '#13294B',   // slightly lifted blue
  surface: '#1A2F55',               // card/section surface
  card: '#1A2F55',
  overlay: 'rgba(0,0,0,0.6)',

  // Text – warm, readable, never stark white
  text: '#F5F3E7',                  // warm off-white
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textDark: '#F5F3E7',

  // Brand accent – confident, not loud
  primary: '#3B82F6',               // classic Disney-adjacent blue
  primaryLight: 'rgba(59,130,246,0.15)',
  border: 'rgba(245,243,231,0.12)',
  borderLight: 'rgba(245,243,231,0.06)',

  // Status
  success: '#22C55E',
  successLight: 'rgba(34,197,94,0.18)',
  error: '#EF4444',
  warning: '#F59E0B',
} as const;

// Spacing Scale - generous vertical rhythm
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  huge: 64,
} as const;

// Border Radius
export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

// Typography - comfortable for outdoor readability
export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15, // Slightly larger for outdoor readability
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28, // Headers feel confident
    xxxl: 32,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 18,
    normal: 22,
    relaxed: 26, // Generous for body text
    loose: 30,
  },
  letterSpacing: {
    tight: -0.3, // Tighter for headers
    normal: 0,
    wide: 0.3,
  },
} as const;

// Shadows (Platform-specific)
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
    },
  }),
} as const;
