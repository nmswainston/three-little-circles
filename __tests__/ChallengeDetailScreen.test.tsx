import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ChallengeDetailScreen from '../src/screens/ChallengeDetailScreen';
import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { challengeGroups, getChallenge } from '../src/data/challenges';
import { challengeAchievementId } from '../src/data/achievements';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockChallengeId = 'walts-originals';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { challengeId: mockChallengeId } }),
}));

const walts = getChallenge('walts-originals')!;
const groups = challengeGroups(walts);
const jungle = groups.find((g) => g.name === 'Jungle Cruise')!;

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockChallengeId = 'walts-originals';
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
});

describe('ChallengeDetailScreen', () => {
  it('shows the challenge, its goal, and every place grouped by land', () => {
    render(<ChallengeDetailScreen />);
    expect(screen.getByText(walts.title)).toBeTruthy();
    expect(screen.getByText(walts.blurb)).toBeTruthy();
    expect(screen.getByText('Find every hidden detail below.')).toBeTruthy();
    expect(screen.getByText(`Earns the ${walts.title} badge`)).toBeTruthy();
    for (const group of groups) expect(screen.getByText(group.name)).toBeTruthy();
    expect(screen.getByText('Adventureland')).toBeTruthy();
  });

  it('counts finds per place and points at the next one', () => {
    useFoundStore.setState({ found: Object.fromEntries(jungle.entries.slice(1).map((e) => [e.id, 1])) });
    render(<ChallengeDetailScreen />);
    const row = screen.getByRole('button', { name: `Jungle Cruise, ${jungle.entries.length - 1} of ${jungle.entries.length} found` });
    expect(row).toBeTruthy();
    expect(screen.getByText('Next: Jungle Cruise')).toBeTruthy();
  });

  it('opens a place to list its finds, and a find opens its detail', () => {
    render(<ChallengeDetailScreen />);
    fireEvent.press(screen.getByRole('button', { name: `Jungle Cruise, 0 of ${jungle.entries.length} found` }));
    const first = jungle.entries[0];
    fireEvent.press(screen.getByText(first.display!.entryTitle!));
    expect(mockNavigate).toHaveBeenCalledWith('EntryDetail', { entryId: first.id });
  });

  it('says Complete once the badge is earned', () => {
    const id = challengeAchievementId(walts.id);
    useAchievementsStore.setState({ unlocked: [id], earnedAt: { [id]: Date.parse('2026-09-27T12:00:00Z') }, seen: [id] });
    render(<ChallengeDetailScreen />);
    expect(screen.getByText('Complete')).toBeTruthy();
    expect(screen.getByText(/^Badge earned /)).toBeTruthy();
  });

  it('copes with a challenge that no longer exists', () => {
    mockChallengeId = 'retired-challenge';
    render(<ChallengeDetailScreen />);
    expect(screen.getByText('Challenge not found')).toBeTruthy();
  });
});
