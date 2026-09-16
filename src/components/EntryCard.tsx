import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { HiddenMickeyEntry } from "../data/types";
import { labelOrFallback } from "../data/labels";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text, shadows } from "../theme/tokens";
import DifficultyChip from "./ui/DifficultyChip";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntryCardProps {
  entry: HiddenMickeyEntry;
  /** Show the park/land/attraction line under the title. Useful outside the browse hierarchy. */
  showLocation?: boolean;
}

/** Standalone entry card for search results and the map list. */
export default function EntryCard({ entry, showLocation = false }: EntryCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const found = useFoundStore((s) => entry.id in s.found);
  const title = labelOrFallback(entry.display?.entryTitle, "Hidden Find");

  const locationLine = [entry.display?.parkName, entry.display?.landName, entry.display?.attractionName]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={({ pressed }) => [styles.card, found && styles.cardFound, pressed && styles.pressed]}
      onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
      accessibilityRole="button"
      accessibilityLabel={`${title}${found ? ", found" : ""}`}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {found && (
          <View style={styles.foundDisc}>
            <Ionicons name="checkmark" size={14} color={t.colors.onSuccess} />
          </View>
        )}
      </View>
      {showLocation && locationLine.length > 0 && <Text style={styles.location}>{locationLine}</Text>}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{entry.locationType}</Text>
        <DifficultyChip level={entry.difficulty} size="small" />
        {entry.entryType === "FACT" && (
          <View style={styles.factChip}>
            <Text style={styles.factText}>Fact</Text>
          </View>
        )}
      </View>
      {entry.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {entry.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.xs + 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      ...shadows.sm,
    },
    cardFound: {
      borderColor: t.colors.success,
    },
    pressed: {
      opacity: 0.9,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    title: {
      flex: 1,
      ...text.cardTitle,
      color: t.colors.text,
    },
    foundDisc: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    location: {
      ...text.labelCaps,
      textTransform: "none",
      letterSpacing: 0,
      color: t.colors.textMuted,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm - 2,
    },
    meta: {
      ...text.bodySmall,
      lineHeight: 18,
      color: t.colors.textSecondary,
    },
    factChip: {
      height: 20,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    factText: {
      ...text.labelCaps,
      textTransform: "none",
      letterSpacing: 0,
      color: t.colors.textSecondary,
    },
    description: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
  });
