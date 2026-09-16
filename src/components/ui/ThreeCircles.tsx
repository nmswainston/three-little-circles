import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ThreeCirclesProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

/**
 * The app mark: three equal circles in a loose scatter, colored red, ink (gold
 * by night), and teal. Deliberately not the head-and-ears silhouette.
 */
export default function ThreeCircles({ size = 'medium', style }: ThreeCirclesProps) {
  const t = useTheme();

  const sizes = {
    small: { container: 20, circle: 7, spacing: 2 },
    medium: { container: 34, circle: 12, spacing: 3 },
    large: { container: 48, circle: 17, spacing: 4 },
  };

  const { container, circle, spacing: gap } = sizes[size];
  const fills = [t.parks.studios.accent, t.dark ? t.colors.primary : t.colors.ink, t.parks.springs.accent];

  const positions = [
    { left: 0, top: circle + gap },
    { left: circle + gap, top: 0 },
    { left: (circle + gap) * 1.8, top: circle + gap * 1.5 },
  ];

  return (
    <View style={[styles.container, { width: container, height: container }, style]}>
      {positions.map((pos, i) => (
        <View
          key={i}
          style={[
            styles.circle,
            {
              width: circle,
              height: circle,
              borderRadius: circle / 2,
              backgroundColor: fills[i],
              left: pos.left,
              top: pos.top,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  circle: {
    position: 'absolute',
  },
});
