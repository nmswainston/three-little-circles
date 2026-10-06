import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BadgeSummaryCard from '../src/components/BadgeSummaryCard';
import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore } from '../src/store/useAchievementsStore';

const FIRST_HINT = 'Pick a park below, mark a find, and your first badge is yours.';

beforeAll(async () => {
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
});

beforeEach(() => {
  useFoundStore.setState({ found: {} });
});

describe('BadgeSummaryCard', () => {
  it('gives the first-badge hint three lines, since it overruns two on a narrow phone or with large text', () => {
    render(<BadgeSummaryCard onOpen={jest.fn()} />);
    expect(screen.getByText(FIRST_HINT).props.numberOfLines).toBe(3);
  });
});
