import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Alert, Pressable } from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, getEntryById, getParksSummary } from "../data/query";
import { labelOrFallback } from "../data/labels";
import { formatCoordinates } from "../lib/maps";
import { useFoundStore } from "../store/useFoundStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text, shadows } from "../theme/tokens";
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
  const mapType = useSettingsStore((s) => s.mapType);
  const setMapType = useSettingsStore((s) => s.setMapType);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locating, setLocating] = useState(false);

  // Ask for location only when the user taps the locate button, then keep
  // the dot on for the rest of the session.
  const goToMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Location is off", "Allow location access for this app in your phone's settings to see where you are on the map.");
        return;
      }
      setLocationGranted(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFocusId(undefined);
      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        },
        400
      );
    } catch {
      Alert.alert("Couldn't get your location", "Try again in a moment, or step somewhere with a clearer view of the sky.");
    } finally {
      setLocating(false);
    }
  };

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
  // The clipboard module is loaded on demand so a build made before it was
  // added still runs; it just shows the numbers instead of copying them.
  const handleLongPress = async (coordinate: { latitude: number; longitude: number }) => {
    const text = formatCoordinates(coordinate);
    try {
      const Clipboard: typeof import("expo-clipboard") = require("expo-clipboard");
      await Clipboard.setStringAsync(text);
      Alert.alert("Coordinates copied", `${text}\n\nPaste into the entry's coordinates field.`);
    } catch {
      Alert.alert("Coordinates", `${text}\n\nCopying needs a newer build of the app; write these down for now.`);
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
          mapType={mapType}
          showsUserLocation={locationGranted}
          showsMyLocationButton={false}
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

        <View style={styles.controls}>
          <Pressable
            onPress={() => setMapType(mapType === "standard" ? "hybrid" : "standard")}
            accessibilityRole="button"
            accessibilityState={{ selected: mapType === "hybrid" }}
            accessibilityLabel={mapType === "hybrid" ? "Switch to drawn map" : "Switch to satellite view"}
            style={({ pressed }) => [styles.control, mapType === "hybrid" && styles.controlActive, pressed && styles.controlPressed]}
          >
            <Ionicons name="layers-outline" size={22} color={mapType === "hybrid" ? t.colors.onPrimary : t.colors.text} />
          </Pressable>
          <Pressable
            onPress={goToMyLocation}
            disabled={locating}
            accessibilityRole="button"
            accessibilityLabel="Show my location"
            style={({ pressed }) => [styles.control, (pressed || locating) && styles.controlPressed]}
          >
            <Ionicons name={locationGranted ? "locate" : "locate-outline"} size={22} color={t.colors.text} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.summary}>
        {pinned.length} pinned{unpinned.length > 0 ? `, ${unpinned.length} without a location yet` : ""}. Tap a pin, then its label, for details. Long-press the map to copy a spot's coordinates.
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
    controls: {
      position: "absolute",
      top: spacing.md - 4,
      right: spacing.md - 4,
      gap: spacing.sm + 2,
    },
    control: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.md,
    },
    controlActive: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    controlPressed: {
      opacity: 0.8,
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
