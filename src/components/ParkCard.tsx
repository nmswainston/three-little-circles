import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { ParkKey } from '../theme/themes';
import { PARK_ICONS } from '../theme/parks';
import { spacing, radii, text, shadows } from '../theme/tokens';
import ProgressRing from './ui/ProgressRing';

type IconName = keyof typeof Ionicons.glyphMap;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

interface ParkCardProps {
  name: string;
  parkKey: ParkKey;
  /** Entries a guest can find. 0 with no leads and no facts renders the card as "Coming soon". */
  count: number;
  found: number;
  /** Unconfirmed leads listed here. They open the destination but never count. */
  leadCount?: number;
  /** Park facts available. A destination with facts but no finds still opens. */
  factCount?: number;
  onPress?: () => void;
}

/** A destination row: accent disc with icon, name, counts, and a progress ring. */
export default function ParkCard({
  name,
  parkKey,
  count,
  found,
  leadCount = 0,
  factCount = 0,
  onPress,
}: ParkCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const palette = t.parks[parkKey];
  const hasFinds = count > 0;
  const comingSoon = !hasFinds && leadCount === 0 && factCount === 0;

  const meta = comingSoon
    ? 'Coming soon'
    : hasFinds
      ? [`${plural(count, 'find')} · ${found} found`, leadCount > 0 && plural(leadCount, 'lead')]
          .filter(Boolean)
          .join(' · ')
      : leadCount > 0
        ? [plural(leadCount, 'unconfirmed lead'), factCount > 0 && plural(factCount, 'fact')]
            .filter(Boolean)
            .join(' · ')
        : `No finds yet · ${plural(factCount, 'fact')}`;

  return (
    <Pressable
      onPress={comingSoon ? undefined : onPress}
      disabled={comingSoon}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${meta}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.disc, { backgroundColor: palette.accent }, comingSoon && styles.discMuted]}>
        <Ionicons name={PARK_ICONS[parkKey] as IconName} size={20} color={palette.onAccent} />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.meta, comingSoon && styles.metaMuted]}>{meta}</Text>
      </View>
      {hasFinds && <ProgressRing progress={found / count} color={palette.accent} />}
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
      borderRadius: radii.md,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.md - 2,
      minHeight: 64,
      ...shadows.sm,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    disc: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    discMuted: {
      opacity: 0.55,
    },
    textColumn: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    meta: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    metaMuted: {
      color: t.colors.textMuted,
    },
  });
