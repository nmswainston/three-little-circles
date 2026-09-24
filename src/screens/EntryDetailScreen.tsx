import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { useRoute, RouteProp, useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, RootTabParamList } from "../navigation/types";
import { getEntryById, getRelatedEntries } from "../data/query";
import { HiddenMickeyEntry } from "../data/types";
import { getConfirmation } from "../data/confirmations";
import { labelOrFallback } from "../data/labels";
import { STATUS_LABEL, countsTowardProgress } from "../data/status";
import { openDirections } from "../lib/maps";
import { entryShareText, shareText } from "../lib/share";
import { notify } from "../lib/notify";
import { useFoundStore } from "../store/useFoundStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import DifficultyChip from "../components/ui/DifficultyChip";
import FoundButton from "../components/ui/FoundButton";
import EmptyState from "../components/ui/EmptyState";
import EntryRow from "../components/EntryRow";
import WhereToLook, { LookStep } from "../components/WhereToLook";
import StillThereCard from "../components/StillThereCard";

type EntryDetailRouteProp = RouteProp<RootStackParamList, "EntryDetail">;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

const VIEWING_FIELDS = ["motion", "lighting", "angle", "crowding", "distance"] as const;

const VERIFICATION_LABEL: Record<NonNullable<HiddenMickeyEntry["verification"]>, string | null> = {
  "In-person": "Confirmed in person",
  Photo: "Confirmed by photo",
  Community: "Community reported",
  Documented: "Officially documented",
  Unknown: null,
};

