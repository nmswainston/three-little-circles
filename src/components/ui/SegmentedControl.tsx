import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EntryType } from '../../data/types';
import { Theme, useStyles } from '../../theme/ThemeProvider';
import { spacing, radii, text } from '../../theme/tokens';

export type SegmentedControlOption = 'All' | EntryType;

const LABELS: Record<SegmentedControlOption, string> = {
  All: 'All',
  FIND: 'Finds',
  FACT: 'Surprises',
};

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: SegmentedControlOption;
  onValueChange: (value: SegmentedControlOption) => void;
}

/** Filter between everything, Hidden Mickey finds, and Hidden Surprises. */
export default function SegmentedControl({ options, selectedValue, onValueChange }: SegmentedControlProps) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option === selectedValue;
        return (
          <Pressable
            key={option}
            onPress={() => onValueChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{LABELS[option]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: spacing.xs,
      padding: spacing.xs,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    segment: {
      flex: 1,
      height: 36,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: t.colors.ink,
    },
    label: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    labelSelected: {
      ...text.chip,
      color: t.colors.onInk,
    },
  });
