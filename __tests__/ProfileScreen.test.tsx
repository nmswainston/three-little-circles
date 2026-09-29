import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ProfileScreen from '../src/screens/ProfileScreen';
import { computeUnlocked, getAchievement, useAchievementsStore, visibleBadges } from '../src/store/useAchievementsStore';
import { getAllEntries } from '../src/data/query';
import { getChallenges } from '../src/data/challenges';
import { useFoundStore } from '../src/store/useFoundStore';
import { useSettingsStore } from '../src/store/useSettingsStore';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useFocusEffect: () => {},
}));

// Capture what Share progress would send instead of opening a share sheet.
const mockShareText = jest.fn(async (_text: string) => 'shared' as const);
jest.mock('../src/lib/share', () => ({
  ...jest.requireActual('../src/lib/share'),
  shareText: (text: string) => mockShareText(text),
}));

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
  await useSettingsStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], seen: [] });
  delete process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;
});

describe('ProfileScreen share', () => {
  it('counts Hunter once in the shared badge total, like the Badges card', async () => {
    const found = Object.fromEntries(getAllEntries().slice(0, 12).map((e) => [e.id, 1]));
    const unlocked = computeUnlocked(found);
    expect(unlocked).toEqual(expect.arrayContaining(['FIRST_FIND', 'TEN_FINDS']));
    useFoundStore.setState({ found });
    useAchievementsStore.setState({ unlocked, earnedAt: {}, seen: unlocked });
    mockShareText.mockClear();

    render(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Share progress' }));
    await Promise.resolve();

    const shown = visibleBadges(unlocked).earned.length;
    expect(shown).toBe(unlocked.length - 1);
    expect(mockShareText).toHaveBeenCalledWith(expect.stringContaining(`${shown} badges earned.`));
    expect(screen.getByText(`${shown} of ${visibleBadges(unlocked).earned.length + visibleBadges(unlocked).unearned.length} earned`)).toBeTruthy();
  });
});

describe('ProfileScreen badges', () => {
  const NOW = Date.parse('2026-09-27T12:00:00Z');

  it('shows only the three newest badges, a next-up row, and a link to all badges', () => {
    const found = Object.fromEntries(getAllEntries().slice(0, 12).map((e) => [e.id, NOW]));
    const unlocked = computeUnlocked(found);
    expect(unlocked.length).toBeGreaterThan(3);
    const earnedAt = Object.fromEntries(unlocked.map((id, i) => [id, NOW - i * 1000]));
    useFoundStore.setState({ found });
    useAchievementsStore.setState({ unlocked, earnedAt, seen: unlocked });

    render(<ProfileScreen />);
    const shown = screen
      .getAllByRole('button')
      .map((b) => String(b.props.accessibilityLabel ?? ''))
      .filter((l) => l.endsWith(', unlocked'));
    const newestFirst = [...visibleBadges(unlocked).earned].sort((a, b) => earnedAt[b.id] - earnedAt[a.id]);
    const titles = newestFirst.slice(0, 3).map((a) => a.title);
    expect(titles).not.toContain(getAchievement('FIRST_FIND')!.title);
    expect(shown).toEqual(titles.map((title) => `${title}, unlocked`));

    expect(screen.getAllByRole('button').some((b) => String(b.props.accessibilityLabel).startsWith('Next up: '))).toBe(
      true
    );
    fireEvent.press(screen.getByRole('button', { name: 'See all badges' }));
    expect(mockNavigate).toHaveBeenCalledWith('Badges');
  });

  it('invites a first find when nothing is earned yet', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Mark your first find and your first badge is yours.')).toBeTruthy();
  });
});

describe('ProfileScreen challenges', () => {
  it('lists three challenges, started ones first, and links to the Challenges tab', () => {
    const tower = getAllEntries().filter((e) => e.attractionId === 'hotel_drop_tower');
    useFoundStore.setState({ found: { [tower[0].id]: 1 } });
    render(<ProfileScreen />);
    const cards = screen
      .getAllByRole('button')
      .map((b) => String(b.props.accessibilityLabel ?? ''))
      .filter((l) => l.includes(' challenge,'));
    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatch(/^Check In at the Tower challenge/);
    expect(screen.getByText(`0 of ${getChallenges().length} complete`)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'See all challenges' }));
    expect(mockNavigate).toHaveBeenCalledWith('Badges', { tab: 'challenges' });
  });
});

describe('ProfileScreen feedback', () => {
  it('has no feedback section when the build carries no address', () => {
    render(<ProfileScreen />);
    expect(screen.queryByRole('button', { name: 'Send feedback' })).toBeNull();
    expect(screen.queryByText('Feedback')).toBeNull();
  });

  it('opens a prefilled email to the configured address', () => {
    process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = 'beta@example.com';
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<ProfileScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));
    expect(openURL).toHaveBeenCalledTimes(1);
    const url = openURL.mock.calls[0][0];
    expect(url.startsWith('mailto:beta@example.com?subject=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Three Little Circles feedback');
    openURL.mockRestore();
  });
});
