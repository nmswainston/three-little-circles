import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import TabBar from '../src/components/layout/TabBar';
import Chip from '../src/components/ui/Chip';
import EntryRow from '../src/components/EntryRow';
import StillThereCard from '../src/components/StillThereCard';
import { getAllEntries } from '../src/data/query';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { useConfirmationsStore } from '../src/store/useConfirmationsStore';
import { useFoundStore } from '../src/store/useFoundStore';

const mockSend = jest.fn();
jest.mock('../src/lib/confirm', () => ({
  sendConfirmation: (...args: unknown[]) => mockSend(...args),
}));

/** A tab bar with the three real routes and the first one focused. */
function renderTabBar(index = 0) {
  const routes = [
    { key: 'parks', name: 'ParksTab' },
    { key: 'map', name: 'MapTab' },
    { key: 'profile', name: 'ProfileTab' },
  ];
  const props = {
    state: { index, routes },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: { title: r.name.replace('Tab', '') } }])),
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  render(<TabBar {...props} />);
  return props;
}

beforeAll(async () => {
  await useAchievementsStore.persist.rehydrate();
  await useConfirmationsStore.persist.rehydrate();
  await useFoundStore.persist.rehydrate();
});

beforeEach(() => {
  mockSend.mockReset();
  useAchievementsStore.setState({ unlocked: [], seen: [] });
  useConfirmationsStore.setState({ reported: {} });
  useFoundStore.setState({ found: {} });
});

describe('tab bar', () => {
  it('exposes the tabs as tabs, with the focused one selected', () => {
    renderTabBar(1);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual(['Parks', 'Map', 'Profile']);
    expect(tabs.map((tab) => tab.props.accessibilityState.selected)).toEqual([false, true, false]);
  });

  it('says so when the red dot means a new badge', () => {
    useAchievementsStore.setState({ unlocked: ['first-find'], seen: [] });
    renderTabBar();
    expect(screen.getByRole('tab', { name: 'Profile, new badge' })).toBeTruthy();
  });

  it('navigates on tap', () => {
    const props = renderTabBar();
    fireEvent.press(screen.getByRole('tab', { name: 'Map' }));
    expect(props.navigation.navigate).toHaveBeenCalledWith('MapTab', undefined);
  });
});

describe('chip', () => {
  it('reads its label and selected state even with an icon', () => {
    render(<Chip label="Hide found" icon="eye-off" selected />);
    const chip = screen.getByRole('button', { name: 'Hide found' });
    expect(chip.props.accessibilityState).toEqual({ selected: true });
  });
});

describe('entry row', () => {
  const entry = getAllEntries().find((e) => e.display?.entryTitle && e.entryType === 'FIND')!;
  const title = entry.display!.entryTitle!;

  it('reads the type and difficulty, and the found state once marked', () => {
    render(<EntryRow entry={entry} onPress={jest.fn()} />);
    expect(screen.getByLabelText(`${title}, ${entry.locationType}, ${entry.difficulty}`)).toBeTruthy();

    // Block body on purpose: the persisted store's setState returns the storage
    // write's promise, and act would treat that as an async callback.
    act(() => {
      useFoundStore.setState({ found: { [entry.id]: Date.now() } });
    });
    expect(screen.getByLabelText(`${title}, found, ${entry.locationType}, ${entry.difficulty}`)).toBeTruthy();
  });
});

describe('still there card', () => {
  it('announces a failed report instead of only printing it under the buttons', async () => {
    mockSend.mockResolvedValue({ ok: false, message: 'No connection.' });
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    render(<StillThereCard entryId={getAllEntries()[0].id} />);

    fireEvent.press(screen.getByRole('button', { name: 'Saw it today' }));
    expect(await screen.findByText('No connection.')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('No connection.');
    announce.mockRestore();
  });

  it('marks the tapped button busy while the report is in flight', async () => {
    let finish: (value: { ok: true }) => void = () => {};
    mockSend.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<StillThereCard entryId={getAllEntries()[0].id} />);

    fireEvent.press(screen.getByRole('button', { name: "Couldn't find it" }));
    expect(screen.getByRole('button', { name: "Couldn't find it" }).props.accessibilityState).toEqual({ busy: true, disabled: true });
    expect(screen.getByRole('button', { name: 'Saw it today' }).props.accessibilityState).toEqual({ busy: false, disabled: true });

    finish({ ok: true });
    expect(await screen.findByText(/you couldn't find it/)).toBeTruthy();
  });
});
