import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Achievement } from '../../data/achievements';
import { useTheme } from '../../theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

interface BadgeProps {
  achievement: Achievement;
  earned: boolean;
  /** Diameter of the inner disc. The ring adds 8. */
  size?: number;
  /** Show the "new" dot */
  isNew?: boolean;
}

/**
 * A medallion: a ring around a disc with the achievement's icon. Park badges
 * take their park's accent; milestone badges are gold. Locked badges sit on
 * the track color with a muted icon.
 */
export default function Badge({ achievement, earned, size = 40, isNew = false }: BadgeProps) {
  const t = useTheme();
  const palette = achievement.parkKey ? t.parks[achievement.parkKey] : undefined;

  const accent = palette?.accent ?? t.colors.primary;
  const onAccent = palette?.onAccent ?? t.colors.onPrimary;
  const fill = earned ? accent : t.colors.track;
  const iconColor = earned ? onAccent : t.colors.textMuted;
  const ring = earned ? accent : t.colors.border;
  const outer = size + 8;

  return (
    <View
      style={[
        styles.ring,
        { width: outer, height: outer, borderRadius: outer / 2, borderColor: ring },
      ]}
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
