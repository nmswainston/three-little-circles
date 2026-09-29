import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge } from '../data/types';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import { challengeAccent } from './ChallengeCard';

type IconName = keyof typeof Ionicons.glyphMap;

interface ChallengeMapBannerProps {
  challenge: Challenge;
  total: number;
  /** How many have a pin. Omit where there is no map to pin them on (web). */
  pinned?: number;
  found: number;
  onClear: () => void;
}

/** Says the map is showing one challenge's finds, with a way back to everything. */
export default function ChallengeMapBanner({ challenge, total, pinned, found, onClear }: ChallengeMapBannerProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const colors = challengeAccent(t, challenge);
  const meta = [
    `${found} of ${total} found`,
    pinned === undefined ? undefined : pinned === total ? 'all on the map' : `${pinned} on the map, the rest listed below`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.banner}>
      <View style={[styles.disc, { backgroundColor: colors.accent }]}>
        <Ionicons name={(challenge.icon ?? 'flag') as IconName} size={18} color={colors.onAccent} />
      </View>
      <View style={styles.textCol} accessible accessibilityLabel={`Showing the ${challenge.title} challenge. ${meta}`}>
        <Text style={[styles.eyebrow, { color: colors.text }]}>Challenge</Text>
        <Text style={styles.title} numberOfLines={1}>
          {challenge.title}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="Show all finds"
        hitSlop={8}
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
      >
        <Text style={styles.clearText}>Show all</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 4,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md - 4,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
    },
    disc: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: {
      flex: 1,
      gap: 1,
    },
    eyebrow: {
      ...text.labelCaps,
    },
    title: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    meta: {
      ...text.bodySmall,
      fontSize: 12,
      lineHeight: 16,
      color: t.colors.textSecondary,
    },
    clear: {
      minHeight: 36,
      paddingHorizontal: spacing.md - 2,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.8,
    },
    clearText: {
      ...text.chip,
      color: t.colors.text,
    },
  });
