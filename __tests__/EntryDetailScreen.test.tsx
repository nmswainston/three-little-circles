import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EntryDetailScreen from '../src/screens/EntryDetailScreen';
import { getAllEntries } from '../src/data/query';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

// A find with a scene, a tip, an exact spot, and no orientation, so the
// ladder is the free scene plus two hints: the tip, then the exact spot.
const entry = getAllEntries().find(
  (e) => e.whereToLook.scene && e.whereToLook.exactSpot && e.bestTip && !e.whereToLook.orientation
)!;
// A find with no tip, whose ladder is the scene plus the exact spot alone.
const tipless = getAllEntries().find((e) => !e.bestTip && !e.whereToLook.orientation);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { entryId: mockEntryId } }),
}));
let mockEntryId = '';

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
});

beforeEach(() => {
  mockEntryId = entry.id;
  useFoundStore.setState({ found: {} });
  useSettingsStore.getState().setHintMode(true);
});

describe('EntryDetailScreen hints', () => {
  it('shows the scene up front and keeps the tip and exact spot for later', () => {
    render(<EntryDetailScreen />);
    expect(screen.getByText(entry.whereToLook.scene)).toBeTruthy();
    expect(screen.queryByText(entry.bestTip!)).toBeNull();
    expect(screen.queryByText(entry.whereToLook.exactSpot)).toBeNull();
    expect(screen.getByText('0 of 2 hints')).toBeTruthy();
  });

  it('opens the tip first, then the exact spot', () => {
    render(<EntryDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Show the first hint' }));
    expect(screen.getByText(entry.bestTip!)).toBeTruthy();
    expect(screen.queryByText(entry.whereToLook.exactSpot)).toBeNull();
    expect(screen.getByText('1 of 2 hints')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Show the next hint' }));
    expect(screen.getByText(entry.whereToLook.exactSpot)).toBeTruthy();
    expect(screen.queryByText(/of 2 hints/)).toBeNull();
  });

  it('shows the tip only once, inside where to look', () => {
    useSettingsStore.getState().setHintMode(false);
    render(<EntryDetailScreen />);
    expect(screen.getAllByText(entry.bestTip!)).toHaveLength(1);
    expect(screen.getByText('Tip')).toBeTruthy();
  });

  it('shows everything at once with hints off', () => {
    useSettingsStore.getState().setHintMode(false);
    render(<EntryDetailScreen />);
    expect(screen.getByText(entry.whereToLook.scene)).toBeTruthy();
    expect(screen.getByText(entry.bestTip!)).toBeTruthy();
    expect(screen.getByText(entry.whereToLook.exactSpot)).toBeTruthy();
  });

  it('goes straight from the scene to the exact spot when a find has no tip', () => {
    if (!tipless) return;
    mockEntryId = tipless.id;
    render(<EntryDetailScreen />);
    expect(screen.getByText('0 of 1 hint')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Show the first hint' }));
    expect(screen.getByText(tipless.whereToLook.exactSpot)).toBeTruthy();
  });
});
