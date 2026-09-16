import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, getParksSummary } from "../data/query";
import { labelOrFallback } from "../data/labels";
import { useFoundStore } from "../store/useFoundStore";
import ParkPicker from "../components/ParkPicker";
import EntryCard from "../components/EntryCard";
import AppShell from "../components/layout/AppShell";
import { colors, spacing, typography } from "../theme/tokens";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fallback when nothing in the current selection has coordinates.
const FALLBACK_REGION: Region = {
  latitude: 28.3852,
  longitude: -81.5639,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<MapView>(null);
  const parks = useMemo(() => getParksSummary(), []);
  const [selectedParkId, setSelectedParkId] = useState<string | undefined>(parks[0]?.parkId);
  const found = useFoundStore((s) => s.found);

  const visible = useMemo(
    () => getAllEntries().filter((e) => !selectedParkId || e.parkId === selectedParkId),
    [selectedParkId]
  );
  const pinned = useMemo(() => visible.filter((e) => e.coordinates), [visible]);
  const unpinned = useMemo(() => visible.filter((e) => !e.coordinates), [visible]);

  useEffect(() => {
    if (pinned.length === 0) {
      mapRef.current?.animateToRegion(FALLBACK_REGION, 300);
      return;
    }
    mapRef.current?.fitToCoordinates(
      pinned.map((e) => e.coordinates!),
      { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
    );
  }, [pinned]);

  return (
    <AppShell title="Map" subtitle="Sightlines and queues" contentStyle={styles.content}>
      <ParkPicker parks={parks} selectedParkId={selectedParkId} onSelect={setSelectedParkId} />
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={FALLBACK_REGION}
          showsUserLocation={false}
        >
          {pinned.map((entry) => (
            <Marker
              key={entry.id}
              coordinate={entry.coordinates!}
              title={labelOrFallback(entry.display?.entryTitle, "Hidden Find")}
              description={entry.display?.attractionName}
              pinColor={entry.id in found ? colors.success : colors.error}
              onCalloutPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
            />
          ))}
        </MapView>
      </View>
      <Text style={styles.summary}>
        {pinned.length} pinned{unpinned.length > 0 ? `, ${unpinned.length} without a location yet` : ""}. Tap a pin, then its label, for details.
      </Text>
      {unpinned.length > 0 && (
        <ScrollView style={styles.unpinnedList} showsVerticalScrollIndicator={false}>
          {unpinned.map((entry) => (
            <EntryCard key={entry.id} entry={entry} showLocation />
          ))}
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  unpinnedList: {
    maxHeight: 220,
    paddingHorizontal: spacing.xl,
  },
});
