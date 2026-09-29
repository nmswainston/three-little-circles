import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ProgressBarProps {
  /** 0 to 1 */
  progress: number;
  /** Fill color. Defaults to the gold primary. */
  color?: string;
  height?: number;
}

/**
 * A flat, rounded progress bar. Decorative: the row that holds it carries the
 * numbers for screen readers.
 */
export default function ProgressBar({ progress, color, height = 8 }: ProgressBarProps) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = height / 2;

  return (
    <View
      style={[styles.track, { height, borderRadius: radius, backgroundColor: t.colors.track }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {clamped > 0 && (
        <View
          style={{
            width: `${clamped * 100}%`,
            height,
            borderRadius: radius,
            backgroundColor: color ?? t.colors.primary,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
