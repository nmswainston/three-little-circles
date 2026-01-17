import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';

interface ThreeCirclesProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function ThreeCircles({ size = 'medium', style }: ThreeCirclesProps) {
  const sizes = {
    small: { container: 20, circle: 5, border: 1, spacing: 2 },
    medium: { container: 34, circle: 9, border: 1.5, spacing: 3 },
    large: { container: 48, circle: 13, border: 2, spacing: 4 },
  };

  const { container, circle, border, spacing: spacingValue } = sizes[size];

  return (
    <View style={[styles.container, { width: container, height: container }, style]}>
      <View
        style={[
          styles.circle,
          {
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            borderWidth: border,
            left: 0,
            top: circle + spacingValue,
          },
        ]}
      />
      <View
        style={[
          styles.circle,
          {
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            borderWidth: border,
            left: circle + spacingValue,
            top: 0,
          },
        ]}
      />
      <View
        style={[
          styles.circle,
          {
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            borderWidth: border,
            left: (circle + spacingValue) * 1.8,
            top: circle + spacingValue * 1.5,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderColor: colors.primary,
    opacity: 0.6,
  },
});
