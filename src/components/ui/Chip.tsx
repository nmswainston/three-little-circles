import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Theme, useStyles } from '../../theme/ThemeProvider';
import { spacing, radii, text } from '../../theme/tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** A pill-shaped filter chip. Selected chips fill with the theme's ink color. */
export default function Chip({ label, selected = false, onPress }: ChipProps) {
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    chip: {
      height: 36,
      paddingHorizontal: spacing.md - 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipSelected: {
      backgroundColor: t.colors.ink,
      borderColor: t.colors.ink,
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      ...text.meta,
      color: t.colors.text,
    },
    labelSelected: {
      ...text.chip,
      color: t.colors.onInk,
    },
  });
