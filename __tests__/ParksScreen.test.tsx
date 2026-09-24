import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ParksScreen from '../src/screens/ParksScreen';
import { getAllEntries, searchEntries } from '../src/data/query';
import { getDestinationSummaries } from '../src/data/destinations';
import { useFoundStore } from '../src/store/useFoundStore';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// Florida is the default region. Its parks are the first thing on screen.
const florida = getDestinationSummaries().filter((d) => d.region === 'Florida');
const target = getAllEntries().find((e) => e.display?.entryTitle && e.display?.attractionName)!;
const query = target.display!.attractionName!;
const results = searchEntries(query);

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  useFoundStore.setState({ found: {} });
});

describe('ParksScreen', () => {
  it('lists the default region without a region heading', () => {
    render(<ParksScreen />);
    expect(screen.getByText(florida[0].name)).toBeTruthy();
    // Once for the chip; no second time for a section title.
    expect(screen.getAllByText('Florida')).toHaveLength(1);
  });

  it('groups every region under a heading in the All view', () => {
    render(<ParksScreen />);
    fireEvent.press(screen.getByText('All'));
    expect(screen.getAllByText('Florida')).toHaveLength(2);
  });

  it('opens a park from its card', () => {
    render(<ParksScreen />);
    fireEvent.press(screen.getByText(florida[0].name));
    expect(mockNavigate).toHaveBeenCalledWith('Park', { parkId: florida[0].parkId });
  });

  it('swaps the park cards for matching finds while searching, and back on clear', () => {
    expect(results.length).toBeGreaterThan(0);
    render(<ParksScreen />);
    fireEvent.changeText(screen.getByLabelText('Search attractions'), query);

    expect(screen.getAllByText(results[0].display!.entryTitle!).length).toBeGreaterThan(0);
    expect(screen.queryByText(florida[0].name)).toBeNull();
    expect(screen.queryByText('All')).toBeNull();

    fireEvent.press(screen.getByLabelText('Clear search'));
    expect(screen.getByText(florida[0].name)).toBeTruthy();
    expect(screen.getByText('All')).toBeTruthy();
  });

  it('says so when nothing matches', () => {
    render(<ParksScreen />);
    fireEvent.changeText(screen.getByLabelText('Search attractions'), 'zqxjv nothing');
    expect(screen.getByText('No matches')).toBeTruthy();
    expect(screen.queryByText(florida[0].name)).toBeNull();
  });
});
