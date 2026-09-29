import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Achievement, AchievementProgress } from '../data/achievements';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import Badge, { badgeAccent } from './ui/Badge';
import ProgressBar from './ui/ProgressBar';
import { progressDetail } from './BadgeProgressRow';

interface AchievementSheetProps {
  achievement?: Achievement;
  /** ms since epoch when earned. Badges from the oldest saves have none. */
  earnedAt?: number;
  /** Defaults to "has an earned date" */
  earned?: boolean;
  /** Shown as a bar while the badge is locked */
  progress?: AchievementProgress;
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Bottom sheet with the big badge, its status, and how to earn it. */
export default function AchievementSheet({
  achievement,
  earnedAt,
  earned = earnedAt !== undefined,
  progress,
  onClose,
}: AchievementSheetProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const showProgress = !earned && progress !== undefined;

  return (
    <Modal transparent visible={!!achievement} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      {achievement && (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Badge
            achievement={achievement}
            earned={earned}
            inProgress={showProgress && progress.current > 0}
            size={88}
          />
          <Text style={[styles.status, earned && styles.statusEarned]}>
            {earned ? (earnedAt !== undefined ? `Unlocked ${formatDate(earnedAt)}` : 'Unlocked') : 'Locked'}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {achievement.title}
          </Text>
          <Text style={styles.body}>{earned ? achievement.description : achievement.hint}</Text>
          {showProgress && (
            <View
              style={styles.progress}
              accessible
              accessibilityLabel={`${progress.current} of ${progress.goal}, ${progress.remaining} to go`}
            >
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>
                  {progress.focus ? progressDetail(achievement, progress) : `${progress.remaining} to go`}
                </Text>
                <Text style={[styles.progressCount, { color: badgeAccent(t, achievement).text }]}>
                  {progress.current} / {progress.goal}
                </Text>
              </View>
              <ProgressBar progress={progress.fraction} color={badgeAccent(t, achievement).accent} />
            </View>
          )}
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
    progress: {
      alignSelf: 'stretch',
      gap: spacing.sm - 2,
      marginTop: spacing.xs,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
    },
    progressLabel: {
      ...text.meta,
      flex: 1,
      color: t.colors.textSecondary,
    },
    progressCount: {
      ...text.meta,
      fontVariant: ['tabular-nums'],
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
