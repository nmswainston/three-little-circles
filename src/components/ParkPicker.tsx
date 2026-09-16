import React from "react";
import { ScrollView, Text, StyleSheet, Pressable } from "react-native";
import { ParkSummary } from "../data/query";
import { colors, spacing, radii, typography } from "../theme/tokens";

interface ParkPickerProps {
  parks: ParkSummary[];
  /** undefined means "All" */
  selectedParkId?: string;
  onSelect: (parkId: string | undefined) => void;
}

/** Horizontal row of destination filter chips. */
export default function ParkPicker({ parks, selectedParkId, onSelect }: ParkPickerProps) {
  const options: { id: string | undefined; label: string }[] = [
    { id: undefined, label: "All" },
    ...parks.map((p) => ({ id: p.parkId, label: p.parkName })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const selected = opt.id === selectedParkId;
        return (
          <Pressable
            key={opt.id ?? "all"}
            onPress={() => onSelect(opt.id)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
});
