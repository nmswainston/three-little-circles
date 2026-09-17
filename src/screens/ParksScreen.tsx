import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TextInput, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, searchEntries } from "../data/query";
import { getDestinationSummaries, Region, REGIONS } from "../data/destinations";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import PageHeader from "../components/layout/PageHeader";
import Chip from "../components/ui/Chip";
import ParkCard from "../components/ParkCard";
import EntryCard from "../components/EntryCard";
import EmptyState from "../components/ui/EmptyState";
import Disclaimer from "../components/Disclaimer";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_REGION: Region = "Florida";

export default function ParksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const found = useFoundStore((s) => s.found);

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<Region | undefined>(DEFAULT_REGION);

  const destinations = useMemo(() => getDestinationSummaries(), []);

  // One flat group for a chosen region; otherwise one group per region so
  // the same park name in different places is never mistaken for a duplicate.
  const sections = useMemo(() => {
    if (region) {
      return [{ region, destinations: destinations.filter((d) => d.region === region) }];
    }
    return REGIONS.map((r) => ({ region: r, destinations: destinations.filter((d) => d.region === r) })).filter(
      (s) => s.destinations.length > 0
    );
  }, [destinations, region]);

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

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

          {searching ? (
            <View style={styles.list}>
              {results.length === 0 ? (
                <EmptyState
                  title="No matches"
                  message="Try an attraction, land, or park name."
                />
              ) : (
                results.map((entry) => <EntryCard key={entry.id} entry={entry} showLocation />)
              )}
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
                style={styles.chipRow}
              >
                <Chip label="All" selected={region === undefined} onPress={() => setRegion(undefined)} />
                {REGIONS.map((r) => (
                  <Chip key={r} label={r} selected={region === r} onPress={() => setRegion(r)} />
                ))}
              </ScrollView>

              <View style={styles.list}>
                {sections.map((section) => (
                  <View key={section.region} style={styles.regionGroup}>
                    {region === undefined && <Text style={styles.regionTitle}>{section.region}</Text>}
                    {section.destinations.map((d) => (
                      <ParkCard
                        key={d.parkId}
                        name={d.name}
                        parkKey={d.parkKey}
                        count={d.count}
                        found={foundByPark.get(d.parkId) ?? 0}
                        onPress={() => navigation.navigate("Park", { parkId: d.parkId })}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.footer}>
            <Disclaimer />
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
    body: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md - 4,
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
      flexGrow: 0,
      flexShrink: 0,
    },
    chips: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    list: {
      gap: spacing.md,
      paddingTop: spacing.xs,
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
