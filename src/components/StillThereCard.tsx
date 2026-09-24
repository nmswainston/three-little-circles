import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { ConfirmationSummary, describeFreshness } from "../data/confirmations";
import { sendConfirmation, ConfirmationStatus } from "../lib/confirm";
import { relativeTime } from "../lib/time";
import { useConfirmationsStore } from "../store/useConfirmationsStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";

interface StillThereCardProps {
  entryId: string;
  /** Bundled freshness for this entry, if any reports have been pulled. */
  summary?: ConfirmationSummary;
}

/**
 * Two taps that keep the guide honest: "Saw it today" or "Couldn't find it".
 * Shows what other guests have said and, after you report, what you said.
 */
export default function StillThereCard({ entryId, summary }: StillThereCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const mine = useConfirmationsStore((s) => s.reported[entryId]);
  const record = useConfirmationsStore((s) => s.record);
  const [sending, setSending] = useState<ConfirmationStatus | undefined>();
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const freshness = describeFreshness(summary);

  const send = async (status: ConfirmationStatus) => {
    if (sending) return;
    setError(undefined);
    setSending(status);
    const result = await sendConfirmation(entryId, status);
    setSending(undefined);
    if (!result.ok) {
      setError(result.message);
      AccessibilityInfo.announceForAccessibility(result.message);
      return;
    }
    record(entryId, status);
    setChanging(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const askAgain = !mine || changing;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Still there?
        </Text>
        <Text style={[styles.fresh, freshness.warning && styles.freshWarning]}>{freshness.label}</Text>
      </View>
      {freshness.detail && <Text style={styles.detail}>{freshness.detail}</Text>}

      {askAgain ? (
        <>
          <Text style={styles.body}>Two taps keep this guide honest. No account needed.</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => send("seen")}
              disabled={!!sending}
              accessibilityRole="button"
              accessibilityLabel="Saw it today"
              accessibilityState={{ busy: sending === "seen" }}
              style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
            >
              {sending === "seen" ? (
                <ActivityIndicator color={t.colors.onInk} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color={t.colors.onInk} />
              )}
              <Text style={styles.buttonPrimaryText}>Saw it today</Text>
            </Pressable>
            <Pressable
              onPress={() => send("missing")}
              disabled={!!sending}
              accessibilityRole="button"
              accessibilityLabel="Couldn't find it"
              accessibilityState={{ busy: sending === "missing" }}
              style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.pressed]}
            >
              {sending === "missing" ? (
                <ActivityIndicator color={t.colors.text} />
              ) : (
                <Ionicons name="help-circle-outline" size={18} color={t.colors.text} />
              )}
              <Text style={styles.buttonSecondaryText}>Couldn't find it</Text>
            </Pressable>
          </View>
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
        </>
      ) : (
        <View style={styles.thanks}>
          <Ionicons name="checkmark" size={18} color={t.colors.success} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={styles.thanksText}>
            You said {mine.status === "seen" ? "you saw it" : "you couldn't find it"} {relativeTime(mine.at)}. Thanks.
          </Text>
          <Pressable onPress={() => setChanging(true)} accessibilityRole="button" accessibilityLabel="Change your report" hitSlop={8}>
            <Text style={styles.link}>Change</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm + 2,
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
    fresh: {
      ...text.meta,
      color: t.colors.textSecondary,
      flexShrink: 1,
      textAlign: "right",
    },
    freshWarning: {
      color: t.colors.warning,
    },
    detail: {
      ...text.bodySmall,
      color: t.colors.textMuted,
      marginTop: -spacing.xs,
    },
    body: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm + 2,
    },
    // Buttons size to their labels and share the row; when both labels will
    // not fit on a narrow phone, the second wraps below at full width.
    button: {
      flexGrow: 1,
      flexBasis: "auto",
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      minHeight: 44,
      borderRadius: radii.full,
    },
    buttonPrimary: {
      backgroundColor: t.colors.ink,
    },
    buttonPrimaryText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    buttonSecondary: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    buttonSecondaryText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.text,
    },
    pressed: {
      opacity: 0.85,
    },
    error: {
      ...text.bodySmall,
      color: t.colors.error,
    },
    thanks: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    thanksText: {
      flex: 1,
      ...text.bodySmall,
      color: t.colors.text,
    },
    link: {
      ...text.meta,
      color: t.colors.textSecondary,
      textDecorationLine: "underline",
    },
  });
