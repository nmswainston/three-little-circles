import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useStyles, useTheme } from '../../theme/ThemeProvider';
import { spacing, radii, text } from '../../theme/tokens';

interface ChipProps {
  label: string;
  /** Optional Ionicons glyph shown before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
}

/** A pill-shaped filter chip. Selected chips fill with the theme's ink color. */
export default function Chip({ label, icon, selected = false, onPress }: ChipProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {icon && <Ionicons name={icon} size={16} color={selected ? t.colors.onInk : t.colors.text} />}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm - 2,
      height: 36,
      paddingHorizontal: spacing.md - 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
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
