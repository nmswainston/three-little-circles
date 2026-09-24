import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Achievement } from '../data/achievements';
import { Theme, useStyles } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import Badge from './ui/Badge';

interface AchievementSheetProps {
  achievement?: Achievement;
  /** ms since epoch when earned, or undefined while locked */
  earnedAt?: number;
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Bottom sheet with the big badge, its status, and how to earn it. */
export default function AchievementSheet({ achievement, earnedAt, onClose }: AchievementSheetProps) {
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const earned = earnedAt !== undefined;

  return (
    <Modal transparent visible={!!achievement} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      {achievement && (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Badge achievement={achievement} earned={earned} size={88} />
          <Text style={[styles.status, earned && styles.statusEarned]}>
            {earned ? `Unlocked ${formatDate(earnedAt)}` : 'Locked'}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {achievement.title}
          </Text>
          <Text style={styles.body}>{earned ? achievement.description : achievement.hint}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.button}>
            <Text style={styles.buttonText}>Done</Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.overlay,
    },
    sheet: {
      alignItems: 'center',
      gap: spacing.sm + 2,
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.lg + 4,
      paddingHorizontal: spacing.lg,
    },
    status: {
      ...text.labelCaps,
      color: t.colors.textMuted,
      marginTop: spacing.xs,
    },
    statusEarned: {
      color: t.colors.success,
    },
    title: {
      ...text.title,
      color: t.colors.text,
      textAlign: 'center',
    },
    body: {
      ...text.body,
      color: t.colors.textSecondary,
      textAlign: 'center',
    },
    button: {
      marginTop: spacing.sm,
      minHeight: 48,
      minWidth: 160,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...text.button,
      fontSize: 15,
      color: t.colors.onInk,
    },
  });
