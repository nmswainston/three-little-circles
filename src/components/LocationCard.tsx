import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Location } from '../types/models';
import { useFoundStore } from '../store/useFoundStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, radii, typography, shadows } from '../theme/tokens';
import FoundToggle from './ui/FoundToggle';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LocationCardProps {
  location: Location;
}

export default function LocationCard({ location }: LocationCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const isFound = useFoundStore((state) => state.isFound(location.id));
  const toggleFound = useFoundStore((state) => state.toggleFound);

  const handlePress = () => {
    navigation.navigate('LocationDetail', { locationId: location.id });
  };

  const handleMarkFound = () => {
    toggleFound(location.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isFound && styles.containerFound]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{location.title}</Text>
          {isFound && (
            <View style={styles.foundBadge}>
              <Text style={styles.foundText}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.hint} numberOfLines={2}>
          {location.hint}
        </Text>
        <View style={styles.markFoundButtonContainer}>
          <FoundToggle isFound={isFound} onToggle={handleMarkFound} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  containerFound: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    flex: 1,
    letterSpacing: typography.letterSpacing.tight,
  },
  hint: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
  foundBadge: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  foundText: {
    color: colors.background,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  markFoundButtonContainer: {
    marginTop: spacing.md,
  },
});
