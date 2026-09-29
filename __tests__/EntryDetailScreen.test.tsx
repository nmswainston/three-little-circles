import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EntryDetailScreen from '../src/screens/EntryDetailScreen';
import { getAllEntries } from '../src/data/query';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

// A find with a scene, an exact spot, a tip, and no orientation, so the
// ladder is exactly the free scene plus one hint.
const entry = getAllEntries().find(
  (e) => e.whereToLook.scene && e.whereToLook.exactSpot && e.bestTip && !e.whereToLook.orientation
)!;

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
  it('shows the scene up front and keeps the exact spot and tip for later', () => {
    render(<EntryDetailScreen />);
    expect(screen.getByText(entry.whereToLook.scene)).toBeTruthy();
    expect(screen.queryByText(entry.whereToLook.exactSpot)).toBeNull();
    expect(screen.queryByText(entry.bestTip!)).toBeNull();
    expect(screen.getByText('0 of 1 hint')).toBeTruthy();
  });

  it('opens the exact spot on the first hint, not the scene again', () => {
    render(<EntryDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Show the first hint' }));
    expect(screen.getByText(entry.whereToLook.exactSpot)).toBeTruthy();
    expect(screen.getByText(entry.bestTip!)).toBeTruthy();
    expect(screen.queryByText(/of 1 hint/)).toBeNull();
  });

  it('shows everything at once with hints off', () => {
    useSettingsStore.getState().setHintMode(false);
    render(<EntryDetailScreen />);
    expect(screen.getByText(entry.whereToLook.scene)).toBeTruthy();
    expect(screen.getByText(entry.whereToLook.exactSpot)).toBeTruthy();
  });
});
