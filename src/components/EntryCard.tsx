import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { HiddenMickeyEntry } from "../data/types";
import { formatSubtitle } from "../data/query";
import { labelOrFallback } from "../data/labels";
import { useFoundStore } from "../store/useFoundStore";
import { colors, spacing, radii, typography, shadows } from "../theme/tokens";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntryCardProps {
  entry: HiddenMickeyEntry;
  /** Show the park/land/attraction line under the title. Useful outside the browse hierarchy. */
  showLocation?: boolean;
}

export default function EntryCard({ entry, showLocation = false }: EntryCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const found = useFoundStore((s) => entry.id in s.found);
  const title = labelOrFallback(entry.display?.entryTitle, "Hidden Find");

  const locationLine = [
    entry.display?.parkName,
    entry.display?.landName,
    entry.display?.attractionName,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <TouchableOpacity
      style={[styles.card, found && styles.cardFound]}
      onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}${found ? ", found" : ""}`}
    >
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.cardTitle}>{title}</Text>
          {found && (
            <View style={styles.foundBadge}>
              <Ionicons name="checkmark" size={14} color={colors.background} />
            </View>
          )}
        </View>
        {showLocation && locationLine.length > 0 && (
          <Text style={styles.cardLocation}>{locationLine}</Text>
        )}
        <Text style={styles.cardSubtitle}>{formatSubtitle(entry)}</Text>
        {entry.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {entry.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardFound: {
    borderColor: colors.success,
  },
  cardContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  foundBadge: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  cardLocation: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
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
