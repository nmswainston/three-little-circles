import React, { useEffect, useMemo, useState } from "react";
import StatusBarScrim, { useScrolledPast } from "../components/layout/StatusBarScrim";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { useRoute, RouteProp, useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, RootTabParamList } from "../navigation/types";
import { getEntryById, getRelatedEntries } from "../data/query";
import { HiddenMickeyEntry } from "../data/types";
import { getConfirmation, isConfirmed } from "../data/confirmations";
import { getEntryImageSource } from "../data/images";
import { labelOrFallback } from "../data/labels";
import { openDirections } from "../lib/maps";
import { entryShareText, shareText } from "../lib/share";
import { notify } from "../lib/notify";
import { isSupabaseConfigured } from "../lib/supabase";
import { useFoundStore } from "../store/useFoundStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useConfirmationsStore } from "../store/useConfirmationsStore";
import { useRecentStore } from "../store/useRecentStore";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import DifficultyChip from "../components/ui/DifficultyChip";
import FoundButton from "../components/ui/FoundButton";
import EmptyState from "../components/ui/EmptyState";
import EntryRow from "../components/EntryRow";
import WhereToLook, { LookStep } from "../components/WhereToLook";
import StillThereCard from "../components/StillThereCard";
import ReferencePhoto from "../components/ReferencePhoto";

type EntryDetailRouteProp = RouteProp<RootStackParamList, "EntryDetail">;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

const VIEWING_FIELDS = ["motion", "lighting", "angle", "crowding", "distance"] as const;

const VIEWING_ICONS: Record<(typeof VIEWING_FIELDS)[number], keyof typeof Ionicons.glyphMap> = {
  motion: "speedometer-outline",
  lighting: "sunny-outline",
  angle: "scan-outline",
  crowding: "people-outline",
  distance: "locate-outline",
};

const VERIFICATION_LABEL: Record<NonNullable<HiddenMickeyEntry["verification"]>, string | null> = {
  "In-person": "Confirmed in person",
  Photo: "Confirmed by photo",
  Community: "Community reported",
  Documented: "Officially documented",
  Unknown: null,
};

/**
 * The icon beside the provenance line says how the sighting was verified, so a
 * community report never borrows the checkmark an in-person or photo
 * confirmation earns. Documented gets a neutral page, Unknown a question mark.
 */
const PROVENANCE_ICON: Record<
  NonNullable<HiddenMickeyEntry["verification"]>,
  { name: keyof typeof Ionicons.glyphMap; tone: "success" | "text" | "textMuted" }
> = {
  "In-person": { name: "checkmark-circle", tone: "success" },
  Photo: { name: "checkmark-circle", tone: "success" },
  Documented: { name: "document-text-outline", tone: "text" },
  Community: { name: "people-outline", tone: "textMuted" },
  Unknown: { name: "help-circle-outline", tone: "textMuted" },
};

/** Chip text for a status worth warning about. Current needs no chip. */
const STATUS_LABEL: Record<NonNullable<HiddenMickeyEntry["status"]>, string | null> = {
  Current: null,
  Unverified: "Not confirmed yet",
  Seasonal: "Seasonal",
  Variable: "Props move",
  Removed: "Removed",
};

