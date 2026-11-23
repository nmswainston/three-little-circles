import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useStyles, useTheme } from '../theme/ThemeProvider';
import { spacing, text } from '../theme/tokens';
import UnlockCard from './UnlockCard';

interface LockedParkProps {
  parkName: string;
  onBack: () => void;
}

/** Full screen shown in place of a locked park or one of its finds. */
export default function LockedPark({ parkName, onBack }: LockedParkProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={t.colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Ionicons name="lock-closed" size={32} color={t.colors.textSecondary} />
        <Text style={styles.title} accessibilityRole="header">
          {parkName}
        </Text>
        <Text style={styles.lead}>This park is part of the one-time unlock.</Text>
        <UnlockCard title="Unlock every park" />
      </ScrollView>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    back: {
      width: 44,
      height: 44,
      justifyContent: 'center',
    },
    body: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    title: {
      ...text.title,
      color: t.colors.text,
    },
    lead: {
      ...text.body,
      color: t.colors.textSecondary,
    },
  });
