import React from "react";
import { Modal, View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Difficulty } from "../data/types";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import SegmentedControl, { SegmentedControlOption } from "./ui/SegmentedControl";
import Chip from "./ui/Chip";

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

interface ParkFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  type: SegmentedControlOption;
  onTypeChange: (type: SegmentedControlOption) => void;
  /** Levels that are shown. All three means no difficulty filter. */
  difficulties: Difficulty[];
  onDifficultiesChange: (levels: Difficulty[]) => void;
  hideFound: boolean;
  onHideFoundChange: (value: boolean) => void;
  confirmedOnly: boolean;
  onConfirmedOnlyChange: (value: boolean) => void;
  /** How many finds the current filters leave, for the apply button. */
  resultCount: number;
  /** How many finds are already marked found here. */
  foundCount: number;
  /** True when anything differs from the defaults, so Reset has work to do. */
  canReset: boolean;
  onReset: () => void;
}

/** Bottom sheet that holds every park list filter, so the list gets the screen. */
export default function ParkFilterSheet({
  visible,
  onClose,
  type,
  onTypeChange,
  difficulties,
  onDifficultiesChange,
  hideFound,
  onHideFoundChange,
  confirmedOnly,
  onConfirmedOnlyChange,
  resultCount,
  foundCount,
  canReset,
  onReset,
}: ParkFilterSheetProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  // The last level stays on, because a list with no difficulty can never show anything.
  const toggleLevel = (level: Difficulty) => {
    const on = difficulties.includes(level);
    if (on && difficulties.length === 1) return;
    onDifficultiesChange(on ? difficulties.filter((d) => d !== level) : DIFFICULTIES.filter((d) => d === level || difficulties.includes(d)));
  };

  const trackColor = { false: t.colors.borderStrong, true: t.colors.success };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grab} />
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Filter
          </Text>
          {canReset && (
            <Pressable onPress={onReset} accessibilityRole="button" accessibilityLabel="Reset filters" hitSlop={10}>
              <Text style={styles.reset}>Reset</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.label}>Show</Text>
        <SegmentedControl options={["All", "FIND", "FACT"]} selectedValue={type} onValueChange={onTypeChange} />

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.chips}>
          {DIFFICULTIES.map((level) => (
            <Chip key={level} label={level} selected={difficulties.includes(level)} onPress={() => toggleLevel(level)} />
          ))}
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Hide found</Text>
            <Text style={styles.switchMeta}>
              {foundCount === 0 ? "Skip finds you have already logged" : `Skip the ${foundCount} you have already logged`}
            </Text>
          </View>
          <Switch
            value={hideFound}
            onValueChange={onHideFoundChange}
            trackColor={trackColor}
            accessibilityLabel="Hide found"
          />
        </View>
        <View style={[styles.switchRow, styles.lastRow]}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Confirmed only</Text>
            <Text style={styles.switchMeta}>Only finds a guest has checked in person</Text>
          </View>
          <Switch
            value={confirmedOnly}
            onValueChange={onConfirmedOnlyChange}
            trackColor={trackColor}
            accessibilityLabel="Confirmed only"
          />
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={`Show ${resultCount} ${resultCount === 1 ? "find" : "finds"}`}
          style={({ pressed }) => [styles.apply, pressed && styles.pressed]}
        >
          <Text style={styles.applyText}>{`Show ${resultCount} ${resultCount === 1 ? "find" : "finds"}`}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.overlay,
    },
    sheet: {
      backgroundColor: t.colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    grab: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.borderStrong,
      marginBottom: spacing.xs,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    title: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    reset: {
      ...text.chip,
      fontSize: 14,
      color: t.colors.text,
      textDecorationLine: "underline",
    },
    label: {
      ...text.labelCaps,
      color: t.colors.textSecondary,
      marginTop: spacing.sm,
    },
    chips: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      minHeight: 56,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    switchText: {
      flex: 1,
      gap: 1,
    },
    switchTitle: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    switchMeta: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    apply: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      borderRadius: radii.full,
      backgroundColor: t.colors.primary,
      marginTop: spacing.sm,
    },
    applyText: {
      ...text.button,
      color: t.colors.onPrimary,
    },
    pressed: {
      opacity: 0.85,
    },
  });
