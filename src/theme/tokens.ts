import { Platform, StyleSheet } from 'react-native';

/**
 * Scale tokens shared by every theme: spacing, radii, type, shadows.
 * Colors live in themes.ts and are reached through useTheme().
 */

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
    display: 36,
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
    caps: 1.2, // Uppercase eyebrow labels
  },
  /**
   * Font families loaded in App.tsx. Custom fonts carry their own weight,
   * so pair these with fontWeight: 'normal' rather than a numeric weight.
   */
  fonts: {
    display: 'LilitaOne_400Regular',
    body: 'Nunito_400Regular',
    bodySemibold: 'Nunito_600SemiBold',
    bodyBold: 'Nunito_700Bold',
    bodyExtrabold: 'Nunito_800ExtraBold',
  },
} as const;

/**
 * Text presets: family, size, and line height only. Pair with a color from
 * the theme. Custom fonts carry their own weight, so fontWeight stays normal.
 */
export const text = StyleSheet.create({
  display: {
    fontFamily: typography.fonts.display,
    fontWeight: 'normal',
    fontSize: typography.sizes.display,
    lineHeight: 40,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontWeight: 'normal',
    fontSize: typography.sizes.xxl,
    lineHeight: 32,
  },
  sectionTitle: {
    fontFamily: typography.fonts.display,
    fontWeight: 'normal',
    fontSize: typography.sizes.lg,
    lineHeight: 24,
  },
  cardTitle: {
    fontFamily: typography.fonts.bodyExtrabold,
    fontWeight: 'normal',
    fontSize: typography.sizes.md,
    lineHeight: 22,
  },
  itemTitle: {
    fontFamily: typography.fonts.bodyBold,
    fontWeight: 'normal',
    fontSize: typography.sizes.base,
    lineHeight: 20,
  },
  body: {
    fontFamily: typography.fonts.body,
    fontWeight: 'normal',
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: typography.fonts.body,
    fontWeight: 'normal',
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  meta: {
    fontFamily: typography.fonts.bodyBold,
    fontWeight: 'normal',
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  eyebrow: {
    fontFamily: typography.fonts.bodyExtrabold,
    fontWeight: 'normal',
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    letterSpacing: typography.letterSpacing.caps,
    textTransform: 'uppercase',
  },
  labelCaps: {
    fontFamily: typography.fonts.bodyExtrabold,
    fontWeight: 'normal',
    fontSize: typography.sizes.xs,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chip: {
    fontFamily: typography.fonts.bodyExtrabold,
    fontWeight: 'normal',
    fontSize: typography.sizes.sm,
    lineHeight: 16,
  },
  button: {
    fontFamily: typography.fonts.bodyExtrabold,
    fontWeight: 'normal',
    fontSize: typography.sizes.md,
    lineHeight: 22,
  },
});

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
