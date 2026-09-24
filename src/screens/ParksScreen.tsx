import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ListRenderItem, StyleSheet, View, Text, TextInput, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, searchEntries } from "../data/query";
import { DestinationSummary, getDestinationSummaries, Region, REGIONS } from "../data/destinations";
import { HiddenMickeyEntry } from "../data/types";
import { getFactCountsByPark } from "../data/facts";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import PageHeader from "../components/layout/PageHeader";
import Chip from "../components/ui/Chip";
import FadingScrollRow from "../components/ui/FadingScrollRow";
import ParkCard from "../components/ParkCard";
import EntryCard from "../components/EntryCard";
import EmptyState from "../components/ui/EmptyState";
import Disclaimer from "../components/Disclaimer";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_REGION: Region = "Florida";

// The screen is one virtualized list, so a broad search never mounts a card
// for every entry at once. Browsing rows are whole region groups (a title and
// a handful of park cards); searching rows are single finds.
type Row =
  | { kind: "group"; region: Region; destinations: DestinationSummary[] }
  | { kind: "entry"; entry: HiddenMickeyEntry };

const rowKey = (row: Row) => (row.kind === "entry" ? `entry:${row.entry.id}` : `group:${row.region}`);
const RowGap = () => <View style={gapStyles.row} />;
const gapStyles = StyleSheet.create({ row: { height: spacing.md } });

export default function ParksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const found = useFoundStore((s) => s.found);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | undefined>(DEFAULT_REGION);

  const destinations = useMemo(() => getDestinationSummaries(), []);
  const factCounts = useMemo(() => getFactCountsByPark(), []);

  // A chosen region shows everything it has, including parks marked "Coming
  // soon". The All view shows only parks with something to open, finds or
  // facts, grouped under region headings so the same park name in different
  // places never reads as a duplicate.
  const sections = useMemo(() => {
    if (region) {
      return [{ region, destinations: destinations.filter((d) => d.region === region) }];
    }
    return REGIONS.map((r) => ({
      region: r,
      destinations: destinations.filter(
        (d) => d.region === r && (d.count > 0 || (factCounts.get(d.parkId) ?? 0) > 0)
      ),
    })).filter((s) => s.destinations.length > 0);
  }, [destinations, factCounts, region]);

  const foundByPark = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of getAllEntries()) {
      if (entry.id in found) map.set(entry.parkId, (map.get(entry.parkId) ?? 0) + 1);
    }
    return map;
  }, [found]);

  const trimmedQuery = query.trim();
  const results = useMemo(() => (trimmedQuery ? searchEntries(trimmedQuery) : []), [trimmedQuery]);
  const searching = trimmedQuery.length > 0;

  const rows = useMemo<Row[]>(
    () =>
      searching
        ? results.map((entry) => ({ kind: "entry" as const, entry }))
        : sections.map((section) => ({ kind: "group" as const, region: section.region, destinations: section.destinations })),
    [searching, results, sections]
  );

  const renderRow = useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      if (item.kind === "entry") {
        return (
          <View style={styles.row}>
            <EntryCard entry={item.entry} showLocation />
          </View>
        );
      }
      return (
        <View style={[styles.row, styles.regionGroup]}>
          {region === undefined && (
            <Text style={styles.regionTitle} accessibilityRole="header">
              {item.region}
            </Text>
          )}
          {item.destinations.map((d) => (
            <ParkCard
              key={d.parkId}
              name={d.name}
              parkKey={d.parkKey}
              count={d.count}
              found={foundByPark.get(d.parkId) ?? 0}
              factCount={factCounts.get(d.parkId) ?? 0}
              onPress={() => navigation.navigate("Park", { parkId: d.parkId })}
            />
          ))}
        </View>
      );
    },
    [styles, region, foundByPark, factCounts, navigation]
  );

  // Passed as an element, not a component, so the text input keeps its
  // identity (and the keyboard) across every keystroke.
  const header = (
    <>
      <PageHeader title="Parks" subtitle="Pick a destination. The magic hides in plain sight." brand />
      <View style={styles.body}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={t.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search attractions"
            placeholderTextColor={t.colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search attractions"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={t.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {!searching && (
          <FadingScrollRow contentContainerStyle={styles.chips} style={styles.chipRow}>
            <Chip label="All" selected={region === undefined} onPress={() => setRegion(undefined)} />
            {REGIONS.map((r) => (
              <Chip key={r} label={r} selected={region === r} onPress={() => setRegion(r)} />
            ))}
          </FadingScrollRow>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={rowKey}
        renderItem={renderRow}
        extraData={foundByPark}
        ListHeaderComponent={header}
        ListEmptyComponent={
          searching ? (
            <View style={styles.row}>
              <EmptyState title="No matches" message="Try an attraction, land, or park name." />
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={[styles.row, styles.footer]}>
            <Disclaimer />
          </View>
        }
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
      />
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
    body: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md - 4,
    },
    row: {
      paddingHorizontal: spacing.lg,
    },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      height: 44,
      paddingHorizontal: spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    searchInput: {
      flex: 1,
      ...text.body,
      lineHeight: 20,
      color: t.colors.text,
      paddingVertical: 0,
    },
    chipRow: {
      marginHorizontal: -spacing.lg,
    },
    chips: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    regionGroup: {
      gap: spacing.sm + 2,
    },
    regionTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    footer: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
  });
