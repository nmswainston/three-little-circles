import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import {
  getEntriesByAttraction,
  getAttractionsByLand,
  formatSubtitle,
} from "../data/query";
import { labelOrFallback } from "../data/labels";
import AppShell from "../components/layout/AppShell";
import { colors, spacing, typography, radii, shadows } from "../theme/tokens";
import SegmentedControl, { SegmentedControlOption } from "../components/ui/SegmentedControl";

type AttractionRouteProp = RouteProp<RootStackParamList, "Attraction">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AttractionScreen() {
  const route = useRoute<AttractionRouteProp>();
  const navigation = useNavigation<NavigationProp>();
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
          {entries.map((entry) => {
            const title = labelOrFallback(entry.display?.entryTitle, "Hidden Find");
            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.card}
                onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardSubtitle}>{formatSubtitle(entry)}</Text>
                  {entry.description && (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {entry.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
});
