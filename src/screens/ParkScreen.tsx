import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import {
  getAllEntries,
  getAttractionsByLand,
  getEntriesByAttraction,
  getLandsByPark,
  getParksSummary,
} from "../data/query";
import { getDestination } from "../data/destinations";
import { labelOrFallback } from "../data/labels";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { parkKeyFor, PARK_ICONS } from "../theme/parks";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import SegmentedControl, { SegmentedControlOption } from "../components/ui/SegmentedControl";
import EmptyState from "../components/ui/EmptyState";
import EntryRow from "../components/EntryRow";

type IconName = keyof typeof Ionicons.glyphMap;

type ParkRouteProp = RouteProp<RootStackParamList, "Park">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ParkScreen() {
  const route = useRoute<ParkRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { parkId } = route.params;

  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const palette = useParkPalette(parkId);
  const parkKey = parkKeyFor(parkId);

  const destination = getDestination(parkId);
  const parkName =
    destination?.name ??
    labelOrFallback(getParksSummary().find((p) => p.parkId === parkId)?.parkName, "Park");

  const [filter, setFilter] = useState<SegmentedControlOption>("All");
  const found = useFoundStore((s) => s.found);

  const parkEntries = useMemo(() => getAllEntries().filter((e) => e.parkId === parkId), [parkId]);
  const foundCount = parkEntries.filter((e) => e.id in found).length;
  const pct = parkEntries.length > 0 ? (foundCount / parkEntries.length) * 100 : 0;

  const groups = useMemo(
    () =>
      getLandsByPark(parkId, filter).map((land) => ({
        land,
        attractions: getAttractionsByLand(parkId, land.landId, filter).map((attraction) => ({
          attraction,
          entries: getEntriesByAttraction(parkId, land.landId, attraction.attractionId, filter),
        })),
      })),
    [parkId, filter]
  );

  // By day the header is the park's solid accent; by night it stays a dark
  // surface and the accent moves into the text so the screen is not blinding.
  const headerBg = t.dark ? t.colors.surface : palette.accent;
  const headerText = t.dark ? palette.accent : t.colors.textOnAccent;
  const headerMuted = t.dark ? t.colors.textSecondary : t.colors.textOnAccent;
  const headerDisc = t.dark ? palette.tint : "rgba(255,244,220,0.18)";
  const track = t.dark ? t.colors.track : "rgba(255,244,220,0.25)";

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + spacing.sm }]}>
          <Sunburst
            color={t.dark ? palette.accent : t.colors.textOnAccent}
            opacity={t.dark ? 0.08 : 0.14}
            center={{ x: 195, y: -190 + insets.top }}
          />
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={headerText} />
            </Pressable>
            <View style={[styles.headerDisc, { backgroundColor: headerDisc }]}>
              <Ionicons name={PARK_ICONS[parkKey] as IconName} size={22} color={headerText} />
            </View>
          </View>
          {destination?.region && (
            <Text style={[styles.eyebrow, { color: headerMuted }]}>{destination.region}</Text>
          )}
          <Text style={[styles.title, { color: headerText }]}>{parkName}</Text>
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: track }]}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
            <Text style={[styles.progressLabel, { color: headerText }]}>
              {foundCount} of {parkEntries.length} found
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <SegmentedControl options={["All", "FIND", "FACT"]} selectedValue={filter} onValueChange={setFilter} />

          {groups.length === 0 && (
            <EmptyState title="Nothing here yet" message="No entries match this filter." />
          )}

          {groups.map(({ land, attractions }) => (
            <View key={land.landId} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{land.landName}</Text>
                <Text style={styles.sectionMeta}>
                  {attractions.length} {attractions.length === 1 ? "attraction" : "attractions"}
                </Text>
              </View>
              {attractions.map(({ attraction, entries }) => (
                <View key={attraction.attractionId} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <View style={[styles.dot, { backgroundColor: palette.accent }]} />
                    <Text style={[styles.groupTitle, { color: palette.text }]}>{attraction.attractionName}</Text>
                  </View>
                  {entries.map((entry, index) => (
                    <React.Fragment key={entry.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <EntryRow
                        entry={entry}
                        onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
                      />
                    </React.Fragment>
                  ))}
                </View>
              ))}
            </View>
          ))}

          <View style={styles.suggestCard}>
            <Text style={styles.suggestTitle}>Know one we're missing?</Text>
            <Text style={styles.suggestBody}>Send it in and we'll check it out before adding it.</Text>
            <Pressable
              onPress={() => navigation.navigate("SubmitSighting", { parkId })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.suggestButton, pressed && styles.suggestButtonPressed]}
            >
              <Ionicons name="add-circle-outline" size={20} color={t.colors.onInk} />
              <Text style={styles.suggestButtonText}>Suggest a find</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
      paddingBottom: spacing.xl,
    },
    header: {
      position: "relative",
      overflow: "hidden",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md + 2,
      borderBottomLeftRadius: radii.xl,
      borderBottomRightRadius: radii.xl,
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
    headerDisc: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    eyebrow: {
      ...text.eyebrow,
      marginTop: spacing.sm + 4,
    },
    title: {
      ...text.display,
      marginTop: spacing.xs,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
      marginTop: spacing.sm + 4,
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: radii.full,
      overflow: "hidden",
    },
    fill: {
      height: 8,
      borderRadius: radii.full,
      backgroundColor: t.colors.primary,
    },
    progressLabel: {
      ...text.meta,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      gap: spacing.md - 4,
    },
    section: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    sectionTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
      flexShrink: 1,
    },
    sectionMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    groupCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      overflow: "hidden",
      paddingBottom: spacing.xs,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.md - 4,
      paddingHorizontal: spacing.md - 2,
      paddingBottom: spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    groupTitle: {
      ...text.labelCaps,
      fontSize: 13,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      marginHorizontal: spacing.md - 2,
      backgroundColor: t.colors.border,
    },
    suggestCard: {
      alignItems: "flex-start",
      gap: spacing.xs,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    suggestTitle: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    suggestBody: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    suggestButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm - 2,
      height: 44,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
      marginTop: spacing.sm,
    },
    suggestButtonPressed: {
      opacity: 0.85,
    },
    suggestButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
  });
