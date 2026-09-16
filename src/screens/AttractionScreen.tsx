import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Animated, Platform } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { getEntriesByAttraction, getAttractionsByLand } from "../data/query";
import AppShell from "../components/layout/AppShell";
import EntryCard from "../components/EntryCard";
import EmptyState from "../components/ui/EmptyState";
import { spacing } from "../theme/tokens";
import SegmentedControl, { SegmentedControlOption } from "../components/ui/SegmentedControl";

type AttractionRouteProp = RouteProp<RootStackParamList, "Attraction">;

export default function AttractionScreen() {
  const route = useRoute<AttractionRouteProp>();
  const { parkId, landId, attractionId } = route.params;
  const [entryTypeFilter, setEntryTypeFilter] = useState<SegmentedControlOption>("All");
  const entries = getEntriesByAttraction(parkId, landId, attractionId, entryTypeFilter);
  const attractions = getAttractionsByLand(parkId, landId);
  const attraction = attractions.find((a) => a.attractionId === attractionId);
  const attractionName = attraction?.attractionName || "Attraction";
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  return (
    <AppShell
      title={attractionName}
      subtitle="Hidden Finds"
      contentStyle={styles.content}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.filterContainer}>
          <SegmentedControl
            options={["All", "FIND", "FACT"]}
            selectedValue={entryTypeFilter}
            onValueChange={setEntryTypeFilter}
          />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <EmptyState title="Nothing here yet" message="No entries match this filter." />
          ) : (
            entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
          )}
        </ScrollView>
      </Animated.View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
