import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { getAttractionsByLand, getLandsByPark, getParksSummary } from "../data/query";
import AppShell from "../components/layout/AppShell";
import { colors, spacing, typography, radii, shadows } from "../theme/tokens";
import SegmentedControl, { SegmentedControlOption } from "../components/ui/SegmentedControl";

type LandRouteProp = RouteProp<RootStackParamList, "Land">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LandScreen() {
  const route = useRoute<LandRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { parkId, landId } = route.params;
  const [entryTypeFilter, setEntryTypeFilter] = useState<SegmentedControlOption>("All");
  const attractions = getAttractionsByLand(parkId, landId, entryTypeFilter);
  const lands = getLandsByPark(parkId);
  const land = lands.find((l) => l.landId === landId);
  const landName = land?.landName || "Land";
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
      title={landName}
      subtitle="Attractions"
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
          {attractions.map((attraction) => (
            <TouchableOpacity
              key={attraction.attractionId}
              style={styles.card}
              onPress={() =>
                navigation.navigate("Attraction", {
                  parkId,
                  landId,
                  attractionId: attraction.attractionId,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{attraction.attractionName}</Text>
                <Text style={styles.cardCount}>
                  {attraction.count} {attraction.count === 1 ? "entry" : "entries"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardCount: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
});
