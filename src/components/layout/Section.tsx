import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import ThreeCircles from '../ui/ThreeCircles';

interface SectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  contentPadding?: boolean;
  showDivider?: boolean;
}

export default function Section({ 
  title, 
  description, 
  children, 
  contentPadding = true,
  showDivider = false,
}: SectionProps) {
  const hasTitle = Boolean(title && typeof title === 'string' && title.trim().length > 0);
  const hasDescription = Boolean(description && typeof description === 'string' && description.trim().length > 0);
  
  return (
    <View style={styles.container}>
      {(hasTitle || hasDescription) && (
        <View style={styles.header}>
          {hasTitle && <Text style={styles.title}>{title}</Text>}
          {hasDescription && <Text style={styles.description}>{description}</Text>}
        </View>
      )}
      {showDivider && (
        <View style={styles.divider}>
          <ThreeCircles size="small" />
        </View>
      )}
      <View style={[styles.content, !contentPadding && styles.contentNoPadding]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: typography.letterSpacing.tight,
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
  divider: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  contentNoPadding: {
    paddingHorizontal: 0,
  },
});
