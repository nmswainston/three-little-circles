import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, radii, text } from '../theme/tokens';
import { useUnlock } from '../lib/useUnlock';

interface UnlockCardProps {
  /** Shown above the pitch, like the locked park's name. */
  title?: string;
}

/**
 * The one-time unlock: what it opens, the store's price, a buy button and
 * Restore purchases (which Apple requires next to any non-consumable).
 */
export default function UnlockCard({ title = 'Unlock every park' }: UnlockCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const { unlocked, price, busy, message, purchase, restore } = useUnlock();

  if (unlocked) {
    return (
      <View style={styles.card} accessibilityLiveRegion="polite">
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={22} color={t.colors.success} />
          <Text style={styles.title}>Every park is unlocked</Text>
        </View>
        <Text style={styles.body}>Thanks for supporting Three Little Circles.</Text>
      </View>
    );
  }

  const buyLabel = price ? `Unlock for ${price}` : 'Unlock every park';

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>
        Magic Kingdom and Disneyland Park are free. One purchase opens every other park, now and as new
        ones are added. No subscription.
      </Text>
      <Pressable
        onPress={purchase}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityLabel={buyLabel}
        accessibilityState={{ busy: busy === 'purchase', disabled: busy !== null }}
        style={({ pressed }) => [styles.buyButton, pressed && styles.pressed, busy !== null && styles.dimmed]}
      >
        {busy === 'purchase' ? (
          <ActivityIndicator color={t.colors.onInk} />
        ) : (
          <>
            <Ionicons name="lock-open-outline" size={20} color={t.colors.onInk} />
            <Text style={styles.buyText}>{buyLabel}</Text>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={restore}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityState={{ busy: busy === 'restore', disabled: busy !== null }}
        hitSlop={8}
        style={styles.restoreLink}
      >
        <Text style={styles.restoreText}>{busy === 'restore' ? 'Checking…' : 'Restore purchases'}</Text>
      </Pressable>
      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm + 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    body: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    buyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      gap: spacing.sm - 2,
      minHeight: 44,
      minWidth: 160,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    buyText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    pressed: {
      opacity: 0.9,
    },
    dimmed: {
      opacity: 0.6,
    },
    restoreLink: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
    },
    restoreText: {
      ...text.meta,
      color: t.colors.textSecondary,
      textDecorationLine: 'underline',
    },
    message: {
      ...text.bodySmall,
      color: t.colors.text,
    },
  });
