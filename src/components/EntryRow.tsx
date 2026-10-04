import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HiddenMickeyEntry } from '../data/types';
import { labelOrFallback } from '../data/labels';
import { isConfirmed } from '../data/confirmations';
import { useFoundStore } from '../store/useFoundStore';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';

interface EntryRowProps {
  entry: HiddenMickeyEntry;
  onPress: () => void;
}

/** Most finds are indoors, so the row only names the other settings. */
const DEFAULT_LOCATION = 'Indoor';

/**
 * Compact entry row for grouped lists: title, a shield when the find is
 * confirmed, difficulty as a coloured dot and word, the setting when it is
 * out of the ordinary, and either a found check or a chevron.
 */
export default function EntryRow({ entry, onPress }: EntryRowProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const found = useFoundStore((s) => entry.id in s.found);
  const title = labelOrFallback(entry.display?.entryTitle, 'Hidden Find');
  const confirmed = isConfirmed(entry);
  const label = [
    `${title}${found ? ', found' : ''}`,
    confirmed ? 'confirmed' : undefined,
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
          {confirmed && (
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={t.colors.success}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
          <View style={[styles.levelDot, { backgroundColor: t.difficulty[entry.difficulty].bg }]} />
          <Text style={styles.level}>{entry.difficulty}</Text>
          {entry.locationType !== DEFAULT_LOCATION && <Text style={styles.meta}>{`· ${entry.locationType}`}</Text>}
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
    levelDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    level: {
      ...text.bodySmall,
      lineHeight: 18,
      fontFamily: text.chip.fontFamily,
      color: t.colors.textSecondary,
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
