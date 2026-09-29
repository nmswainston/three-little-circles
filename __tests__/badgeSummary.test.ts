import { summaryState } from '../src/components/BadgeSummaryCard';
import { AchievementProgress, getAchievements } from '../src/store/useAchievementsStore';

const achievements = getAchievements();
const [a, b, c] = achievements;
const at = (current: number, goal: number): AchievementProgress => ({
  current,
  goal,
  fraction: current / goal,
  remaining: goal - current,
});
const progress = Object.fromEntries(achievements.map((x) => [x.id, at(0, 5)]));

describe('summaryState', () => {
  it('starts a guest with no finds and no badges', () => {
    expect(summaryState(achievements, 0, [], [], {}, progress)).toEqual({ kind: 'start' });
  });

  it('picks the newest unseen badge', () => {
    const state = summaryState(achievements, 3, [a.id, b.id, c.id], [c.id], { [a.id]: 1, [b.id]: 2, [c.id]: 3 }, progress);
    expect(state).toEqual({ kind: 'earned', achievement: b, unseenCount: 2 });
  });

  it('falls back to the badge closest to earning', () => {
    const state = summaryState(achievements, 3, [a.id], [a.id], { [a.id]: 1 }, { ...progress, [c.id]: at(4, 5) });
    expect(state).toMatchObject({ kind: 'next', achievement: c });
  });

  it('says so when every badge is earned and seen', () => {
    const ids = achievements.map((x) => x.id);
    expect(summaryState(achievements, 9, ids, ids, {}, progress)).toEqual({ kind: 'complete' });
  });
});
