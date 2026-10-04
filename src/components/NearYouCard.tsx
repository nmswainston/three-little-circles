import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { labelOrFallback } from "../data/labels";
import { getDestination } from "../data/destinations";
import { NearYou } from "../lib/nearYou";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";

interface NearYouCardProps {
  /** The land the guest is in, when location is on and they are inside a park. */
  here?: NearYou;
  /** Location has not been decided yet, so offer to turn it on. */
  canAsk: boolean;
  onAsk: () => void;
  onShowNearby: () => void;
}

/**
 * The first thing on the Parks home: the land you are standing in with a
 * button to its finds. Before location is allowed it is a quieter invitation,
 * and outside a park or with location off there is no card at all.
 */
export default function NearYouCard({ here, canAsk, onAsk, onShowNearby }: NearYouCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const palette = useParkPalette(here?.parkId ?? "");

  if (!here) {
    if (!canAsk) return null;
    return (
      <Pressable
        onPress={onAsk}
        accessibilityRole="button"
        accessibilityLabel="Find what is near you. Turn on location."
        style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
      >
        <Ionicons name="location-outline" size={22} color={t.colors.text} />
        <View style={styles.inviteText}>
          <Text style={styles.inviteTitle}>Find what's near you</Text>
          <Text style={styles.inviteMeta}>Use your location to jump to the land you're in.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
      </Pressable>
    );
  }

  // By day the card is the park's solid accent, like its header; by night it
  // stays a dark surface and the accent moves into the text.
  const bg = t.dark ? t.colors.surface : palette.accent;
  const fg = t.dark ? palette.accent : t.colors.textOnAccent;
  const parkName = getDestination(here.parkId)?.name ?? labelOrFallback(here.parkName, "Park");
  const landName = labelOrFallback(here.landName, "Land");
  const summary = `${here.total} ${here.total === 1 ? "find" : "finds"} here. ${here.found} found.`;

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.kicker} accessible accessibilityLabel={`Near you, in ${parkName}`}>
        <View style={styles.live} />
        <Text style={[styles.kickerText, { color: fg }]}>{`Near you · ${parkName}`}</Text>
      </View>
      <Text style={[styles.land, { color: fg }]} accessibilityRole="header">
        {landName}
      </Text>
      <Text style={[styles.summary, { color: fg }]}>{summary}</Text>
      <Pressable
        onPress={onShowNearby}
        accessibilityRole="button"
        accessibilityLabel={`Show finds near you in ${landName}`}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="location" size={18} color={t.colors.onPrimary} />
        <Text style={styles.buttonText}>Show nearby finds</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radii.xl,
      padding: spacing.md,
      gap: spacing.xs,
    },
    kicker: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    live: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#7CF2A6",
    },
    kickerText: {
      ...text.labelCaps,
    },
    land: {
      ...text.display,
      fontSize: 28,
      lineHeight: 32,
    },
    summary: {
      ...text.bodySmall,
      marginBottom: spacing.sm,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 48,
      borderRadius: radii.full,
      backgroundColor: t.colors.primary,
    },
    buttonText: {
      ...text.button,
      color: t.colors.onPrimary,
    },
    pressed: {
      opacity: 0.85,
    },
    invite: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
      minHeight: 64,
      padding: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    inviteText: {
      flex: 1,
      gap: 1,
    },
    inviteTitle: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    inviteMeta: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
  });
