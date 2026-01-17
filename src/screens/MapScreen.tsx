import React from 'react';
import { View, StyleSheet } from 'react-native';
// @ts-ignore - react-native-maps doesn't have web support
import MapView, { Marker } from 'react-native-maps';
import { useLocationsStore } from '../store/useLocationsStore';
import { useFoundStore } from '../store/useFoundStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ParkPicker from '../components/ParkPicker';
import AppShell from '../components/layout/AppShell';
import { colors } from '../theme/tokens';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Approximate center point between the two parks
const INITIAL_REGION = {
  latitude: 28.3962,
  longitude: -81.5653,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const locations = useLocationsStore((state) => state.locations);
  const isFound = useFoundStore((state) => state.isFound);

  const handleMarkerPress = (locationId: string) => {
    navigation.navigate('LocationDetail', { locationId });
  };

  return (
    <AppShell
      title="Map"
      subtitle="Sightlines and queues"
      contentStyle={styles.content}
    >
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation={false}
        >
          {locations.map((location) => (
            <Marker
              key={location.id}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={location.title}
              description={location.hint}
              pinColor={isFound(location.id) ? 'green' : 'red'}
              onPress={() => handleMarkerPress(location.id)}
            />
          ))}
        </MapView>
        <View style={styles.overlay}>
          <ParkPicker />
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
