import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { getAllEntries, getParksSummary } from "../data/query";
import { Theme, useStyles } from "../theme/ThemeProvider";
import { spacing, text } from "../theme/tokens";
import PageHeader from "../components/layout/PageHeader";
import ParkPicker from "../components/ParkPicker";
import EntryCard from "../components/EntryCard";
import EmptyState from "../components/ui/EmptyState";

/**
 * Web build: react-native-maps has no web renderer, so this screen shows the
 * same filtered entries as a list. Native builds use MapScreen.tsx.
 */
export default function MapScreen() {
  const styles = useStyles(createStyles);
  const parks = useMemo(() => getParksSummary(), []);
  const [selectedParkId, setSelectedParkId] = useState<string | undefined>(undefined);

  const visible = useMemo(
    () => getAllEntries().filter((e) => !selectedParkId || e.parkId === selectedParkId),
    [selectedParkId]
  );

  return (
    <View style={styles.screen}>
      <PageHeader title="Map" subtitle="Sightlines and queues." />
      <ParkPicker parks={parks} selectedParkId={selectedParkId} onSelect={setSelectedParkId} />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={styles.caption}>The interactive map is available in the mobile app. Everything is listed here.</Text>
        {visible.length === 0 ? (
          <EmptyState title="Nothing here yet" message="No entries match this filter." />
        ) : (
          visible.map((entry) => <EntryCard key={entry.id} entry={entry} showLocation />)
        )}
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
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xl,
      gap: spacing.sm + 2,
    },
    caption: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
  });
