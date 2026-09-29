import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import BadgesScreen from '../src/screens/BadgesScreen';
import { computeUnlocked, useAchievementsStore, visibleBadges } from '../src/store/useAchievementsStore';
import { useFoundStore } from '../src/store/useFoundStore';
import { getAllEntries } from '../src/data/query';
import { getChallenge, getChallenges } from '../src/data/challenges';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockParams: { tab?: 'badges' | 'challenges' } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: mockParams }),
}));

const entries = getAllEntries();
const NOW = Date.parse('2026-09-27T12:00:00Z');

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
});

/** Twelve finds: Hunter Silver (Explorer's old id) is the newest badge, everything else earlier. */
function seedTwelveFinds() {
  const found = Object.fromEntries(entries.slice(0, 12).map((e) => [e.id, NOW]));
  const unlocked = computeUnlocked(found);
  const earnedAt = Object.fromEntries(unlocked.map((id) => [id, NOW - 5000]));
  earnedAt.FIRST_FIND = NOW - 9000;
  earnedAt.TEN_FINDS = NOW;
  useFoundStore.setState({ found });
  useAchievementsStore.setState({ unlocked, earnedAt, seen: unlocked, pending: [] });
  return unlocked;
}

const labels = () => screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string);

beforeEach(() => {
  mockGoBack.mockClear();
  mockNavigate.mockClear();
  mockParams = undefined;
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
});

describe('BadgesScreen', () => {
  it('invites a first find when nothing is earned yet', () => {
    render(<BadgesScreen />);
    expect(screen.getByText('Mark your first find and your first badge is yours.')).toBeTruthy();
    const { unearned } = visibleBadges([]);
    expect(screen.getByText(`0 of ${unearned.length} earned`)).toBeTruthy();
  });

  it('lists earned badges newest first, with Hunter once at its highest level', () => {
    seedTwelveFinds();
    render(<BadgesScreen />);
    const earned = labels().filter((l) => / earned( |,|$)/.test(l) && !l.includes(' of '));
    expect(earned[0]).toMatch(/^Hunter: Silver, earned/);
    expect(earned.some((l) => l.startsWith('Hunter: Bronze'))).toBe(false);
  });

  it('shows the Hunter levels as one bar toward the next level', () => {
    seedTwelveFinds();
    render(<BadgesScreen />);
    expect(screen.getByLabelText('Hunter: Silver to Gold, 12 of 25')).toBeTruthy();
    expect(screen.getByText('Platinum')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('shows a progress row for every unearned badge, six of them under Closest to earning', () => {
    const unlocked = seedTwelveFinds();
    render(<BadgesScreen />);
    expect(screen.getByText('Closest to earning')).toBeTruthy();
    const rows = labels().filter((l) => l.includes(' to go'));
    // Hunter is earned, so its next level is not repeated as a row.
    expect(rows).toHaveLength(visibleBadges(unlocked).unearned.length);
    expect(rows.some((l) => l.startsWith('Hunter'))).toBe(false);
    // Full rows add a detail line after "n to go"; compact "More to earn" rows end there.
    const full = rows.filter((l) => !l.endsWith(' to go'));
    expect(full).toHaveLength(6);
  });

  it('opens a locked badge with its progress', () => {
    seedTwelveFinds();
    render(<BadgesScreen />);
    const firstRow = screen.getAllByRole('button').find((b) => String(b.props.accessibilityLabel).includes(' to go'))!;
    fireEvent.press(firstRow);
    expect(screen.getByText('Locked')).toBeTruthy();
  });

  it('goes back', () => {
    render(<BadgesScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens a challenge badge on its challenge instead of the sheet', () => {
    seedTwelveFinds();
    render(<BadgesScreen />);
    const row = screen
      .getAllByRole('button')
      .find((b) => String(b.props.accessibilityLabel).startsWith("Walt's Originals,"))!;
    fireEvent.press(row);
    expect(mockNavigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: 'walts-originals' });
    expect(screen.queryByText('Locked')).toBeNull();
  });
});

describe('BadgesScreen challenges tab', () => {
  it('lists every challenge and opens one', () => {
    render(<BadgesScreen />);
    fireEvent.press(screen.getByRole('tab', { name: 'Challenges' }));
    for (const challenge of getChallenges()) {
      expect(screen.getByText(challenge.title)).toBeTruthy();
    }
    expect(screen.getByText('Not started')).toBeTruthy();

    fireEvent.press(screen.getByText(getChallenges()[0].title));
    expect(mockNavigate).toHaveBeenCalledWith('ChallengeDetail', { challengeId: getChallenges()[0].id });
  });

  it('opens straight onto the tab the route asks for, with started challenges under In progress', () => {
    mockParams = { tab: 'challenges' };
    const walts = getChallenge('walts-originals')!;
    const jungle = entries.filter((e) => e.attractionId === 'jungle_boat_ride');
    useFoundStore.setState({ found: Object.fromEntries(jungle.map((e) => [e.id, NOW])) });
    render(<BadgesScreen />);
    expect(screen.getByText('In progress')).toBeTruthy();
    expect(screen.getByText(walts.title)).toBeTruthy();
  });
});
