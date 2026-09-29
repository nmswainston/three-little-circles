import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Achievement } from '../data/achievements';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import { tierAccent } from './ui/Badge';

interface TierLadderProps {
  /** Every level, lowest first (tierLadder) */
  ladder: Achievement[];
  unlocked: readonly string[];
  /** How far along the count is, for example finds so far */
  count: number;
}

/**
 * A tiered badge's levels as one segmented bar: earned levels full in their
 * metal, the next one filling, later ones empty.
 */
export default function TierLadder({ ladder, unlocked, count }: TierLadderProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  if (ladder.length === 0) return null;

  const have = new Set(unlocked);
  const nextIndex = ladder.findIndex((a) => !have.has(a.id));
  const top = nextIndex === -1 ? ladder[ladder.length - 1] : ladder[nextIndex - 1];
  const next = nextIndex === -1 ? undefined : ladder[nextIndex];
  const groupTitle = ladder[0].tier!.groupTitle;

  const heading = next
    ? top
      ? `${groupTitle}: ${top.tier!.name} to ${next.tier!.name}`
      : `${groupTitle}: on the way to ${next.tier!.name}`
    : `${groupTitle}: every level earned`;
  const goal = next?.tier!.threshold;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={[heading, next ? `${Math.min(count, goal!)} of ${goal}` : undefined].filter(Boolean).join(', ')}
    >
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{heading}</Text>
        {next && (
          <Text style={[styles.count, { color: tierAccent(t, next.tier!.level).text }]}>
            {Math.min(count, goal!)} / {goal}
          </Text>
        )}
      </View>
      <View style={styles.segments}>
        {ladder.map((level, i) => {
          const metal = tierAccent(t, level.tier!.level).accent;
          const from = i === 0 ? 0 : ladder[i - 1].tier!.threshold;
          const fill = have.has(level.id)
            ? 1
            : i === nextIndex
              ? Math.max(0, Math.min(1, (count - from) / (level.tier!.threshold - from)))
              : 0;
          return (
            <View key={level.id} style={styles.segmentCol}>
              <View style={[styles.segment, { backgroundColor: t.colors.track }]}>
                {fill > 0 && <View style={[styles.segmentFill, { width: `${fill * 100}%`, backgroundColor: metal }]} />}
              </View>
              <Text style={styles.segmentLabel} numberOfLines={1}>
                {level.tier!.name}
              </Text>
              <Text style={styles.segmentThreshold}>{level.tier!.threshold}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    heading: {
      ...text.itemTitle,
      flex: 1,
      color: t.colors.text,
    },
    count: {
      ...text.meta,
      fontVariant: ['tabular-nums'],
    },
    segments: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    segmentCol: {
      flex: 1,
      gap: spacing.xs,
    },
    segment: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    segmentFill: {
      height: 8,
      borderRadius: 4,
    },
    segmentLabel: {
      ...text.labelCaps,
      fontSize: 10,
      color: t.colors.textSecondary,
    },
    segmentThreshold: {
      ...text.meta,
      fontSize: 12,
      lineHeight: 14,
      marginTop: -spacing.xs,
      color: t.colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
  });
