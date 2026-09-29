import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import BadgesScreen from '../src/screens/BadgesScreen';
import { computeUnlocked, getAchievements, useAchievementsStore } from '../src/store/useAchievementsStore';
import { useFoundStore } from '../src/store/useFoundStore';
import { getAllEntries } from '../src/data/query';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

const entries = getAllEntries();
const NOW = Date.parse('2026-09-27T12:00:00Z');

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
});

/** Twelve finds, with First Find earned before Explorer. */
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
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
});

describe('BadgesScreen', () => {
  it('invites a first find when nothing is earned yet', () => {
    render(<BadgesScreen />);
    expect(screen.getByText('Mark your first find and your first badge is yours.')).toBeTruthy();
    expect(screen.getByText(`0 of ${getAchievements().length} earned`)).toBeTruthy();
  });

  it('lists earned badges newest first', () => {
    seedTwelveFinds();
    render(<BadgesScreen />);
    const all = labels();
    const explorer = all.findIndex((l) => l.startsWith('Explorer, earned'));
    const firstFind = all.findIndex((l) => l.startsWith('First Find, earned'));
    expect(explorer).toBeGreaterThanOrEqual(0);
    expect(explorer).toBeLessThan(firstFind);
  });

  it('shows a progress row for every unearned badge, six of them under Closest to earning', () => {
    const unlocked = seedTwelveFinds();
    render(<BadgesScreen />);
    expect(screen.getByText('Closest to earning')).toBeTruthy();
    const rows = labels().filter((l) => l.includes(' to go'));
    expect(rows).toHaveLength(getAchievements().length - unlocked.length);
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
});
