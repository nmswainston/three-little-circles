import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TextInput, Pressable, Platform, KeyboardAvoidingView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getAllEntries } from "../data/query";
import { parseBackup, summarizeBackup } from "../lib/backup";
import { applyBackup, ImportMode } from "../store/backup";
import { useFoundStore } from "../store/useFoundStore";
import { confirm, notify } from "../lib/notify";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";

type Applied = { mode: ImportMode; finds: number; newFinds: number };

/**
 * Paste a backup message from another phone, see what's in it, then merge
 * it into this phone or replace what's here.
 */
export default function ImportProgressScreen() {
  const navigation = useNavigation();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const found = useFoundStore((s) => s.found);

  const [pasted, setPasted] = useState("");
  const [applied, setApplied] = useState<Applied | undefined>();

  const knownIds = useMemo(() => new Set(getAllEntries().map((e) => e.id)), []);
  const parsed = useMemo(() => (pasted.trim().length > 0 ? parseBackup(pasted) : undefined), [pasted]);
  const summary = parsed?.ok ? summarizeBackup(parsed.backup, found, knownIds) : undefined;

  // The clipboard module is loaded on demand so a build made before it was
  // added still runs; the box accepts a manual paste either way.
  const pasteFromClipboard = async () => {
    try {
      const Clipboard: typeof import("expo-clipboard") = require("expo-clipboard");
      const value = await Clipboard.getStringAsync();
      if (value.trim().length > 0) setPasted(value);
      else notify("Nothing to paste", "Copy your backup message first, then try again.");
    } catch {
      notify("Couldn't read the clipboard", "Tap the box and paste the message instead.");
    }
  };

  const apply = (mode: ImportMode) => {
    if (!parsed?.ok || !summary) return;
    const run = () => {
      applyBackup(parsed.backup, mode);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setApplied({ mode, finds: summary.finds, newFinds: summary.newFinds });
    };
    if (mode === "replace") {
      confirm(
        "Replace everything?",
        "Finds, badges, settings, and reports on this phone will be replaced by the backup. This can't be undone.",
        run,
        "Replace"
      );
    } else {
      run();
    }
  };

  const exportedOn = summary?.exportedAtISO ? summary.exportedAtISO.slice(0, 10) : undefined;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Sunburst center={{ x: 195, y: -200 + insets.top }} />
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={t.colors.text} />
          </Pressable>
          <Text style={styles.eyebrow}>Backup</Text>
          <Text style={styles.title}>Import progress</Text>
          <Text style={styles.subtitle}>
            Paste the backup message from your other phone. You'll see what's in it before anything changes.
          </Text>
        </View>

        {applied ? (
          <View style={styles.body}>
            <View style={styles.successCard}>
              <View style={styles.successDisc}>
                <Ionicons name="checkmark" size={32} color={t.colors.onSuccess} />
              </View>
              <Text style={styles.successTitle}>Imported</Text>
              <Text style={styles.successBody}>
                {applied.mode === "merge"
                  ? `${applied.newFinds} new find${applied.newFinds === 1 ? "" : "s"} added, and badges and reports merged in.`
                  : `This phone now matches the backup: ${applied.finds} find${applied.finds === 1 ? "" : "s"}.`}
              </Text>
              <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>Backup message</Text>
                <Pressable onPress={pasteFromClipboard} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.link}>Paste from clipboard</Text>
                </Pressable>
              </View>
              <TextInput
                value={pasted}
                onChangeText={setPasted}
                placeholder="Three Little Circles backup: …"
                placeholderTextColor={t.colors.textMuted}
                style={[styles.input, styles.multiline]}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Backup message"
              />
              {parsed && !parsed.ok && <Text style={styles.error}>{parsed.message}</Text>}
            </View>

            {summary && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>{exportedOn ? `Backup from ${exportedOn}` : "Backup"}</Text>
                <Row icon="checkmark-circle-outline" label={`${summary.finds} find${summary.finds === 1 ? "" : "s"}`} meta={`${summary.newFinds} new to this phone`} />
                <Row icon="ribbon-outline" label={`${summary.badges} badge${summary.badges === 1 ? "" : "s"}`} />
                <Row icon="options-outline" label={summary.hasSettings ? "Settings included" : "No settings"} meta={summary.hasSettings ? "Applied only if you replace" : undefined} />
                {summary.reports > 0 && <Row icon="chatbubble-ellipses-outline" label={`${summary.reports} Still there? report${summary.reports === 1 ? "" : "s"}`} />}
                {summary.unknownFinds > 0 && (
                  <Text style={styles.previewNote}>
                    {summary.unknownFinds} find{summary.unknownFinds === 1 ? " is" : "s are"} for entries this version of the app doesn't have yet. They'll count once that content ships.
                  </Text>
                )}
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => apply("merge")}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="git-merge-outline" size={18} color={t.colors.onInk} />
                    <Text style={styles.primaryButtonText}>Merge into this phone</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => apply("replace")}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.secondaryButtonText}>Replace everything</Text>
                  </Pressable>
                </View>
                <Text style={styles.previewHelp}>
                  Merge keeps what's on this phone and adds what's in the backup. Replace makes this phone match the backup.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ icon, label, meta }: { icon: keyof typeof Ionicons.glyphMap; label: string; meta?: string }) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={t.colors.textSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {meta && <Text style={styles.rowMeta}>{meta}</Text>}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    scroll: {
      paddingBottom: spacing.huge,
    },
    header: {
      position: "relative",
      overflow: "hidden",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backButton: {
      width: 44,
      height: 44,
      marginLeft: -12,
      alignItems: "center",
      justifyContent: "center",
    },
    eyebrow: {
      ...text.eyebrow,
      color: t.colors.textSecondary,
      marginTop: spacing.sm,
    },
    title: {
      ...text.display,
      color: t.colors.text,
      marginTop: spacing.xs,
    },
    subtitle: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.textSecondary,
      marginTop: spacing.xs,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      gap: spacing.md + 2,
    },
    field: {
      gap: spacing.sm,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    fieldLabel: {
      ...text.labelCaps,
      fontSize: 13,
      lineHeight: 18,
      color: t.colors.textSecondary,
    },
    link: {
      ...text.meta,
      color: t.colors.textSecondary,
      textDecorationLine: "underline",
    },
    input: {
      ...text.body,
      lineHeight: 20,
      minHeight: 48,
      paddingHorizontal: spacing.md - 2,
      paddingVertical: spacing.sm + 2,
      color: t.colors.text,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    multiline: {
      minHeight: 132,
      lineHeight: 22,
    },
    error: {
      ...text.bodySmall,
      color: t.colors.error,
    },
    previewCard: {
      gap: spacing.sm + 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    previewTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    rowLabel: {
      ...text.itemTitle,
      color: t.colors.text,
      flexShrink: 1,
    },
    rowMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
      marginLeft: "auto",
    },
    previewNote: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    actions: {
      gap: spacing.sm + 2,
      marginTop: spacing.xs,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      height: 48,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
      paddingHorizontal: spacing.lg,
    },
    primaryButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      height: 48,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      paddingHorizontal: spacing.lg,
    },
    secondaryButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.text,
    },
    pressed: {
      opacity: 0.85,
    },
    previewHelp: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
    successCard: {
      alignItems: "center",
      gap: spacing.md - 4,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    successDisc: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    successTitle: {
      ...text.title,
      color: t.colors.text,
    },
    successBody: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.textSecondary,
      textAlign: "center",
    },
  });
