import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, ScrollView, View, Animated, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useLocationsStore } from '../store/useLocationsStore';
import { useFoundStore } from '../store/useFoundStore';
import AppShell from '../components/layout/AppShell';
import Section from '../components/layout/Section';
import EmptyState from '../components/ui/EmptyState';
import FoundToggle from '../components/ui/FoundToggle';
import { colors, spacing, radii, typography } from '../theme/tokens';

type LocationDetailRouteProp = RouteProp<RootStackParamList, 'LocationDetail'>;

export default function LocationDetailScreen() {
  const route = useRoute<LocationDetailRouteProp>();
  const { locationId } = route.params;
  const locations = useLocationsStore((state) => state.locations);
  const location = locations.find((loc) => loc.id === locationId);
  const isFound = useFoundStore((state) => state.isFound(locationId));
  const toggleFound = useFoundStore((state) => state.toggleFound);

  if (!location) {
    return (
      <AppShell title="Location" subtitle="">
        <EmptyState
          title="Not found"
          message="This location isn't documented. It might be one of those spots that only regulars know about."
        />
      </AppShell>
    );
  }

  const difficultyStars = '★'.repeat(location.difficulty) + '☆'.repeat(5 - location.difficulty);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  return (
    <AppShell title={location.title} subtitle="">
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Section title="Difficulty" description="">
            <Text style={styles.difficultyStars}>{difficultyStars}</Text>
          </Section>

          <Section title="Hint" description="">
            <Text style={styles.hintText}>{location.hint}</Text>
          </Section>

          <Section title="Story" description="">
            <Text style={styles.storyText}>{location.story}</Text>
          </Section>

          <Section title="Coordinates" description="">
          <Text style={styles.coordinatesText}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </Section>

          <View style={styles.foundButtonContainer}>
            <FoundToggle isFound={isFound} onToggle={() => toggleFound(locationId)} />
          </View>
        </ScrollView>
      </Animated.View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  difficultyStars: {
    fontSize: typography.sizes.xl,
    color: colors.text,
    letterSpacing: 4,
  },
  hintText: {
    fontSize: typography.sizes.md,
    lineHeight: typography.lineHeights.loose,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storyText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.loose,
    color: colors.textSecondary,
  },
  coordinatesText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'monospace',
    color: colors.textMuted,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foundButtonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
});
