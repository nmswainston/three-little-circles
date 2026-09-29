import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge } from '../data/types';
import { ChallengeProgress, ChallengeStatus, progressUnit } from '../data/challenges';
import { getDestination } from '../data/destinations';
import { parkKeyFor } from '../theme/parks';
import { ParkPalette } from '../theme/themes';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import ProgressBar from './ui/ProgressBar';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * A challenge's colors: its park's palette, or gold for challenges that cross
 * parks. `text` is safe as small text on the background.
 */
export function challengeAccent(t: Theme, challenge: Challenge): ParkPalette {
  if (challenge.parkId) return t.parks[parkKeyFor(challenge.parkId)];
  return { accent: t.colors.primary, onAccent: t.colors.onPrimary, tint: t.colors.primaryLight, text: t.colors.warning };
}

interface ChallengeCardProps {
  challenge: Challenge;
  progress: ChallengeProgress;
  status: ChallengeStatus;
  onPress: () => void;
  /** A slim row for Profile: no blurb, smaller disc. */
  compact?: boolean;
}

/** A challenge with its park, count, bar, and where to go next. */
export default function ChallengeCard({ challenge, progress, status, onPress, compact = false }: ChallengeCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const colors = challengeAccent(t, challenge);
  const parkName = challenge.parkId ? getDestination(challenge.parkId)?.name : undefined;
  const count = `${progress.current} / ${progress.goal} ${progressUnit(challenge)}`;
  const done = status === 'complete';
  const next = done ? 'Complete' : progress.focus ? `Next: ${progress.focus.name}` : undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        `${challenge.title} challenge`,
        parkName,
        done ? 'complete' : `${progress.current} of ${progress.goal} ${progressUnit(challenge)}`,
        done ? undefined : next,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [compact ? styles.compact : styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={[compact ? styles.discSmall : styles.disc, { backgroundColor: colors.accent }]}>
          <Ionicons
            name={(done ? 'checkmark' : challenge.icon ?? 'flag') as IconName}
            size={compact ? 18 : 22}
            color={colors.onAccent}
          />
        </View>
        <View style={styles.titleCol}>
          {parkName && !compact && <Text style={[styles.eyebrow, { color: colors.text }]}>{parkName}</Text>}
          <Text style={compact ? styles.titleCompact : styles.title} numberOfLines={2}>
            {challenge.title}
          </Text>
        </View>
        {compact ? (
          <Text style={[styles.countCompact, { color: colors.text }]}>
            {progress.current} / {progress.goal}
          </Text>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={t.colors.textSecondary} />
        )}
      </View>
      {!compact && <Text style={styles.blurb}>{challenge.blurb}</Text>}
      <ProgressBar progress={done ? 1 : progress.fraction} color={colors.accent} height={compact ? 6 : 8} />
      {!compact && (
        <View style={styles.metaRow}>
          <Text style={[styles.count, { color: colors.text }]}>{count}</Text>
          {next && (
            <Text style={styles.next} numberOfLines={1}>
              {next}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm + 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    compact: {
      gap: spacing.sm - 2,
      paddingVertical: spacing.sm + 2,
    },
    pressed: {
      opacity: 0.85,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 4,
    },
    disc: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    discSmall: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleCol: {
      flex: 1,
      gap: 1,
    },
    eyebrow: {
      ...text.labelCaps,
      fontSize: 12,
    },
    title: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    titleCompact: {
      ...text.meta,
      fontSize: 15,
      color: t.colors.text,
    },
    blurb: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    count: {
      ...text.meta,
      flex: 1,
      fontVariant: ['tabular-nums'],
    },
    countCompact: {
      ...text.meta,
      fontVariant: ['tabular-nums'],
    },
    next: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
      flexShrink: 1,
    },
  });
