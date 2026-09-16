import React, { useRef } from 'react';
import { Pressable, Animated, Text, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useStyles, useTheme } from '../../theme/ThemeProvider';
import { spacing, radii, text } from '../../theme/tokens';

interface FoundButtonProps {
  found: boolean;
  onToggle: () => void;
}

/**
 * The app's core action: a full-width gold pill that turns green once the
 * find is marked. Pops on press and gives a haptic tap on device.
 */
export default function FoundButton({ found, onToggle }: FoundButtonProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const scale = useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.05, duration: 90, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      const feedback = found
        ? Haptics.selectionAsync()
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      feedback.catch(() => {});
    }
    pop();
    onToggle();
  };

  const foreground = found ? t.colors.onSuccess : t.colors.onPrimary;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ checked: found }}
        accessibilityLabel={found ? 'Found. Tap to unmark.' : 'Mark as found'}
        style={({ pressed }) => [styles.button, found ? styles.found : styles.idle, pressed && styles.pressed]}
      >
        <Ionicons name={found ? 'checkmark-circle' : 'checkmark'} size={22} color={foreground} />
        <Text style={[styles.label, { color: foreground }]}>{found ? 'Found' : 'Mark as found'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm + 2,
      height: 56,
      borderRadius: radii.full,
      paddingHorizontal: spacing.lg,
    },
    idle: {
      backgroundColor: t.colors.primary,
    },
    found: {
      backgroundColor: t.colors.success,
    },
    pressed: {
      opacity: 0.9,
    },
    label: {
      ...text.button,
    },
  });
