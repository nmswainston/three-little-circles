import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useStyles } from '../../theme/ThemeProvider';
import { spacing, text } from '../../theme/tokens';
import Sunburst from '../ui/Sunburst';
import ThreeCircles from '../ui/ThreeCircles';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show the three-circle mark and wordmark above the title. */
  brand?: boolean;
}

/** Header for the tab root screens: sunburst backdrop, display title, subtitle. */
export default function PageHeader({ title, subtitle, brand = false }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <Sunburst center={{ x: 195, y: -190 + insets.top }} />
      {brand && (
        <View style={styles.brandRow}>
          <ThreeCircles size="small" />
          <Text style={styles.brand}>Three Little Circles</Text>
        </View>
      )}
      <Text style={[styles.title, brand && styles.titleAfterBrand]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    header: {
      position: 'relative',
      overflow: 'hidden',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md - 4,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    brand: {
      ...text.eyebrow,
      color: t.colors.text,
    },
    title: {
      ...text.display,
      color: t.colors.text,
    },
    titleAfterBrand: {
      marginTop: spacing.sm + 2,
    },
    subtitle: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.textSecondary,
      marginTop: 2,
    },
  });
