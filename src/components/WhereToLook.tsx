import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";

export type LookStep = { label: string; value: string };

interface WhereToLookProps {
  steps: LookStep[];
  /** How many steps are open. Equal to steps.length shows everything with no controls. */
  revealed: number;
  onRevealNext?: () => void;
  onRevealAll?: () => void;
  /** Park accent for the step numbers. */
  accent: string;
  onAccent: string;
}

/**
 * The "Where to look" card. In full mode every step is open. As a hint
 * ladder, steps open one tap at a time and the closed ones keep their label
 * so the guest knows what kind of help is next without seeing the answer.
 */
export default function WhereToLook({ steps, revealed, onRevealNext, onRevealAll, accent, onAccent }: WhereToLookProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const shown = Math.min(Math.max(revealed, 0), steps.length);
  const ladder = shown < steps.length;

  const reveal = (action?: () => void) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    action?.();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Where to look</Text>
        {ladder && (
          <Text style={styles.meta}>
            {shown} of {steps.length} hints
          </Text>
        )}
      </View>

      {steps.map((step, index) => {
        const open = index < shown;
        return (
          <View key={step.label} style={styles.step}>
            <View style={[styles.stepNumber, open ? { backgroundColor: accent } : styles.stepNumberLocked]}>
              {open ? (
                <Text style={[styles.stepNumberText, { color: onAccent }]}>{index + 1}</Text>
              ) : (
                <Ionicons name="lock-closed" size={13} color={t.colors.textMuted} />
              )}
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              {open ? (
                <Text style={styles.stepValue}>{step.value}</Text>
              ) : (
                <Text style={styles.stepLocked}>Hidden until you ask.</Text>
              )}
            </View>
          </View>
        );
      })}

      {ladder && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => reveal(onRevealNext)}
            accessibilityRole="button"
            accessibilityLabel={shown === 0 ? "Show the first hint" : "Show the next hint"}
            style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
          >
            <Ionicons name="bulb-outline" size={18} color={t.colors.onInk} />
            <Text style={styles.nextText}>{shown === 0 ? "First hint" : "Next hint"}</Text>
          </Pressable>
          <Pressable
            onPress={() => reveal(onRevealAll)}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.allButton, pressed && styles.pressed]}
          >
            <Text style={styles.allText}>Show everything</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    title: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    meta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    step: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md - 4,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    stepNumberLocked: {
      backgroundColor: t.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    stepNumberText: {
      ...text.chip,
    },
    stepText: {
      flex: 1,
      gap: 2,
    },
    stepLabel: {
      ...text.labelCaps,
      fontSize: 13,
      lineHeight: 18,
      color: t.colors.textSecondary,
    },
    stepValue: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.text,
    },
    stepLocked: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    nextButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm - 2,
      height: 44,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    nextText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    allButton: {
      height: 44,
      justifyContent: "center",
    },
    allText: {
      ...text.meta,
      color: t.colors.textSecondary,
      textDecorationLine: "underline",
    },
    pressed: {
      opacity: 0.85,
    },
  });
