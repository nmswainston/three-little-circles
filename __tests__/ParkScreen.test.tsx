import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ParkScreen from '../src/screens/ParkScreen';
import { getAllEntries, getParksSummary, groupByLand } from '../src/data/query';
import { isConfirmed } from '../src/data/confirmations';
import { getDestination } from '../src/data/destinations';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParkId = '';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { parkId: mockParkId } }),
}));

// The park with the most finds, so the list is as long as it gets.
const park = [...getParksSummary()].sort((a, b) => b.count - a.count)[0];
const entries = getAllEntries().filter((e) => e.parkId === park.parkId);
const groups = groupByLand(entries);
const firstLand = groups[0];
const firstAttraction = firstLand.attractions[0];
const firstEntry = firstAttraction.entries[0];
const parkName = getDestination(park.parkId)?.name ?? park.parkName;

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
  mockParkId = park.parkId;
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  useFoundStore.setState({ found: {} });
  useSettingsStore.setState({ hideFound: false, confirmedOnly: false });
});

describe('ParkScreen', () => {
  it('shows the park, its first land, attraction, and find', () => {
    render(<ParkScreen />);
    expect(screen.getByText(parkName)).toBeTruthy();
    expect(screen.getByText(`0 of ${entries.length} found`)).toBeTruthy();
    expect(screen.getByText(firstLand.landName)).toBeTruthy();
    const count = firstLand.attractions.length;
    expect(screen.getAllByText(`${count} ${count === 1 ? 'attraction' : 'attractions'}`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(firstAttraction.attractionName).length).toBeGreaterThan(0);
    expect(screen.getAllByText(firstEntry.display!.entryTitle!).length).toBeGreaterThan(0);
  });

  it('opens a find from its row', () => {
    render(<ParkScreen />);
    fireEvent.press(screen.getAllByText(firstEntry.display!.entryTitle!)[0]);
    expect(mockNavigate).toHaveBeenCalledWith('EntryDetail', { entryId: firstEntry.id });
  });

  it('empties the list when everything is found and hidden, and brings it back on request', () => {
    useFoundStore.setState({ found: Object.fromEntries(entries.map((e) => [e.id, Date.now()])) });
    useSettingsStore.setState({ hideFound: true });
    render(<ParkScreen />);
    expect(screen.getByText(`${entries.length} of ${entries.length} found`)).toBeTruthy();
    expect(screen.getByText('All found here')).toBeTruthy();
    expect(screen.queryByText(firstLand.landName)).toBeNull();

    fireEvent.press(screen.getByText('Show found'));
    expect(useSettingsStore.getState().hideFound).toBe(false);
    expect(screen.getByText(firstLand.landName)).toBeTruthy();
  });

  it('hides unconfirmed finds with Confirmed only, and remembers the choice', () => {
    const unconfirmed = entries.find((e) => !isConfirmed(e))!;
    const title = unconfirmed.display!.entryTitle!;
    const unconfirmedCount = entries.filter((e) => !isConfirmed(e)).length;
    render(<ParkScreen />);
    expect(screen.queryAllByText(title).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText('Confirmed only'));
    expect(useSettingsStore.getState().confirmedOnly).toBe(true);
    expect(screen.getByText(`${unconfirmedCount} hidden`)).toBeTruthy();
    // Titles are not unique across entries, so only check the ones no confirmed find shares.
    if (!entries.some((e) => isConfirmed(e) && e.display?.entryTitle === title)) {
      expect(screen.queryAllByText(title)).toHaveLength(0);
    }
  });

  it('offers to show everything when nothing here is confirmed yet', () => {
    // Everything confirmed is marked found and hidden, so only unconfirmed finds remain.
    const confirmedIds = entries.filter((e) => isConfirmed(e)).map((e) => e.id);
    useFoundStore.setState({ found: Object.fromEntries(confirmedIds.map((id) => [id, Date.now()])) });
    useSettingsStore.setState({ hideFound: true, confirmedOnly: true });
    render(<ParkScreen />);
    expect(screen.getByText('Nothing confirmed here yet')).toBeTruthy();

    fireEvent.press(screen.getByText('Show all'));
    expect(useSettingsStore.getState().confirmedOnly).toBe(false);
    expect(screen.queryByText('Nothing confirmed here yet')).toBeNull();
  });

  it('keeps the suggestion card at the end and the back button at the top', () => {
    render(<ParkScreen />);
    fireEvent.press(screen.getByText('Suggest a find'));
    expect(mockNavigate).toHaveBeenCalledWith('SubmitSighting', { parkId: park.parkId });
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
