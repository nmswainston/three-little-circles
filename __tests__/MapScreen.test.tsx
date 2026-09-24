import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import { getAllEntries, getParksSummary } from '../src/data/query';
import { sortByDistance, WALKING_RANGE_METERS } from '../src/lib/geo';
import { useFoundStore } from '../src/store/useFoundStore';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

const mockPosition = { latitude: 0, longitude: 0 };
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { ...mockPosition } })),
}));

// The park with the most pins, selected through the picker if it is not the default.
const parks = getParksSummary();
const park = [...parks]
  .map((p) => ({ ...p, pinned: getAllEntries().filter((e) => e.parkId === p.parkId && e.coordinates).length }))
  .sort((a, b) => b.pinned - a.pinned)[0];
const visible = getAllEntries().filter((e) => e.parkId === park.parkId);
const pinned = visible.filter((e) => e.coordinates);
const unpinned = visible.filter((e) => !e.coordinates);
const origin = pinned[0].coordinates!;
const withinWalk = sortByDistance(pinned, origin).filter((n) => n.meters <= WALKING_RANGE_METERS).length;

function renderPark() {
  render(<MapScreen />);
  if (park.parkId !== parks[0].parkId) fireEvent.press(screen.getByText(park.parkName));
}

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  useFoundStore.setState({ found: {} });
  mockPosition.latitude = origin.latitude;
  mockPosition.longitude = origin.longitude;
});

describe('MapScreen', () => {
  it('pins what it can and lists the rest under the map', () => {
    expect(pinned.length).toBeGreaterThan(0);
    renderPark();
    expect(screen.getAllByTestId('map-marker')).toHaveLength(pinned.length);
    expect(screen.getByText(new RegExp(`^${pinned.length} pinned`))).toBeTruthy();
    if (unpinned.length > 0) {
      expect(screen.getAllByText(unpinned[0].display!.entryTitle!).length).toBeGreaterThan(0);
    }
  });

  it('sorts the list closest first once it knows where you are', async () => {
    renderPark();
    expect(screen.queryByText('Closest to you')).toBeNull();

    fireEvent.press(screen.getByLabelText('Show my location'));
    expect(await screen.findByText('Closest to you')).toBeTruthy();
    expect(screen.getByText(withinWalk === 0 ? 'None within a walk' : `${withinWalk} within a walk`)).toBeTruthy();
    // Standing on the first pin: its card leads the list with no distance to walk.
    expect(screen.getAllByText('Right here').length).toBeGreaterThan(0);
    expect(screen.getAllByText(pinned[0].display!.entryTitle!).length).toBeGreaterThan(0);
  });
});
