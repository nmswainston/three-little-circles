import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ParksScreen from '../src/screens/ParksScreen';
import { getAllEntries, searchEntries } from '../src/data/query';
import { getDestinationSummaries } from '../src/data/destinations';
import { useFoundStore } from '../src/store/useFoundStore';
import { computeUnlocked, getAchievement, getAchievements, useAchievementsStore } from '../src/store/useAchievementsStore';

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
  await useAchievementsStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
});

const NOW = Date.parse('2026-09-27T12:00:00Z');
const cardLabel = () =>
  screen
    .getAllByRole('button')
    .map((b) => String(b.props.accessibilityLabel ?? ''))
    .find((l) => l.startsWith('Your badges') || /^(New badge|\d+ new badges)/.test(l));

/** Twelve finds with every resulting badge earned; `seen` says which were looked at. */
function seed(seenAll: boolean) {
  const found = Object.fromEntries(getAllEntries().slice(0, 12).map((e) => [e.id, NOW]));
  const unlocked = computeUnlocked(found);
  const earnedAt = Object.fromEntries(unlocked.map((id) => [id, NOW - 5000]));
  earnedAt.TEN_FINDS = NOW;
  useFoundStore.setState({ found });
  useAchievementsStore.setState({ unlocked, earnedAt, seen: seenAll ? unlocked : [], pending: [] });
}

describe('ParksScreen badge card', () => {
  it('invites a new guest to make a first find', () => {
    render(<ParksScreen />);
    expect(screen.getByText('Find your first Hidden Mickey')).toBeTruthy();
    fireEvent.press(screen.getByText('Find your first Hidden Mickey'));
    expect(mockNavigate).toHaveBeenCalledWith('Badges');
  });

  it('celebrates the newest unseen badge, and marks every new one seen on tap', () => {
    seed(false);
    render(<ParksScreen />);
    const { unlocked } = useAchievementsStore.getState();
    const explorer = getAchievement('TEN_FINDS')!.title;
    // Hunter Bronze and Silver are both new but count once, as Silver.
    expect(cardLabel()).toContain(`${unlocked.length - 1} new badges: ${explorer}`);

    fireEvent.press(screen.getByText(explorer));
    expect(useAchievementsStore.getState().seen.sort()).toEqual([...unlocked].sort());
    expect(mockNavigate).toHaveBeenCalledWith('Badges');
  });

  it('nudges toward the closest badge once everything earned has been seen', () => {
    seed(true);
    render(<ParksScreen />);
    expect(cardLabel()).toMatch(/^Your badges: \d+ of \d+ earned\. Next up: /);
  });

  it('opens the challenge itself when the next badge is a challenge', () => {
    const all = getAchievements().map((a) => a.id).filter((id) => id !== 'challenge:check-in-at-the-tower');
    const tower = getAllEntries().filter((e) => e.attractionId === 'hotel_drop_tower');
    useFoundStore.setState({ found: { [tower[0].id]: NOW } });
    useAchievementsStore.setState({ unlocked: all, earnedAt: {}, seen: all, pending: [] });
    render(<ParksScreen />);
    expect(cardLabel()).toBeUndefined();
    const card = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel).startsWith('Challenge. '))!;
    fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: 'check-in-at-the-tower' });
  });

  it('steps aside while searching', () => {
    render(<ParksScreen />);
    fireEvent.changeText(screen.getByLabelText('Search attractions'), query);
    expect(screen.queryByText('Find your first Hidden Mickey')).toBeNull();
  });
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
