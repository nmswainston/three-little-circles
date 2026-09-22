import { Linking, Platform } from 'react-native';
import { Coordinates } from '../data/types';

/**
 * Opens the phone's own maps app at a coordinate: Apple Maps on iOS, whatever
 * handles geo: links on Android (usually Google Maps), Google Maps on web.
 */
export function openDirections(coordinates: Coordinates, label: string): Promise<void> {
  const { latitude, longitude } = coordinates;
  const name = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${name}`
      : Platform.OS === 'android'
        ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${name})`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return Linking.openURL(url).then(() => undefined);
}

/** "28.35634, -81.56281": the format the entry files use, ready to paste. */
export function formatCoordinates(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
}
