// Challenge badges with a stand-in challenge list, since the shipped content
// may not have any yet.
jest.mock('../src/data/challenges.generated', () => ({
  challenges: [
    {
      id: 'jungle-run',
      title: 'Jungle Run',
      blurb: 'Every hidden detail on the Jungle Cruise.',
      parkId: 'magic_kingdom_park',
      icon: 'boat',
      goal: 'all',
      targets: [{ attraction: 'magic_kingdom_park/jungle_outpost_area/jungle_boat_ride' }],
    },
  ],
}));

import {
  challengeAchievementId,
  computeProgress,
  computeUnlocked,
  getAchievement,
  getAchievements,
} from '../src/data/achievements';
import { getAllEntries } from '../src/data/query';

const jungle = getAllEntries().filter(
  (e) => `${e.parkId}/${e.landId}/${e.attractionId}` === 'magic_kingdom_park/jungle_outpost_area/jungle_boat_ride'
);
const asFound = (list: typeof jungle) => Object.fromEntries(list.map((e) => [e.id, 1]));
const id = challengeAchievementId('jungle-run');

describe('challenge badges', () => {
  it('adds one badge per challenge after the park badges, in the challenge park color', () => {
    const all = getAchievements();
    expect(all[all.length - 1]).toMatchObject({
      id,
      kind: 'challenge',
      title: 'Jungle Run',
      hint: 'Every hidden detail on the Jungle Cruise.',
      icon: 'boat',
      challengeId: 'jungle-run',
      parkId: 'magic_kingdom_park',
      parkKey: 'kingdom',
    });
    expect(getAchievement(id)?.title).toBe('Jungle Run');
  });

  it('reports progress and unlocks when the challenge is complete', () => {
    const almost = asFound(jungle.slice(1));
    expect(computeProgress(almost)[id]).toMatchObject({ current: jungle.length - 1, goal: jungle.length, remaining: 1 });
    expect(computeUnlocked(almost)).not.toContain(id);
    expect(computeUnlocked(asFound(jungle))).toContain(id);
  });
});
