import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { parks } from '../data/sampleData';
import { colors, spacing, radii, typography, shadows } from '../theme/tokens';

interface ParkPickerProps {
  selectedParkId?: string;
}

export default function ParkPicker({ selectedParkId }: ParkPickerProps) {
  const selectedPark = selectedParkId 
    ? parks.find(p => p.id === selectedParkId)
    : null;
  
  const displayText = selectedPark ? selectedPark.name : 'All Parks';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    margin: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  text: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
    letterSpacing: typography.letterSpacing.tight,
  },
});
