import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HiddenMickeyEntry } from '../data/types';
import { labelOrFallback } from '../data/labels';
import { useFoundStore } from '../store/useFoundStore';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import DifficultyChip from './ui/DifficultyChip';

interface EntryRowProps {
  entry: HiddenMickeyEntry;
  onPress: () => void;
}

/**
 * Compact entry row for grouped lists: title, location type, difficulty,
 * and either a found check or a chevron.
 */
export default function EntryRow({ entry, onPress }: EntryRowProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const found = useFoundStore((s) => entry.id in s.found);
  const title = labelOrFallback(entry.display?.entryTitle, 'Hidden Find');
  const label = [
    `${title}${found ? ', found' : ''}`,
    entry.locationType,
    entry.difficulty,
    entry.entryType === 'FACT' ? 'Hidden Surprise' : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.textColumn}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{entry.locationType}</Text>
          <DifficultyChip level={entry.difficulty} size="small" />
          {entry.entryType === 'FACT' && (
            <View style={styles.factChip}>
              <Text style={styles.factText}>Hidden Surprise</Text>
            </View>
          )}
        </View>
      </View>
      {found ? (
        <View style={styles.foundDisc}>
          <Ionicons name="checkmark" size={16} color={t.colors.onSuccess} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
      )}
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 4,
      minHeight: 56,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md - 2,
    },
    pressed: {
      backgroundColor: t.colors.surfaceAlt,
    },
    textColumn: {
      flex: 1,
      gap: 3,
    },
    title: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm - 2,
    },
    meta: {
      ...text.bodySmall,
      lineHeight: 18,
      color: t.colors.textSecondary,
    },
    factChip: {
      minHeight: 20,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    factText: {
      ...text.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: t.colors.textSecondary,
    },
    foundDisc: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
