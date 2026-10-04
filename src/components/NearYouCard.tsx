import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { labelOrFallback } from "../data/labels";
import { getDestination } from "../data/destinations";
import { NearYou } from "../lib/nearYou";
import { LastViewed } from "../lib/lastViewed";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";

interface NearYouCardProps {
  /** The land the guest is in, when location is on and they are inside a park. */
  here?: NearYou;
  /** Location has not been decided yet, so offer to turn it on. */
  canAsk: boolean;
  /** The find they opened last, to pick up where they left off. */
  lastViewed?: LastViewed;
  onAsk: () => void;
  onShowNearby: () => void;
  onContinue: () => void;
}

/**
 * The first thing on the Parks home. In a park it is the land you are standing
 * in with a button to its finds, and a line to pick up the last find you
 * opened. Anywhere else the last find becomes its own card, and before
 * location is allowed a quieter invitation offers to turn it on.
 */
export default function NearYouCard({ here, canAsk, lastViewed, onAsk, onShowNearby, onContinue }: NearYouCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const palette = useParkPalette(here?.parkId ?? "");
  const lastPalette = useParkPalette(lastViewed?.parkId ?? "");

  if (!here) {
    if (!canAsk && !lastViewed) return null;
    return (
      <View style={styles.stack}>
        {lastViewed && (
          <Pressable
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel={`Continue where you left off: ${lastViewed.title}, ${lastViewed.attractionName}`}
            style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
          >
            <View style={[styles.disc, { backgroundColor: lastPalette.accent }]}>
              <Ionicons name="play" size={16} color={lastPalette.onAccent} />
            </View>
            <View style={styles.inviteText}>
              <Text style={styles.inviteTitle}>Continue where you left off</Text>
              <Text style={styles.inviteMeta} numberOfLines={1}>
                {`${lastViewed.title} · ${lastViewed.attractionName}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
          </Pressable>
        )}
        {canAsk && (
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
        )}
      </View>
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
      {lastViewed && (
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={`Last viewed: ${lastViewed.title}, ${lastViewed.attractionName}`}
          style={({ pressed }) => [styles.last, { borderTopColor: fg }, pressed && styles.pressed]}
        >
          <Text style={[styles.lastText, { color: fg }]} numberOfLines={1}>
            {`Last viewed: ${lastViewed.title}`}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={fg} />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    stack: {
      gap: spacing.sm,
    },
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
    last: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      minHeight: 44,
      marginTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    lastText: {
      ...text.bodySmall,
      flex: 1,
    },
    pressed: {
      opacity: 0.85,
    },
    disc: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
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
      borderColor: t.colors.controlBorder,
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
