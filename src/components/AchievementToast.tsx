import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAchievementsStore, getAchievement } from '../store/useAchievementsStore';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text, shadows } from '../theme/tokens';
import Badge from './ui/Badge';
import Confetti from './ui/Confetti';

const HIDDEN_Y = -180;
const SHOW_MS = 4200;

/**
 * Slides in from the top when an achievement is earned, with a haptic and a
 * burst of confetti. Tap to dismiss, or it goes on its own. Mounted once at
 * the app root so it works on any screen.
 */
export default function AchievementToast() {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const pending = useAchievementsStore((s) => s.pending);
  const dismissPending = useAchievementsStore((s) => s.dismissPending);

  const current = pending[0];
  const achievement = useMemo(() => (current ? getAchievement(current) : undefined), [current]);
  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;

  const hide = useCallback(() => {
    Animated.timing(translateY, {
      toValue: HIDDEN_Y,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => dismissPending());
  }, [translateY, dismissPending]);

  useEffect(() => {
    if (!current) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    const earned = getAchievement(current);
    if (earned) AccessibilityInfo.announceForAccessibility(`Badge unlocked: ${earned.title}`);
    translateY.setValue(HIDDEN_Y);
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    const timer = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(timer);
  }, [current, translateY, hide]);

  if (!achievement) return null;

  const confettiColors = [
    t.colors.primary,
    t.parks.studios.accent,
    t.parks.kingdom.accent,
    t.parks.springs.accent,
    t.colors.success,
  ];

  return (
    <Animated.View
      style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
    >
      <Confetti key={current} colors={confettiColors} />
      <Pressable onPress={hide} style={styles.card} accessibilityRole="button" accessibilityLabel={`Badge unlocked: ${achievement.title}. Tap to dismiss.`}>
        <Badge achievement={achievement} earned size={44} />
        <View style={styles.textColumn}>
          <Text style={styles.eyebrow}>Badge unlocked</Text>
          <Text style={styles.title} numberOfLines={1}>
            {achievement.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {achievement.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      zIndex: 100,
      elevation: 100,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.md,
      ...shadows.lg,
    },
    textColumn: {
      flex: 1,
      gap: 1,
    },
    eyebrow: {
      ...text.labelCaps,
      color: t.colors.textMuted,
    },
    title: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    description: {
      ...text.bodySmall,
      lineHeight: 18,
      color: t.colors.textSecondary,
    },
  });
