import React from "react";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { useRoute, RouteProp, useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, RootTabParamList } from "../navigation/types";
import { getEntryById } from "../data/query";
import { labelOrFallback } from "../data/labels";
import { openDirections } from "../lib/maps";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import DifficultyChip from "../components/ui/DifficultyChip";
import FoundButton from "../components/ui/FoundButton";
import EmptyState from "../components/ui/EmptyState";

type EntryDetailRouteProp = RouteProp<RootStackParamList, "EntryDetail">;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

const VIEWING_FIELDS = ["motion", "lighting", "angle", "crowding", "distance"] as const;

export default function EntryDetailScreen() {
  const route = useRoute<EntryDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { entryId } = route.params;

  const entry = getEntryById(entryId);
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const palette = useParkPalette(entry?.parkId);

  // Select the boolean, not the isFound function: the function reference is
  // stable, so selecting it would never re-render this screen on toggle.
  const found = useFoundStore((s) => entryId in s.found);
  const toggleFound = useFoundStore((s) => s.toggleFound);

  const backButton = (
    <Pressable
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={styles.backButton}
    >
      <Ionicons name="arrow-back" size={24} color={t.colors.text} />
    </Pressable>
  );

  if (!entry) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>{backButton}</View>
        <View style={styles.body}>
          <EmptyState title="Not found" message="This entry isn't documented." />
        </View>
      </View>
    );
  }

  const title = labelOrFallback(entry.display?.entryTitle, "Hidden Find");
  const eyebrow = [entry.display?.parkName, entry.display?.attractionName].filter(Boolean).join(" · ");

  const steps = [
    { label: "Scene", value: entry.whereToLook.scene },
    { label: "Exact spot", value: entry.whereToLook.exactSpot },
    entry.whereToLook.orientation ? { label: "Orientation", value: entry.whereToLook.orientation } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  const viewing = VIEWING_FIELDS.flatMap((key) => {
    const value = entry.viewing?.[key];
    return value ? [{ label: key, value }] : [];
  });

  const provenance = [
    entry.confidence ? `${entry.confidence} sighting` : null,
    entry.verification && entry.verification !== "Unknown" ? `${entry.verification} verified` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Sunburst color={palette.accent} opacity={t.dark ? 0.16 : 0.22} center={{ x: 195, y: -200 + insets.top }} />
          {backButton}
          {eyebrow.length > 0 && <Text style={[styles.eyebrow, { color: palette.text }]}>{eyebrow}</Text>}
          <Text style={styles.title}>{title}</Text>
          <View style={styles.chips}>
            <DifficultyChip level={entry.difficulty} />
            <OutlineChip label={entry.locationType} />
            {entry.whereToLook.orientation && <OutlineChip label={entry.whereToLook.orientation} />}
            {entry.entryType === "FACT" && <OutlineChip label="Fact" />}
          </View>
        </View>

        <View style={styles.body}>
          <FoundButton found={found} onToggle={() => toggleFound(entryId)} />
          <Text style={styles.helper}>
            {found ? "Nice catch. This counts toward your progress." : "Mark it found to add it to your progress."}
          </Text>

          {entry.coordinates && (
            <View style={styles.mapRow}>
              <Pressable
                onPress={() => navigation.navigate("MapTab", { screen: "Map", params: { focusEntryId: entry.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
              >
                <Ionicons name="location" size={18} color={t.colors.onInk} />
                <Text style={styles.mapButtonText}>See on map</Text>
              </Pressable>
              <Pressable
                onPress={() => openDirections(entry.coordinates!, title).catch(() => {})}
                accessibilityRole="button"
                style={({ pressed }) => [styles.mapButtonSecondary, pressed && styles.pressed]}
              >
                <Ionicons name="navigate-outline" size={18} color={t.colors.text} />
                <Text style={styles.mapButtonSecondaryText}>Directions</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.description}>{entry.description}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Where to look</Text>
            {steps.map((step, index) => (
              <View key={step.label} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: palette.accent }]}>
                  <Text style={[styles.stepNumberText, { color: palette.onAccent }]}>{index + 1}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={styles.stepValue}>{step.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {entry.bestTip && (
            <View style={styles.tip}>
              <Ionicons name="bulb-outline" size={24} color={t.colors.tipText} />
              <View style={styles.tipText}>
                <Text style={styles.tipLabel}>Best tip</Text>
                <Text style={styles.tipBody}>{entry.bestTip}</Text>
              </View>
            </View>
          )}

          {entry.funFacts && entry.funFacts.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Fun facts</Text>
              {entry.funFacts.map((fact, index) => (
                <View key={index} style={styles.fact}>
                  <View style={[styles.factDot, { backgroundColor: palette.accent }]} />
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </View>
          )}

          {(viewing.length > 0 || entry.viewing?.notes) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Viewing conditions</Text>
              {viewing.length > 0 && (
                <View style={styles.grid}>
                  {viewing.map((item) => (
                    <View key={item.label} style={styles.tile}>
                      <Text style={styles.tileLabel}>{item.label}</Text>
                      <Text style={styles.tileValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              {entry.viewing?.notes && <Text style={styles.notes}>{entry.viewing.notes}</Text>}
            </View>
          )}

          {provenance.length > 0 && (
            <View style={styles.provenance}>
              <Ionicons name="checkmark" size={18} color={t.colors.success} />
              <Text style={styles.provenanceText}>{provenance}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function OutlineChip({ label }: { label: string }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.outlineChip}>
      <Text style={styles.outlineChipText}>{label}</Text>
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
      paddingBottom: spacing.xxl,
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
      marginTop: spacing.sm,
    },
    title: {
      ...text.title,
      fontSize: 30,
      lineHeight: 34,
      color: t.colors.text,
      marginTop: spacing.xs + 2,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md - 4,
    },
    outlineChip: {
      height: 28,
      paddingHorizontal: spacing.md - 4,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    outlineChipText: {
      ...text.meta,
      color: t.colors.text,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      gap: spacing.md,
    },
    helper: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
      textAlign: "center",
      marginTop: -spacing.sm,
    },
    description: {
      ...text.body,
      color: t.colors.text,
    },
    mapRow: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginTop: -spacing.xs,
    },
    mapButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      height: 44,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    mapButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    mapButtonSecondary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      height: 44,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    mapButtonSecondaryText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.text,
    },
    pressed: {
      opacity: 0.85,
    },
    card: {
      gap: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    cardTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
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
    tip: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md - 4,
      backgroundColor: t.colors.tip,
      borderRadius: radii.md,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.md,
    },
    tipText: {
      flex: 1,
      gap: 2,
    },
    tipLabel: {
      ...text.labelCaps,
      fontSize: 13,
      lineHeight: 18,
      color: t.colors.tipText,
    },
    tipBody: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.text,
    },
    fact: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
    },
    factDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 8,
    },
    factText: {
      flex: 1,
      ...text.body,
      lineHeight: 22,
      color: t.colors.text,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm + 2,
    },
    tile: {
      width: "48%",
      flexGrow: 1,
      gap: 2,
      backgroundColor: t.colors.surfaceAlt,
      borderRadius: radii.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md - 4,
    },
    tileLabel: {
      ...text.labelCaps,
      color: t.colors.textMuted,
    },
    tileValue: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    notes: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    provenance: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    provenanceText: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
  });
