import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Achievement, AchievementProgress } from '../data/achievements';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import Badge, { badgeAccent } from './ui/Badge';
import ProgressBar from './ui/ProgressBar';

interface BadgeProgressRowProps {
  achievement: Achievement;
  progress: AchievementProgress;
  onPress: () => void;
  /** A slim row for long lists: smaller badge, thinner bar, no detail line. */
  compact?: boolean;
  /** Text before the title, for example "Next up: " */
  prefix?: string;
}

/** What to do next for a badge: the closest land or attraction, else its hint. */
export function progressDetail(achievement: Achievement, progress: AchievementProgress): string {
  return progress.focus ? `Closest: ${progress.focus.name}` : achievement.hint;
}

/** A locked badge with its count and a bar, in the badge's own color. */
export default function BadgeProgressRow({ achievement, progress, onPress, compact = false, prefix }: BadgeProgressRowProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const colors = badgeAccent(t, achievement);
  const detail = progressDetail(achievement, progress);
  const count = `${progress.current} / ${progress.goal}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        `${prefix ?? ''}${achievement.title}`,
        `${progress.current} of ${progress.goal}`,
        `${progress.remaining} to go`,
        compact ? undefined : detail,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [compact ? styles.compact : styles.card, pressed && styles.pressed]}
    >
      <Badge achievement={achievement} earned={false} inProgress={progress.current > 0} size={compact ? 32 : 40} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={compact ? styles.titleCompact : styles.title} numberOfLines={2}>
            {prefix}
            {achievement.title}
          </Text>
          <Text style={[styles.count, { color: colors.text }]}>{count}</Text>
        </View>
        {!compact && (
          <Text style={styles.detail} numberOfLines={2}>
            {detail}
          </Text>
        )}
        <ProgressBar progress={progress.fraction} color={colors.accent} height={compact ? 6 : 8} />
        {!compact && <Text style={styles.remaining}>{progress.remaining} to go</Text>}
      </View>
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 4,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md - 2,
    },
    compact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 4,
      minHeight: 56,
      paddingVertical: spacing.sm,
    },
    pressed: {
      opacity: 0.85,
    },
    body: {
      flex: 1,
      gap: spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    title: {
      ...text.itemTitle,
      flex: 1,
      color: t.colors.text,
    },
    titleCompact: {
      ...text.meta,
      fontSize: 15,
      flex: 1,
      color: t.colors.text,
    },
    count: {
      ...text.meta,
      fontVariant: ['tabular-nums'],
    },
    detail: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    remaining: {
      ...text.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      fontSize: 12,
      color: t.colors.textSecondary,
    },
  });
