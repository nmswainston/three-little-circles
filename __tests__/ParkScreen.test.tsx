import React from 'react';
import { StyleSheet } from 'react-native';
import { SectionList } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ParkScreen from '../src/screens/ParkScreen';
import { getAllEntries, getParksSummary, groupByLand } from '../src/data/query';
import { isConfirmed } from '../src/data/confirmations';
import { getDestination } from '../src/data/destinations';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { MAX_SCALE } from '../src/lib/useScaledSize';

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
  it('lets the search field shrink so its clear button stays beside it', () => {
    render(<ParkScreen />);
    const field = screen.getByLabelText('Search this park');
    expect(StyleSheet.flatten(field.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  });

  it('shows the park, its first land, attraction, and find', () => {
    render(<ParkScreen />);
    expect(screen.getByText(parkName)).toBeTruthy();
    expect(screen.getByText(`0 of ${entries.length} found`)).toBeTruthy();
    expect(screen.getAllByText(firstLand.landName).length).toBeGreaterThan(0);
    const count = firstLand.attractions.length;
    expect(screen.getAllByText(`${count} ${count === 1 ? 'attraction' : 'attractions'}`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(firstAttraction.attractionName).length).toBeGreaterThan(0);
    expect(screen.getAllByText(firstEntry.display!.entryTitle!).length).toBeGreaterThan(0);
  });

  it('shows progress for each land and a chip to jump to it', () => {
    const landEntries = entries.filter((e) => e.landId === firstLand.landId);
    useFoundStore.setState({ found: { [landEntries[0].id]: Date.now() } });
    render(<ParkScreen />);
    expect(screen.getAllByText(new RegExp(`1 of ${landEntries.length}$`)).length).toBeGreaterThan(0);
    if (groups.length > 1) {
      expect(screen.getAllByRole('button', { name: firstLand.landName }).length).toBeGreaterThan(0);
    }
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
    expect(screen.getAllByText(firstLand.landName).length).toBeGreaterThan(0);
  });

  it('hides unconfirmed finds with Confirmed only, and remembers the choice', () => {
    // The first unconfirmed find in list order, so it sits inside the part of
    // the virtualized list that the first render draws.
    const unconfirmed = groups.flatMap((l) => l.attractions.flatMap((a) => a.entries)).find((e) => !isConfirmed(e))!;
    const title = unconfirmed.display!.entryTitle!;
    const unconfirmedCount = entries.filter((e) => !isConfirmed(e)).length;
    render(<ParkScreen />);
    expect(screen.queryAllByText(title).length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText('Filter'));
    fireEvent(screen.getByLabelText('Confirmed only'), 'valueChange', true);
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

  it('collects every filter behind one button and shows what is on', () => {
    render(<ParkScreen />);
    expect(screen.getByLabelText('Filter')).toBeTruthy();
    expect(screen.queryByLabelText('Remove filter: Hide found')).toBeNull();

    fireEvent.press(screen.getByLabelText('Filter'));
    fireEvent(screen.getByLabelText('Hide found'), 'valueChange', true);
    fireEvent.press(screen.getByLabelText('Finds'));
    expect(useSettingsStore.getState().hideFound).toBe(true);
    // The apply button says how many finds are left.
    const left = entries.filter((e) => e.entryType === 'FIND').length;
    expect(screen.getByLabelText(`Show ${left} ${left === 1 ? 'find' : 'finds'}`)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(`Show ${left} ${left === 1 ? 'find' : 'finds'}`));
    expect(screen.getByLabelText('Filter, 2 on')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Remove filter: Hide found'));
    expect(useSettingsStore.getState().hideFound).toBe(false);
    expect(screen.getByLabelText('Filter, 1 on')).toBeTruthy();
  });

  it('filters by difficulty and keeps at least one level on', () => {
    const level = entries[0].difficulty;
    const onlyLevel = entries.filter((e) => e.difficulty === level).length;
    render(<ParkScreen />);
    fireEvent.press(screen.getByLabelText('Filter'));
    for (const other of ['Easy', 'Medium', 'Hard'].filter((l) => l !== level)) {
      fireEvent.press(screen.getByLabelText(other));
    }
    // The last level cannot be turned off.
    fireEvent.press(screen.getByLabelText(level));
    expect(screen.getByLabelText(`Show ${onlyLevel} ${onlyLevel === 1 ? 'find' : 'finds'}`)).toBeTruthy();
  });

  it('searches within the park and can be cleared', () => {
    const title = firstEntry.display!.entryTitle!;
    const matching = entries.filter((e) => e.display?.entryTitle === title);
    render(<ParkScreen />);
    fireEvent.changeText(screen.getByLabelText('Search this park'), title);
    expect(screen.getAllByText(title).length).toBe(matching.length);
    fireEvent.changeText(screen.getByLabelText('Search this park'), 'zzzz no such find');
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
    fireEvent.press(screen.getByText('Clear filters'));
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  });

  it('shows the park name and count in the top bar once the header has scrolled away', () => {
    render(<ParkScreen />);
    expect(screen.getAllByText(parkName)).toHaveLength(1);
    expect(screen.queryByText(`0/${entries.length}`)).toBeNull();

    fireEvent.scroll(screen.UNSAFE_getByType(SectionList), { nativeEvent: { contentOffset: { y: 500 } } });
    expect(screen.getAllByText(parkName)).toHaveLength(2);
    expect(screen.getByText(`0/${entries.length}`)).toBeTruthy();

    fireEvent.scroll(screen.UNSAFE_getByType(SectionList), { nativeEvent: { contentOffset: { y: 0 } } });
    expect(screen.getAllByText(parkName)).toHaveLength(1);
  });

  it('highlights the chip for the land at the top of the list', () => {
    const second = groups[1];
    if (!second) return;
    render(<ParkScreen />);
    const chip = (name: string) => screen.getAllByRole('button', { name })[0];
    expect(chip(second.landName).props.accessibilityState.selected).toBe(false);

    // Through the prop SectionList converts, so each token carries its section.
    // The callback-pairs prop passes raw tokens through with no section at all.
    const list = screen.UNSAFE_getByType(SectionList);
    expect(list.props.viewabilityConfigCallbackPairs).toBeUndefined();
    act(() => {
      list.props.onViewableItemsChanged({
        viewableItems: [{ section: { landId: second.landId } }],
        changed: [],
      });
    });
    expect(chip(second.landName).props.accessibilityState.selected).toBe(true);
    expect(chip(firstLand.landName).props.accessibilityState.selected).toBe(false);
  });

  it('caps text scaling in the top bar and the land strip, which are fixed height', () => {
    if (groups.length < 2) return;
    render(<ParkScreen />);
    fireEvent.scroll(screen.UNSAFE_getByType(SectionList), { nativeEvent: { contentOffset: { y: 500 } } });
    const capped = (nodes: ReturnType<typeof screen.getAllByText>) =>
      nodes.filter((node) => node.props.maxFontSizeMultiplier === MAX_SCALE).length;
    // The compact title and count in the bar.
    expect(capped(screen.getAllByText(parkName))).toBe(1);
    expect(capped(screen.getAllByText(`0/${entries.length}`))).toBe(1);
    // The land chips, in the list strip and the pinned copy alike.
    expect(capped(screen.getAllByText(firstLand.landName))).toBeGreaterThanOrEqual(2);
    // The big header title is in flow and keeps scaling.
    const header = screen.getAllByText(parkName).find((node) => node.props.maxFontSizeMultiplier === undefined);
    expect(header).toBeTruthy();
  });

  it('pins the land chips under the top bar once scrolled', () => {
    if (groups.length < 2) return;
    render(<ParkScreen />);
    expect(screen.getAllByRole('button', { name: firstLand.landName })).toHaveLength(1);
    fireEvent.scroll(screen.UNSAFE_getByType(SectionList), { nativeEvent: { contentOffset: { y: 500 } } });
    expect(screen.getAllByRole('button', { name: firstLand.landName })).toHaveLength(2);
    fireEvent.scroll(screen.UNSAFE_getByType(SectionList), { nativeEvent: { contentOffset: { y: 0 } } });
    expect(screen.getAllByRole('button', { name: firstLand.landName })).toHaveLength(1);
  });

  it('jumps to a land from the chips in the header', () => {
    const second = groups[1];
    if (!second) return;
    const scrollToLocation = jest.spyOn(SectionList.prototype, 'scrollToLocation').mockImplementation(() => {});
    try {
      render(<ParkScreen />);
      fireEvent.press(screen.getAllByRole('button', { name: second.landName })[0]);
      expect(scrollToLocation).toHaveBeenCalledWith(expect.objectContaining({ sectionIndex: 1, itemIndex: 0 }));
    } finally {
      scrollToLocation.mockRestore();
    }
  });

  it('never toggles sticky land headers, which would rebuild the list under a jump', () => {
    render(<ParkScreen />);
    const list = () => screen.UNSAFE_getByType(SectionList);
    expect(list().props.stickySectionHeadersEnabled).toBe(false);
    fireEvent.scroll(list(), { nativeEvent: { contentOffset: { y: 500 } } });
    expect(list().props.stickySectionHeadersEnabled).toBe(false);
  });

  it('keeps Back and Share in the bar while scrolled', () => {
    render(<ParkScreen />);
    fireEvent.scroll(screen.UNSAFE_getByType(SectionList), { nativeEvent: { contentOffset: { y: 500 } } });
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Share park progress')).toBeTruthy();
  });

  it('keeps the suggestion card at the end and the back button at the top', () => {
    render(<ParkScreen />);
    fireEvent.press(screen.getByText('Suggest a find'));
    expect(mockNavigate).toHaveBeenCalledWith('SubmitSighting', { parkId: park.parkId });
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
