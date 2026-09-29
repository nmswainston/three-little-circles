import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Achievement,
  AchievementId,
  AchievementProgress,
  closestToEarning,
  getAchievements,
  useAchievementsStore,
  useBadgeProgress,
} from '../store/useAchievementsStore';
import { useFoundStore } from '../store/useFoundStore';
import { getEntryById } from '../data/query';
import { night, Theme } from '../theme/themes';
import { useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import ProgressBar from './ui/ProgressBar';

type IconName = keyof typeof Ionicons.glyphMap;

export type SummaryState =
  | { kind: 'start' }
  | { kind: 'earned'; achievement: Achievement; unseenCount: number }
  | { kind: 'next'; achievement: Achievement; progress: AchievementProgress }
  | { kind: 'complete' };

/**
 * Pure: what the Home card should say. A brand new guest gets an invitation,
 * a badge nobody has looked at yet gets a celebration, and otherwise the
 * badge closest to earning gets a nudge.
 */
export function summaryState(
  achievements: Achievement[],
  foundCount: number,
  unlocked: AchievementId[],
  seen: AchievementId[],
  earnedAt: Record<AchievementId, number>,
  progress: Record<AchievementId, AchievementProgress>
): SummaryState {
  if (foundCount === 0 && unlocked.length === 0) return { kind: 'start' };

  const seenSet = new Set(seen);
  const unseen = achievements
    .filter((a) => unlocked.includes(a.id) && !seenSet.has(a.id))
    .sort((a, b) => (earnedAt[b.id] ?? 0) - (earnedAt[a.id] ?? 0));
  if (unseen.length > 0) return { kind: 'earned', achievement: unseen[0], unseenCount: unseen.length };

  const [nextId] = closestToEarning(progress, unlocked, 1);
  const next = achievements.find((a) => a.id === nextId);
  if (next && progress[next.id]) return { kind: 'next', achievement: next, progress: progress[next.id] };

  return { kind: 'complete' };
}

function nextDetail(progress: AchievementProgress): string {
  const left = `${progress.remaining} to go`;
  return progress.focus ? `${left} at ${progress.focus.name}` : left;
}

/**
 * The badge card at the top of Home. It always sits on navy, in both themes,
 * so it draws with the night palette: its park accents are the ones made to
 * read on navy.
 */
export default function BadgeSummaryCard({
  onOpen,
  onOpenChallenge,
}: {
  onOpen: () => void;
  /** When the next badge is a challenge's, the card opens that challenge instead. */
  onOpenChallenge?: (challengeId: string) => void;
}) {
  const t = useTheme();
  const styles = useStyles(createStyles);

  const found = useFoundStore((s) => s.found);
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const seen = useAchievementsStore((s) => s.seen);
  const earnedAt = useAchievementsStore((s) => s.earnedAt);
  const markSeen = useAchievementsStore((s) => s.markSeen);
  const progress = useBadgeProgress();

  const achievements = useMemo(() => getAchievements(), []);
  const foundCount = useMemo(() => Object.keys(found).filter((id) => getEntryById(id)).length, [found]);
  const earnedCount = useMemo(
    () => achievements.filter((a) => unlocked.includes(a.id)).length,
    [achievements, unlocked]
  );
  const state = summaryState(achievements, foundCount, unlocked, seen, earnedAt, progress);
  const tally = `${earnedCount} of ${achievements.length}`;

  if (state.kind === 'earned') {
    const { achievement, unseenCount } = state;
    const heading = unseenCount > 1 ? `${unseenCount} new badges` : 'New badge';
    return (
      <Pressable
        // Opening the Badges screen counts as having seen every new one: it
        // lists them first, and one tap per badge to clear the card would be
        // a chore after a big day.
        onPress={() => {
          markSeen();
          onOpen();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${heading}: ${achievement.title}. ${achievement.description} Opens your badges.`}
        style={({ pressed }) => [styles.card, styles.cardEarned, pressed && styles.pressed]}
      >
        <View style={styles.topRow}>
          <Text style={[styles.eyebrow, styles.onGold]}>{heading}</Text>
          <Text style={[styles.tally, styles.onGold]}>{tally}</Text>
          <Ionicons name="chevron-forward" size={18} color={t.colors.onPrimary} />
        </View>
        <View style={styles.mainRow}>
          <View style={[styles.disc, { backgroundColor: t.colors.onPrimary }]}>
            <Ionicons name={achievement.icon as IconName} size={24} color={t.colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.earnedTitle, styles.onGold]} numberOfLines={1}>
              {achievement.title}
            </Text>
            <Text style={[styles.detail, styles.onGold]} numberOfLines={2}>
              {achievement.description}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const accent =
    state.kind === 'next' && state.achievement.parkKey ? night.parks[state.achievement.parkKey].accent : night.colors.primary;

  const title =
    state.kind === 'start'
      ? 'Find your first Hidden Mickey'
      : state.kind === 'next'
        ? `Next up: ${state.achievement.title}`
        : 'Every badge earned';
  const detail =
    state.kind === 'start'
      ? 'Pick a park below, mark a find, and your first badge is yours.'
      : state.kind === 'next'
        ? nextDetail(state.progress)
        : 'New ones arrive as the guide grows.';
  const icon: IconName =
    state.kind === 'next' ? (state.achievement.icon as IconName) : state.kind === 'start' ? 'star' : 'trophy';
  const challengeId = state.kind === 'next' ? state.achievement.challengeId : undefined;
  const openCard = challengeId && onOpenChallenge ? () => onOpenChallenge(challengeId) : onOpen;

  return (
    <Pressable
      onPress={openCard}
      accessibilityRole="button"
      accessibilityLabel={[
        challengeId ? 'Challenge' : `Your badges: ${tally} earned`,
        title,
        state.kind === 'next' ? `${state.progress.current} of ${state.progress.goal}` : undefined,
        detail,
      ]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [styles.card, t.dark && styles.cardNight, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>{challengeId ? 'Challenge' : 'Your badges'}</Text>
        <Text style={styles.tally}>{tally}</Text>
        <Ionicons name="chevron-forward" size={18} color={night.colors.text} />
      </View>
      <View style={styles.mainRow}>
        <View style={[styles.ring, { borderColor: accent }]}>
          <View style={[styles.disc, styles.discSmall, { backgroundColor: `${accent}33` }]}>
            <Ionicons name={icon} size={20} color={accent} />
          </View>
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {state.kind === 'next' && (
              <Text style={[styles.count, { color: accent }]}>
                {state.progress.current} / {state.progress.goal}
              </Text>
            )}
          </View>
          {state.kind === 'next' && (
            <ProgressBar progress={state.progress.fraction} color={accent} trackColor={TRACK_ON_NAVY} />
          )}
          <Text style={styles.detail} numberOfLines={2}>
            {detail}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const TRACK_ON_NAVY = 'rgba(245,243,231,0.18)';

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.md - 4,
      backgroundColor: t.dark ? t.colors.surface : t.colors.ink,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    cardNight: {
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    cardEarned: {
      backgroundColor: t.colors.primary,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    eyebrow: {
      ...text.labelCaps,
      fontSize: 12,
      letterSpacing: 1.2,
      flex: 1,
      color: night.colors.primary,
    },
    tally: {
      ...text.meta,
      color: night.colors.text,
    },
    onGold: {
      color: t.colors.onPrimary,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 4,
    },
    ring: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disc: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    discSmall: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    textCol: {
      flex: 1,
      gap: spacing.xs + 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    title: {
      ...text.cardTitle,
      flex: 1,
      color: night.colors.text,
    },
    earnedTitle: {
      ...text.sectionTitle,
      fontSize: 22,
      lineHeight: 26,
    },
    count: {
      ...text.meta,
      fontVariant: ['tabular-nums'],
    },
    detail: {
      ...text.bodySmall,
      color: night.colors.textSecondary,
    },
  });