function formatMonthYear(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function EntryDetailScreen() {
  const route = useRoute<EntryDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { entryId } = route.params;

  const entry = getEntryById(entryId);
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const palette = useParkPalette(entry?.parkId);

  // Select the map, not the isFound function: the function reference is
  // stable, so selecting it would never re-render this screen on toggle.
  const foundMap = useFoundStore((s) => s.found);
  const toggleFound = useFoundStore((s) => s.toggleFound);
  const found = entryId in foundMap;

  // Other entries at the same attraction, so sweeping one queue or lobby
  // doesn't mean a trip back to the park screen between finds.
  const related = useMemo(() => (entry ? getRelatedEntries(entry) : []), [entry]);
  // Leads and removed finds sit in the list but stay out of the tally.
  const countable = entry ? countsTowardProgress(entry) : false;
  const relatedCountable = related.filter(countsTowardProgress);
  const hereTotal = relatedCountable.length + (countable ? 1 : 0);
  const foundHere = relatedCountable.filter((e) => e.id in foundMap).length + (found && countable ? 1 : 0);

  // Hint mode keeps the answer under wraps: where-to-look opens one step per
  // tap, and the description, tip, and fun facts wait for the last step. A
  // find already marked has nothing left to protect, so it shows in full.
  const hintMode = useSettingsStore((s) => s.hintMode);
  const [revealed, setRevealed] = useState(0);

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

  const steps: LookStep[] = [
    { label: "Scene", value: entry.whereToLook.scene },
    { label: "Exact spot", value: entry.whereToLook.exactSpot },
    ...(entry.whereToLook.orientation ? [{ label: "Orientation", value: entry.whereToLook.orientation }] : []),
  ];
  // A lead has nothing to spoil and no Found button to end the ladder, so it always shows in full.
  const ladder = hintMode && !found && countable;
  const shown = ladder ? Math.min(revealed, steps.length) : steps.length;
  const spoilersHidden = shown < steps.length;

  const handleShare = async () => {
    const outcome = await shareText(entryShareText(entry, found));
    if (outcome === "copied") notify("Copied", "The text is on your clipboard.");
    else if (outcome === "unavailable") notify("Couldn't share", "Sharing isn't available here.");
  };

  const viewing = VIEWING_FIELDS.flatMap((key) => {
    const value = entry.viewing?.[key];
    return value ? [{ label: key, value }] : [];
  });

  const verifiedLabel = entry.verification ? VERIFICATION_LABEL[entry.verification] : null;
  const verifiedWhen =
    verifiedLabel && entry.verifiedAtISO && (entry.verification === "In-person" || entry.verification === "Photo")
      ? formatMonthYear(entry.verifiedAtISO)
      : null;
  const provenance = [
    entry.confidence ? `${entry.confidence} sighting` : null,
    verifiedLabel ? (verifiedWhen ? `${verifiedLabel} ${verifiedWhen}` : verifiedLabel) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const statusLabel = entry.status ? STATUS_LABEL[entry.status] : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Sunburst color={palette.accent} opacity={t.dark ? 0.16 : 0.22} center={{ x: 195, y: -200 + insets.top }} />
          <View style={styles.headerRow}>
            {backButton}
            <Pressable
              onPress={() => handleShare().catch(() => {})}
              accessibilityRole="button"
              accessibilityLabel="Share this find"
              hitSlop={8}
              style={styles.shareButton}
            >
              <Ionicons name="share-outline" size={24} color={t.colors.text} />
            </Pressable>
          </View>
          {eyebrow.length > 0 && <Text style={[styles.eyebrow, { color: palette.text }]}>{eyebrow}</Text>}
          <Text style={styles.title}>{title}</Text>
          <View style={styles.chips}>
            <DifficultyChip level={entry.difficulty} />
            <OutlineChip label={entry.locationType} />
            {entry.areaContext && entry.areaContext !== entry.locationType && (
              <OutlineChip label={entry.areaContext} />
            )}
            {entry.whereToLook.orientation && !spoilersHidden && (
              <OutlineChip label={entry.whereToLook.orientation} />
            )}
            {entry.entryType === "FACT" && <OutlineChip label="Hidden Surprise" />}
            {statusLabel && <OutlineChip label={statusLabel} />}
          </View>
        </View>

        <View style={styles.body}>
          {countable ? (
            <>
              <FoundButton found={found} onToggle={() => toggleFound(entryId)} />
              <Text style={styles.helper}>
                {found ? "Nice catch. This counts toward your progress." : "Mark it found to add it to your progress."}
              </Text>
            </>
          ) : entry.status === "Lead" ? (
            <View style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Ionicons name="search-outline" size={20} color={t.colors.text} />
                <Text style={styles.noteTitle}>Unconfirmed lead</Text>
              </View>
              <Text style={styles.noteText}>
                Someone reported a Mickey here, but nobody has pinned it down yet, so this one doesn't count toward
                your progress. Spot it and send a sighting, and it can become a real find.
              </Text>
              <Pressable
                onPress={() =>
                  navigation.navigate("SubmitSighting", {
                    parkId: entry.parkId,
                    landName: entry.display?.landName,
                    attractionName: entry.display?.attractionName,
                  })
                }
                accessibilityRole="button"
                style={({ pressed }) => [styles.noteButton, pressed && styles.pressed]}
              >
                <Ionicons name="camera-outline" size={18} color={t.colors.onInk} />
                <Text style={styles.mapButtonText}>Spotted it? Send a sighting</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Ionicons name="time-outline" size={20} color={t.colors.text} />
                <Text style={styles.noteTitle}>No longer in the park</Text>
              </View>
              <Text style={styles.noteText}>
                This detail has been removed. It stays in the guide for history and doesn't count toward your progress.
              </Text>
            </View>
          )}

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

          {entry.accessNotes && (
            <View style={styles.access}>
              <Ionicons name="key-outline" size={18} color={t.colors.textSecondary} />
              <Text style={styles.accessText}>{entry.accessNotes}</Text>
            </View>
          )}

          {spoilersHidden ? (
            <Text style={styles.hintNote}>
              Hints are on. The full note appears after the last hint, or once you mark it found. Change this on the
              Profile tab.
            </Text>
          ) : (
            <Text style={styles.description}>{entry.description}</Text>
          )}

          <WhereToLook
            steps={steps}
            revealed={shown}
            onRevealNext={() => setRevealed(shown + 1)}
            onRevealAll={() => setRevealed(steps.length)}
            accent={palette.accent}
            onAccent={palette.onAccent}
          />

          {entry.bestTip && !spoilersHidden && (
            <View style={styles.tip}>
              <Ionicons name="bulb-outline" size={24} color={t.colors.tipText} />
              <View style={styles.tipText}>
                <Text style={styles.tipLabel}>Best tip</Text>
                <Text style={styles.tipBody}>{entry.bestTip}</Text>
              </View>
            </View>
          )}

          {entry.funFacts && entry.funFacts.length > 0 && !spoilersHidden && (
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

          {countable && <StillThereCard entryId={entry.id} summary={getConfirmation(entry.id)} />}

          {related.length > 0 && (
            <View style={styles.relatedCard}>
              <View style={styles.relatedHeader}>
                <Text style={styles.relatedTitle} numberOfLines={2}>
                  More at {labelOrFallback(entry.display?.attractionName, "this attraction")}
                </Text>
                {hereTotal > 0 && (
                  <Text style={styles.relatedMeta}>
                    {foundHere} of {hereTotal} found here
                  </Text>
                )}
              </View>
              {related.map((other, index) => (
                <React.Fragment key={other.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <EntryRow entry={other} onPress={() => navigation.push("EntryDetail", { entryId: other.id })} />
                </React.Fragment>
              ))}
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      width: 44,
      height: 44,
      marginLeft: -12,
      alignItems: "center",
      justifyContent: "center",
    },
    shareButton: {
      width: 44,
      height: 44,
      marginRight: -12,
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
    noteCard: {
      gap: spacing.sm + 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    noteHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    noteTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    noteText: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    noteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      height: 48,
      marginTop: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
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
    hintNote: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
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
    access: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    accessText: {
      ...text.bodySmall,
      flex: 1,
      color: t.colors.textSecondary,
    },
    relatedCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      overflow: "hidden",
      paddingBottom: spacing.xs,
    },
    relatedHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md - 2,
      paddingBottom: spacing.xs,
    },
    relatedTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
      flexShrink: 1,
    },
    relatedMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    divider: {
      height: 1,
      marginHorizontal: spacing.md - 2,
      backgroundColor: t.colors.border,
    },
  });
