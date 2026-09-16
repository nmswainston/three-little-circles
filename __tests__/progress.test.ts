import { groupProgress, summarize, percent, isComplete } from '../src/utils/progress';
import { HiddenMickeyEntry } from '../src/data/types';

function entry(id: string, parkId: string, landId: string): HiddenMickeyEntry {
  return {
    id,
    parkId,
    landId,
    attractionId: 'a',
    entryType: 'FIND',
    locationType: 'Queue',
    difficulty: 'Easy',
    description: 'x',
    whereToLook: { scene: 's', exactSpot: 'e' },
  };
}

const sample = [
  entry('one', 'p1', 'l1'),
  entry('two', 'p1', 'l1'),
  entry('three', 'p1', 'l2'),
  entry('four', 'p2', 'l1'),
];

describe('summarize', () => {
  it('counts total and found', () => {
    const found = new Set(['one', 'four']);
    expect(summarize(sample, (id) => found.has(id))).toEqual({ total: 4, found: 2 });
  });

  it('handles an empty list', () => {
    expect(summarize([], () => true)).toEqual({ total: 0, found: 0 });
    expect(percent({ total: 0, found: 0 })).toBe(0);
    expect(isComplete({ total: 0, found: 0 })).toBe(false);
  });
});

describe('groupProgress', () => {
  it('groups by key and computes percentages', () => {
    const found = new Set(['one', 'two']);
    const groups = groupProgress(sample, (id) => found.has(id), (e) => ({
      key: `${e.parkId}/${e.landId}`,
      name: e.landId,
    }));

    expect(groups).toEqual([
      { key: 'p1/l1', name: 'l1', total: 2, found: 2, pct: 100 },
      { key: 'p1/l2', name: 'l2', total: 1, found: 0, pct: 0 },
      { key: 'p2/l1', name: 'l1', total: 1, found: 0, pct: 0 },
    ]);
    expect(groups.filter(isComplete).map((g) => g.key)).toEqual(['p1/l1']);
  });

  it('keeps lands with the same id in different parks separate', () => {
    const groups = groupProgress(sample, () => false, (e) => ({
      key: `${e.parkId}/${e.landId}`,
      name: e.landId,
    }));
    expect(groups.filter((g) => g.name === 'l1')).toHaveLength(2);
  });

  it('skips entries when getKey returns undefined', () => {
    const groups = groupProgress(sample, () => false, (e) =>
      e.parkId === 'p1' ? { key: e.parkId, name: e.parkId } : undefined
    );
    expect(groups).toEqual([{ key: 'p1', name: 'p1', total: 3, found: 0, pct: 0 }]);
  });
});
