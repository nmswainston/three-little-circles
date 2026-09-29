import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Achievement } from '../../data/achievements';
import { Theme, useTheme } from '../../theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

interface BadgeProps {
  achievement: Achievement;
  earned: boolean;
  /** Diameter of the inner disc. The ring adds 8. */
  size?: number;
  /** Show the "new" dot */
  isNew?: boolean;
  /** Locked but started: a dashed accent ring on a tinted disc */
  inProgress?: boolean;
}

// Metal colors for tiered badges. Gold is the theme's own gold. Small text
// uses a darker shade by day and the metal itself on the night navy.
const TIERS: Record<number, { accent: string; dayText: string }> = {
  1: { accent: '#C9844A', dayText: '#8A4F1C' },
  2: { accent: '#A7AFBF', dayText: '#4F5872' },
  4: { accent: '#8ED1D9', dayText: '#1F6F78' },
};

/** The colors for one level of a tiered badge: bronze, silver, gold, platinum. */
export function tierAccent(t: Theme, level: number) {
  const metal = TIERS[level];
  if (!metal) {
    return { accent: t.colors.primary, onAccent: t.colors.onPrimary, tint: t.colors.primaryLight, text: t.colors.warning };
  }
  return {
    accent: metal.accent,
    onAccent: '#1F2A44',
    tint: `${metal.accent}33`,
    text: t.dark ? metal.accent : metal.dayText,
  };
}

/**
 * The colors a badge is drawn in: its tier's metal for tiered badges, its
 * park's accent for park badges, gold for the rest. `text` is the accent
 * adjusted for small text on the background.
 */
export function badgeAccent(t: Theme, achievement: Achievement) {
  if (achievement.tier) return tierAccent(t, achievement.tier.level);
  const palette = achievement.parkKey ? t.parks[achievement.parkKey] : undefined;
  return {
    accent: palette?.accent ?? t.colors.primary,
    onAccent: palette?.onAccent ?? t.colors.onPrimary,
    tint: palette?.tint ?? t.colors.primaryLight,
    // Gold is unreadable as small text on cream, so fixed badges use amber.
    text: palette?.text ?? t.colors.warning,
  };
}

/**
 * A medallion: a ring around a disc with the achievement's icon. Park badges
 * take their park's accent; milestone badges are gold. Locked badges sit on
 * the track color with a muted icon; started ones keep their accent on a
 * dashed ring.
 */
export default function Badge({ achievement, earned, size = 40, isNew = false, inProgress = false }: BadgeProps) {
  const t = useTheme();
  const { accent, onAccent, tint, text } = badgeAccent(t, achievement);
  const started = !earned && inProgress;

  const fill = earned ? accent : started ? tint : t.colors.track;
  const iconColor = earned ? onAccent : started ? text : t.colors.textMuted;
  const ring = earned || started ? accent : t.colors.border;
  const outer = size + 8;

  return (
    <View
      style={[
        styles.ring,
        { width: outer, height: outer, borderRadius: outer / 2, borderColor: ring },
        started && styles.ringDashed,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.disc, { width: size - 2, height: size - 2, borderRadius: (size - 2) / 2, backgroundColor: fill }]}>
        <Ionicons name={achievement.icon as IconName} size={Math.round(size * 0.5)} color={iconColor} />
      </View>
      {isNew && (
        <View style={[styles.newDot, { backgroundColor: t.colors.error, borderColor: t.colors.surface }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDashed: {
    borderStyle: 'dashed',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
