import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme, useStyles, Theme } from '../../theme/ThemeProvider';
import { spacing, radii, typography } from '../../theme/tokens';
import ThreeCircles from './ThreeCircles';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <ThreeCircles size="small" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.7}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (t: Theme) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: spacing.xxl,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: t.colors.text,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.tight,
  },
  message: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: t.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: t.colors.text,
    letterSpacing: typography.letterSpacing.tight,
  },
});
