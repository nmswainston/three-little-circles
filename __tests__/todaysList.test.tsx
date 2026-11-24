import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import EntryDetailScreen from '../src/screens/EntryDetailScreen';
import TodayScreen from '../src/screens/TodayScreen';
import TodayCard from '../src/components/TodayCard';
import EntryRow from '../src/components/EntryRow';
import { getAllEntries } from '../src/data/query';
import { describeTodaysList, todaysProgressLabel } from '../src/lib/todaysList';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTodayStore } from '../src/store/useTodayStore';

const mockNavigate = jest.fn();
let mockEntryId = '';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), push: jest.fn() }),
  useRoute: () => ({ params: { entryId: mockEntryId } }),
}));

const all = getAllEntries().filter((e) => e.display?.entryTitle);
const first = all[0];
// A find in a different park, so the list has to group by park.
const elsewhere = all.find((e) => e.parkId !== first.parkId)!;
// Two finds at the same attraction, to check they land in one group.
const sameAttraction = all.filter((e) => e.parkId === first.parkId && e.attractionId === first.attractionId);
const title = (e: (typeof all)[number]) => e.display!.entryTitle!;

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
  await useTodayStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockEntryId = first.id;
  useFoundStore.setState({ found: {} });
  useTodayStore.setState({ ids: [] });
});

describe('useTodayStore', () => {
  it('adds a find, then removes it on the second toggle', () => {
    useTodayStore.getState().toggle(first.id);
    expect(useTodayStore.getState().has(first.id)).toBe(true);
    useTodayStore.getState().toggle(first.id);
    expect(useTodayStore.getState().has(first.id)).toBe(false);
  });

  it('keeps finds in the order they were added', () => {
    useTodayStore.getState().toggle(elsewhere.id);
    useTodayStore.getState().toggle(first.id);
    expect(useTodayStore.getState().ids).toEqual([elsewhere.id, first.id]);
  });

  it('removes several at once and clears the lot', () => {
    useTodayStore.setState({ ids: [first.id, elsewhere.id] });
    useTodayStore.getState().remove([first.id]);
    expect(useTodayStore.getState().ids).toEqual([elsewhere.id]);
    useTodayStore.getState().clear();
    expect(useTodayStore.getState().ids).toEqual([]);
  });
});

describe('describeTodaysList', () => {
  it('groups by park, then land and attraction, and counts what is found', () => {
    const list = describeTodaysList([elsewhere.id, first.id], { [first.id]: 1 });
    expect(list.total).toBe(2);
    expect(list.found).toBe(1);
    expect(list.foundIds).toEqual([first.id]);
    expect(list.parks.map((p) => p.parkId).sort()).toEqual([first.parkId, elsewhere.parkId].sort());
  });

  it('puts finds at one attraction together, whatever order they were added in', () => {
    const ids = sameAttraction.map((e) => e.id);
    const list = describeTodaysList(ids, {});
    const attractions = list.parks.flatMap((p) => p.lands.flatMap((l) => l.attractions));
    expect(attractions).toHaveLength(1);
    expect(attractions[0].entries).toHaveLength(ids.length);
  });

  it('quietly drops an id whose find no longer exists', () => {
    const list = describeTodaysList([first.id, 'retired-find'], {});
    expect(list.total).toBe(1);
  });

  it('words progress, and says so once everything is found', () => {
    expect(todaysProgressLabel({ total: 8, found: 3 })).toBe('3 of 8 found');
    expect(todaysProgressLabel({ total: 2, found: 2 })).toBe('All 2 found');
  });
});

describe('TodayScreen', () => {
  it('invites the guest to add a find when the list is empty', () => {
    render(<TodayScreen />);
    expect(screen.getByText('Nothing on the list yet')).toBeTruthy();
    fireEvent.press(screen.getByText('Browse parks'));
    expect(mockNavigate).toHaveBeenCalledWith('Parks');
  });

  it('lists the finds with progress, and opens one', () => {
    useTodayStore.setState({ ids: [first.id, elsewhere.id] });
    useFoundStore.setState({ found: { [first.id]: 1 } });
    render(<TodayScreen />);
    expect(screen.getByText('1 of 2 found')).toBeTruthy();
    fireEvent.press(screen.getByText(title(elsewhere)));
    expect(mockNavigate).toHaveBeenCalledWith('EntryDetail', { entryId: elsewhere.id });
  });

  it('removes a single find', () => {
    useTodayStore.setState({ ids: [first.id, elsewhere.id] });
    render(<TodayScreen />);
    fireEvent.press(screen.getByLabelText(`Remove ${title(first)} from today's list`));
    expect(useTodayStore.getState().ids).toEqual([elsewhere.id]);
  });

  it('removes only the found finds, and offers that only when some are found and some are not', () => {
    useTodayStore.setState({ ids: [first.id, elsewhere.id] });
    const view = render(<TodayScreen />);
    expect(screen.queryByText('Remove found finds')).toBeNull();
    view.unmount();

    useFoundStore.setState({ found: { [first.id]: 1 } });
    render(<TodayScreen />);
    fireEvent.press(screen.getByText('Remove found finds'));
    expect(useTodayStore.getState().ids).toEqual([elsewhere.id]);
  });

  it('asks before clearing the list, and leaves found marks alone', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useTodayStore.setState({ ids: [first.id] });
    useFoundStore.setState({ found: { [first.id]: 1 } });
    render(<TodayScreen />);
    fireEvent.press(screen.getByText('Clear list'));
    expect(useTodayStore.getState().ids).toEqual([first.id]);

    const buttons = alert.mock.calls[0][2]!;
    const confirm = buttons.find((b) => b.text === 'Clear list')!;
    act(() => {
      confirm.onPress!();
    });
    expect(useTodayStore.getState().ids).toEqual([]);
    expect(useFoundStore.getState().found).toEqual({ [first.id]: 1 });
    alert.mockRestore();
  });
});

describe('TodayCard', () => {
  it('is absent until something is on the list', () => {
    render(<TodayCard onOpen={jest.fn()} />);
    expect(screen.queryByText("Today's list")).toBeNull();
  });

  it('shows progress and opens the list', () => {
    const onOpen = jest.fn();
    useTodayStore.setState({ ids: [first.id, elsewhere.id] });
    useFoundStore.setState({ found: { [first.id]: 1 } });
    render(<TodayCard onOpen={onOpen} />);
    expect(screen.getByText('1 of 2 found')).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Today's list, 1 of 2 found"));
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('adding from a find', () => {
  it('toggles the find on and off the list', () => {
    render(<EntryDetailScreen />);
    fireEvent.press(screen.getByLabelText("Add to today's list"));
    expect(useTodayStore.getState().ids).toEqual([first.id]);
    expect(screen.getByText("On today's list")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("On today's list. Tap to remove."));
    expect(useTodayStore.getState().ids).toEqual([]);
  });
});

describe('EntryRow', () => {
  it('marks a find that is on the list, unless told not to', () => {
    useTodayStore.setState({ ids: [first.id] });
    const view = render(<EntryRow entry={first} onPress={jest.fn()} />);
    expect(screen.getByLabelText(/on today's list/)).toBeTruthy();
    view.unmount();

    render(<EntryRow entry={first} onPress={jest.fn()} hideListMark />);
    expect(screen.queryByLabelText(/on today's list/)).toBeNull();
  });
});
