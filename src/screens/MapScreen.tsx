import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Alert } from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, getEntryById, getParksSummary } from "../data/query";
import { labelOrFallback } from "../data/labels";
import { formatCoordinates } from "../lib/maps";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import PageHeader from "../components/layout/PageHeader";
import ParkPicker from "../components/ParkPicker";
import EntryCard from "../components/EntryCard";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fallback when nothing in the current selection has coordinates.
const FALLBACK_REGION: Region = {
  latitude: 28.3852,
  longitude: -81.5639,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

type MapRouteProp = RouteProp<RootStackParamList, "Map">;

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MapRouteProp>();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const mapRef = useRef<MapView>(null);
  const markerRefs = useRef<Record<string, React.ElementRef<typeof Marker> | null>>({});
  const parks = useMemo(() => getParksSummary(), []);
  const [selectedParkId, setSelectedParkId] = useState<string | undefined>(parks[0]?.parkId);
  const [focusId, setFocusId] = useState<string | undefined>();
  const found = useFoundStore((s) => s.found);

  // "See on map" from an entry: select its park and remember it for the zoom below.
  const focusEntryId = route.params?.focusEntryId;
  useEffect(() => {
    if (!focusEntryId) return;
    const entry = getEntryById(focusEntryId);
    if (!entry?.coordinates) return;
    setSelectedParkId(entry.parkId);
    setFocusId(entry.id);
  }, [focusEntryId]);

  const handleSelectPark = (parkId: string | undefined) => {
    setFocusId(undefined);
    navigation.setParams({ focusEntryId: undefined });
    setSelectedParkId(parkId);
  };

  // Long-press copies the spot's coordinates, ready to paste into an entry file.
  const handleLongPress = async (coordinate: { latitude: number; longitude: number }) => {
    const text = formatCoordinates(coordinate);
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Coordinates copied", `${text}\n\nPaste into the entry's coordinates field.`);
    } catch {
      Alert.alert("Coordinates", text);
    }
  };

  const visible = useMemo(
    () => getAllEntries().filter((e) => !selectedParkId || e.parkId === selectedParkId),
    [selectedParkId]
  );
  const pinned = useMemo(() => visible.filter((e) => e.coordinates), [visible]);
  const unpinned = useMemo(() => visible.filter((e) => !e.coordinates), [visible]);
  const [mapReady, setMapReady] = useState(false);

  const fitToPins = useCallback(() => {
    if (!mapReady) return;
    if (focusId) {
      const entry = pinned.find((e) => e.id === focusId);
      if (entry?.coordinates) {
        mapRef.current?.animateToRegion(
          { ...entry.coordinates, latitudeDelta: 0.004, longitudeDelta: 0.004 },
          400
        );
        setTimeout(() => markerRefs.current[entry.id]?.showCallout(), 600);
        return;
      }
    }
    if (pinned.length === 0) {
      mapRef.current?.animateToRegion(FALLBACK_REGION, 300);
      return;
    }
    mapRef.current?.fitToCoordinates(
      pinned.map((e) => e.coordinates!),
      { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
    );
  }, [mapReady, pinned, focusId]);

  // Zooming before the native map has loaded is silently ignored, so wait for
  // onMapReady and re-run whenever the selection changes.
  useEffect(() => {
    fitToPins();
  }, [fitToPins]);

  return (
    <View style={styles.screen}>
      <PageHeader title="Map" subtitle="Sightlines and queues." />
      <ParkPicker parks={parks} selectedParkId={selectedParkId} onSelect={handleSelectPark} />
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          // Android only renders Google Maps; iOS keeps Apple Maps, which needs no key.
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={FALLBACK_REGION}
          showsUserLocation={false}
          onMapReady={() => setMapReady(true)}
          onLongPress={(event) => handleLongPress(event.nativeEvent.coordinate)}
        >
          {pinned.map((entry) => (
            <Marker
              key={entry.id}
              ref={(ref) => {
                markerRefs.current[entry.id] = ref;
              }}
              coordinate={entry.coordinates!}
              title={labelOrFallback(entry.display?.entryTitle, "Hidden Find")}
              description={entry.display?.attractionName}
              pinColor={entry.id in found ? t.colors.success : t.colors.error}
              onCalloutPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
            />
          ))}
        </MapView>
      </View>
      <Text style={styles.summary}>
        {pinned.length} pinned{unpinned.length > 0 ? `, ${unpinned.length} without a location yet` : ""}. Tap a pin, then its label, for details. Long-press to copy a spot's coordinates.
      </Text>
      {unpinned.length > 0 && (
        <ScrollView style={styles.unpinnedList} contentContainerStyle={styles.unpinnedContent} showsVerticalScrollIndicator={false}>
          {unpinned.map((entry) => (
            <EntryCard key={entry.id} entry={entry} showLocation />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    mapContainer: {
      flex: 1,
      marginHorizontal: spacing.lg,
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: t.colors.surface,
    },
    map: {
      flex: 1,
    },
    summary: {
      ...text.bodySmall,
      color: t.colors.textMuted,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    unpinnedList: {
      maxHeight: 220,
    },
    unpinnedContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.sm + 2,
    },
  });
