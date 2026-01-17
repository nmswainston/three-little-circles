import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocationsStore } from '../store/useLocationsStore';
import ParkPicker from '../components/ParkPicker';
import AppShell from '../components/layout/AppShell';
import Section from '../components/layout/Section';
import LocationCard from '../components/LocationCard';
import { spacing } from '../theme/tokens';

export default function MapScreen() {
  const locations = useLocationsStore((state) => state.locations);

  return (
    <AppShell
      title="Map"
      subtitle="Sightlines and queues"
      contentStyle={styles.content}
    >
      <View style={styles.overlay}>
        <ParkPicker />
      </View>
      <ScrollView style={styles.webContainer} showsVerticalScrollIndicator={false}>
        <Section
          title="Locations"
          description="Map view available on mobile. Listed below:"
        >
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </Section>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  webContainer: {
    flex: 1,
    paddingTop: spacing.xxxl,
  },
});
