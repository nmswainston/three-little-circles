import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, ListRenderItem, Platform, Alert, Pressable } from "react-native";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, getEntryById, getParksSummary } from "../data/query";
import { getDestination } from "../data/destinations";
import { labelOrFallback } from "../data/labels";
import { Coordinates, HiddenMickeyEntry } from "../data/types";
import { formatCoordinates } from "../lib/maps";
import { distanceLabel, nearest, sortByDistance, unitsForRegion, WALKING_RANGE_METERS } from "../lib/geo";
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

type NearbyRow = { entry: HiddenMickeyEntry; trailingLabel: string };
const nearbyKey = (row: NearbyRow) => row.entry.id;
const entryKey = (entry: HiddenMickeyEntry) => entry.id;

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
  const [position, setPosition] = useState<Coordinates | undefined>();

  const handleSelectPark = (parkId: string | undefined) => {
    setFocusId(undefined);
    navigation.setParams({ focusEntryId: undefined });
    setSelectedParkId(parkId);
  };

  // Ask for location only when the user taps the locate button, then keep
  // the dot on for the rest of the session. A fix also sorts the list under
  // the map by distance, and if you're standing in a different park than
  // the picker shows, switches to it. "All" is left alone. When the park
  // switches, the fit-to-pins effect below takes over the zoom, so you see
  // the whole park with your dot in it.
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
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setPosition(here);
      setFocusId(undefined);
      const closest = nearest(getAllEntries(), here);
      if (selectedParkId && closest && closest.meters <= WALKING_RANGE_METERS && closest.item.parkId !== selectedParkId) {
        handleSelectPark(closest.item.parkId);
      }
      mapRef.current?.animateToRegion({ ...here, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 400);
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
  // Once we know where you are, the list under the map is closest first.
  const nearby = useMemo(() => (position ? sortByDistance(pinned, position) : undefined), [pinned, position]);
  const withinWalk = nearby ? nearby.filter((n) => n.meters <= WALKING_RANGE_METERS).length : 0;
  // One flat list for the closest-first cards, with the unpinned entries at
  // the end. The lists under the map are virtualized: with every park
  // selected they would otherwise mount a card for every entry at once.
  const nearbyRows = useMemo<NearbyRow[] | undefined>(() => {
    if (!nearby) return undefined;
    return [
      ...nearby.map(({ item, meters }) => ({
        entry: item,
        trailingLabel: distanceLabel(meters, unitsForRegion(getDestination(item.parkId)?.region)),
      })),
      ...unpinned.map((entry) => ({ entry, trailingLabel: "No pin yet" })),
    ];
  }, [nearby, unpinned]);
  const renderNearby = useCallback<ListRenderItem<NearbyRow>>(
    ({ item }) => <EntryCard entry={item.entry} showLocation trailingLabel={item.trailingLabel} />,
    []
  );
  const renderUnpinned = useCallback<ListRenderItem<HiddenMickeyEntry>>(
    ({ item }) => <EntryCard entry={item} showLocation />,
    []
  );
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
            accessibilityState={{ busy: locating }}
            style={({ pressed }) => [styles.control, (pressed || locating) && styles.controlPressed]}
          >
            <Ionicons name={locationGranted ? "locate" : "locate-outline"} size={22} color={t.colors.text} />
          </Pressable>
        </View>
      </View>
      {nearbyRows ? (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle} accessibilityRole="header">
              Closest to you
            </Text>
            <Text style={styles.listMeta}>
              {withinWalk === 0 ? "None within a walk" : `${withinWalk} within a walk`}
            </Text>
          </View>
          <FlatList
            data={nearbyRows}
            keyExtractor={nearbyKey}
            renderItem={renderNearby}
            style={styles.nearbyList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            windowSize={5}
          />
        </>
      ) : (
        <>
          <Text style={styles.summary}>
            {pinned.length} pinned{unpinned.length > 0 ? `, ${unpinned.length} without a location yet` : ""}. Tap a pin, then its label, for details. Tap the locate button to sort by distance. Long-press the map to copy a spot's coordinates.
          </Text>
          {unpinned.length > 0 && (
            <FlatList
              data={unpinned}
              keyExtractor={entryKey}
              renderItem={renderUnpinned}
              style={styles.unpinnedList}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={6}
              windowSize={5}
            />
          )}
        </>
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
    nearbyList: {
      maxHeight: 300,
    },
    listHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      paddingBottom: spacing.xs,
    },
    listTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    listMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.sm + 2,
    },
  });
