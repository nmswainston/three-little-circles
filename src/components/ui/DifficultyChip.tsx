import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Difficulty } from '../../data/types';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, radii, text } from '../../theme/tokens';

interface DifficultyChipProps {
  level: Difficulty;
  size?: 'small' | 'regular';
}

/** Easy is green, Medium gold, Hard red, in both themes. */
export default function DifficultyChip({ level, size = 'regular' }: DifficultyChipProps) {
  const t = useTheme();
  const chip = t.difficulty[level];
  const small = size === 'small';

  return (
    <View style={[styles.base, small ? styles.small : styles.regular, { backgroundColor: chip.bg }]}>
      <Text style={[small ? styles.textSmall : styles.text, { color: chip.text }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regular: {
    height: 28,
    paddingHorizontal: spacing.md - 4,
  },
  small: {
    height: 20,
    paddingHorizontal: spacing.sm,
  },
  text: {
    ...text.chip,
  },
  textSmall: {
    ...text.labelCaps,
    textTransform: 'none',
    letterSpacing: 0,
  },
});
