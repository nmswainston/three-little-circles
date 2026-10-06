import React from 'react';
import { Pressable, PressableProps, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useStyles, useTheme } from '../../theme/ThemeProvider';
import { spacing, radii, text } from '../../theme/tokens';

interface ChipProps {
  label: string;
  /** Optional Ionicons glyph shown before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress?: () => void;
  /** Caps text scaling, for a chip that lives in a strip of fixed height. */
  maxFontSizeMultiplier?: number;
}

/** A pill-shaped filter chip. Selected chips fill with the theme's ink color. */
export default function Chip({ label, icon, selected = false, onPress, maxFontSizeMultiplier }: ChipProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  // A chip is a toggle button, which announces its state with aria-pressed.
  // React Native Web ignores accessibilityState and turns this attribute into
  // the DOM one; native has no pressed state, reads the accessibility state
  // below, and drops the attribute. It is not in React Native's prop types.
  const webPressed = { 'aria-pressed': selected } as unknown as Partial<PressableProps>;
  return (
    <Pressable
      {...webPressed}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? t.colors.onInk : t.colors.text}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      <Text style={[styles.label, selected && styles.labelSelected]} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {label}
      </Text>
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
      minHeight: 36,
      paddingHorizontal: spacing.md - 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.controlBorder,
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
