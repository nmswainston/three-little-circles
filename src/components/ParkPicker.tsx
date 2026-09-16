import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ParkSummary } from "../data/query";
import { spacing } from "../theme/tokens";
import Chip from "./ui/Chip";

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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => (
        <Chip
          key={opt.id ?? "all"}
          label={opt.label}
          selected={opt.id === selectedParkId}
          onPress={() => onSelect(opt.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});
