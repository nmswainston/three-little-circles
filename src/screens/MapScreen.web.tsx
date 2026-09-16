import React, { useMemo, useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { getAllEntries, getParksSummary } from "../data/query";
import ParkPicker from "../components/ParkPicker";
import EntryCard from "../components/EntryCard";
import AppShell from "../components/layout/AppShell";
import Section from "../components/layout/Section";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../theme/tokens";

/**
 * Web build: react-native-maps has no web renderer, so this screen shows the
 * same filtered entries as a list. Native builds use MapScreen.tsx.
 */
export default function MapScreen() {
  const parks = useMemo(() => getParksSummary(), []);
  const [selectedParkId, setSelectedParkId] = useState<string | undefined>(undefined);

  const visible = useMemo(
    () => getAllEntries().filter((e) => !selectedParkId || e.parkId === selectedParkId),
    [selectedParkId]
  );

  return (
    <AppShell title="Map" subtitle="Sightlines and queues" contentStyle={styles.content}>
      <ParkPicker parks={parks} selectedParkId={selectedParkId} onSelect={setSelectedParkId} />
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <Section
          title="Locations"
          description="The interactive map is available in the mobile app. Everything is listed here."
        >
          {visible.length === 0 ? (
            <EmptyState title="Nothing here yet" message="No entries match this filter." />
          ) : (
            visible.map((entry) => <EntryCard key={entry.id} entry={entry} showLocation />)
          )}
        </Section>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
});