/** Turns the caveat into an ask: the two taps on "Still there?" are how an unconfirmed find gets confirmed. */
const UNCONFIRMED_NOTE = "No one has confirmed this one yet. Found it? Tap 'Saw it today' below so others know.";

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
  const { scrolled, onScroll } = useScrolledPast();
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
  const foundHere = related.filter((e) => e.id in foundMap).length + (found ? 1 : 0);

  // Hint mode keeps the answer under wraps: where-to-look opens one step per
  // tap, and the description, tip, and fun facts wait for the last step. A
  // find already marked has nothing left to protect, so it shows in full.
  const hintMode = useSettingsStore((s) => s.hintMode);
  const [revealed, setRevealed] = useState(0);

  // This device's own "Still there?" report, so the ask below goes away once
  // the guest has answered it.
  const myReport = useConfirmationsStore((s) => s.reported[entryId]);
  const setLastEntry = useRecentStore((s) => s.setLastEntry);
  // Remember where the guest looked last, for the Parks home to pick up from.
  const entryExists = !!entry;
  useEffect(() => {
    if (entryExists) setLastEntry(entryId);
  }, [entryExists, entryId, setLastEntry]);

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

  // Broad to narrow: the scene points at the area, the tip says how to look
  // there, and the exact spot gives the answer. Tips are written so they
  // never name the answer themselves.
  const steps: LookStep[] = [
    { label: "Scene", value: entry.whereToLook.scene },
    ...(entry.bestTip ? [{ label: "Tip", value: entry.bestTip }] : []),
    { label: "Exact spot", value: entry.whereToLook.exactSpot },
    ...(entry.whereToLook.orientation ? [{ label: "Orientation", value: entry.whereToLook.orientation }] : []),
  ];
  // The scene is free: it points the guest the right way without giving the
  // find away. Hints start after it.
  const GIVEN = 1;
  const ladder = hintMode && !found;
  const shown = ladder ? Math.min(Math.max(revealed, GIVEN), steps.length) : steps.length;
  const spoilersHidden = shown < steps.length;
  const imageSource = getEntryImageSource(entry);

  const handleShare = async () => {
    const outcome = await shareText(entryShareText(entry, found));
    if (outcome === "copied") notify("Copied", "The text is on your clipboard.");
    else if (outcome === "unavailable") notify("Couldn't share", "Sharing isn't available here.");
  };

  const viewing = VIEWING_FIELDS.flatMap((key) => {
    const value = entry.viewing?.[key];
    return value ? [{ key, value }] : [];
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
  const provenanceIcon = PROVENANCE_ICON[entry.verification ?? "Unknown"];
  // A "Still there?" report outranks the content, so an unconfirmed find
  // guests have since seen drops its caveat here, matching the checkmark on
  // its row. The other statuses describe the find itself and always show.
  const confirmed = isConfirmed(entry);
  const statusLabel = entry.status && (entry.status !== "Unverified" || !confirmed) ? STATUS_LABEL[entry.status] : null;
  // The ask only makes sense where a report can actually be sent. A build
  // without the reporting backend still shows the chip, since the fact holds.
  const inviteReport = isSupabaseConfigured && entry.status === "Unverified" && !confirmed && !myReport;

  return (
    <View style={styles.screen}>
      <StatusBarScrim visible={scrolled} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
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
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
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
            {statusLabel && <StatusChip label={statusLabel} />}
          </View>
        </View>

        <View style={styles.body}>
          {inviteReport && (
            <View style={styles.unconfirmed}>
              <Ionicons name="alert-circle-outline" size={18} color={t.colors.tipText} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={styles.unconfirmedText}>{UNCONFIRMED_NOTE}</Text>
            </View>
          )}

          {entry.coordinates && (
            <View style={styles.mapRow}>
              <Pressable
                onPress={() => navigation.navigate("MapTab", { screen: "Map", params: { focusEntryId: entry.id } })}
                accessibilityRole="button"
                accessibilityLabel="See on map"
                style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
              >
                <Ionicons name="location" size={18} color={t.colors.onInk} />
                <Text style={styles.mapButtonText}>See on map</Text>
              </Pressable>
              <Pressable
                onPress={() => openDirections(entry.coordinates!, title).catch(() => {})}
                accessibilityRole="button"
                accessibilityLabel="Get directions"
                style={({ pressed }) => [styles.mapButtonSecondary, pressed && styles.pressed]}
              >
                <Ionicons name="navigate-outline" size={20} color={t.colors.text} />
              </Pressable>
            </View>
          )}

          {entry.accessNotes && (
            // The key icon carries the meaning for sighted guests; the label
            // says it in words.
            <View style={styles.access} accessible accessibilityLabel={`Access note: ${entry.accessNotes}`}>
              <Ionicons name="key-outline" size={18} color={t.colors.textSecondary} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={styles.accessText}>{entry.accessNotes}</Text>
            </View>
          )}

          {entry.image && imageSource && (
            <ReferencePhoto source={imageSource} image={entry.image} hidden={spoilersHidden} />
          )}

          {!spoilersHidden && <Text style={styles.description}>{entry.description}</Text>}

          <WhereToLook
            steps={steps}
            revealed={shown}
            given={GIVEN}
            onRevealNext={() => setRevealed(shown + 1)}
            onRevealAll={() => setRevealed(steps.length)}
            accent={palette.accent}
            onAccent={palette.onAccent}
            note="One hint at a time. You can turn hints off on Profile."
          />

          <FoundButton found={found} onToggle={() => toggleFound(entryId)} />
          <Text style={styles.helper} accessibilityLiveRegion="polite">
            {found ? "Nice catch. This counts toward your progress." : "Spotted it? Mark it to add it to your progress."}
          </Text>

          {entry.funFacts && entry.funFacts.length > 0 && !spoilersHidden && (
            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">
                Fun facts
              </Text>
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
              <Text style={styles.cardTitle} accessibilityRole="header">
                Viewing conditions
              </Text>
              {viewing.length > 0 && (
                <View style={styles.grid}>
                  {viewing.map((item) => (
                    // One stop per tile: "Lighting: dim", not an icon, a label, and a value.
                    <View
                      key={item.key}
                      style={styles.tile}
                      accessible
                      accessibilityLabel={`${item.key[0].toUpperCase()}${item.key.slice(1)}: ${item.value}`}
                    >
                      <Ionicons name={VIEWING_ICONS[item.key]} size={20} color={palette.text} accessibilityElementsHidden importantForAccessibility="no" />
                      <View style={styles.tileText}>
                        <Text style={styles.tileLabel}>{item.key}</Text>
                        <Text style={styles.tileValue}>{item.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {entry.viewing?.notes && <Text style={styles.notes}>{entry.viewing.notes}</Text>}
            </View>
          )}

          {provenance.length > 0 && (
            <View style={styles.provenance} testID="provenance">
              <Ionicons
                name={provenanceIcon.name}
                size={18}
                color={t.colors[provenanceIcon.tone]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.provenanceText}>{provenance}</Text>
            </View>
          )}

          <StillThereCard entryId={entry.id} summary={getConfirmation(entry.id)} />

          {isSupabaseConfigured && (
            <Pressable
              onPress={() => navigation.navigate("SubmitSighting", { forEntryId: entry.id })}
              accessibilityRole="button"
              accessibilityLabel="Send a photo of this find"
              style={({ pressed }) => [styles.photoAsk, pressed && styles.pressed]}
            >
              <Ionicons name="camera-outline" size={22} color={t.colors.text} />
              <View style={styles.photoAskText}>
                <Text style={styles.photoAskTitle}>Got a photo of this one?</Text>
                <Text style={styles.photoAskMeta}>Send it in. A person checks it before it's shown.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
            </Pressable>
          )}

          {related.length > 0 && (
            <View style={styles.relatedCard}>
              <View style={styles.relatedHeader}>
                <Text style={styles.relatedTitle} numberOfLines={2} accessibilityRole="header">
                  More at {labelOrFallback(entry.display?.attractionName, "this attraction")}
                </Text>
                <Text style={styles.relatedMeta}>
                  {foundHere} of {related.length + 1} found here
                </Text>
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

/** A caveat about the find itself (unconfirmed, seasonal, removed), styled apart from the plain facts. */
function StatusChip({ label }: { label: string }) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.outlineChip, styles.statusChip]}>
      <Ionicons name="alert-circle-outline" size={14} color={t.colors.tipText} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={[styles.outlineChipText, { color: t.colors.tipText }]}>{label}</Text>
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
      minHeight: 28,
      paddingHorizontal: spacing.md - 4,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    statusChip: {
      flexDirection: "row",
      gap: spacing.xs,
      paddingLeft: spacing.sm,
      borderStyle: "dashed",
      borderColor: t.colors.tipText,
      backgroundColor: t.colors.tip,
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
    },
    mapButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      minHeight: 44,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    mapButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    // Directions is a side trip from finding the thing, so it is an icon
    // beside See on map instead of a second full-width button.
    mapButtonSecondary: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    pressed: {
      opacity: 0.85,
    },
    // Same shape as the invites on the Parks home: a quiet row, not a card.
    photoAsk: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
      minHeight: 64,
      padding: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: t.colors.controlBorder,
    },
    photoAskText: {
      flex: 1,
      gap: 1,
    },
    photoAskTitle: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    photoAskMeta: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
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
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: t.colors.surfaceAlt,
      borderRadius: radii.sm,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md - 4,
    },
    tileText: {
      flex: 1,
      gap: 2,
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
    unconfirmed: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    unconfirmedText: {
      ...text.bodySmall,
      flex: 1,
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
      gap: 2,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md - 2,
      paddingBottom: spacing.xs,
    },
    relatedTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
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
