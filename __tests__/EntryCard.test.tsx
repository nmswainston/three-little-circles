import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import EntryCard from '../src/components/EntryCard';
import { getAllEntries } from '../src/data/query';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// Any shipped entry with a title and a description will do; the assertions
// read both back from the entry rather than hard-coding content.
const entry = getAllEntries().find((e) => e.display?.entryTitle && e.description)!;
const title = entry.display!.entryTitle!;
const description = entry.description!;

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  useFoundStore.setState({ found: {} });
  useSettingsStore.setState({ hintMode: true });
});

describe('EntryCard', () => {
  it('hides the description for an unfound entry while hints are on', () => {
    render(<EntryCard entry={entry} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(entry.locationType)).toBeTruthy();
    expect(screen.queryByText(description)).toBeNull();
  });

  it('shows the description once the entry is found', () => {
    useFoundStore.setState({ found: { [entry.id]: Date.now() } });
    render(<EntryCard entry={entry} />);
    expect(screen.getByText(description)).toBeTruthy();
    expect(screen.getByLabelText(`${title}, found`)).toBeTruthy();
  });

  it('shows the description when hints are off', () => {
    useSettingsStore.setState({ hintMode: false });
    render(<EntryCard entry={entry} />);
    expect(screen.getByText(description)).toBeTruthy();
    expect(screen.getByLabelText(title)).toBeTruthy();
  });

  it('opens the entry when tapped', () => {
    render(<EntryCard entry={entry} />);
    fireEvent.press(screen.getByLabelText(title));
    expect(mockNavigate).toHaveBeenCalledWith('EntryDetail', { entryId: entry.id });
  });

  it('puts the location line and trailing label where a screen reader hears them', () => {
    render(<EntryCard entry={entry} showLocation trailingLabel="4 min walk" />);
    expect(screen.getByText('4 min walk')).toBeTruthy();
    expect(screen.getByLabelText(`${title}, 4 min walk`)).toBeTruthy();
    const location = [entry.display?.parkName, entry.display?.landName, entry.display?.attractionName].filter(Boolean).join(' · ');
    expect(screen.getByText(location)).toBeTruthy();
  });
});
