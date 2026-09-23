import { getAllFacts, getFactsForPark } from '../src/data/facts';
import { DESTINATIONS, REGIONS } from '../src/data/destinations';

describe('park facts', () => {
  const facts = getAllFacts();
  const parkIds = new Set(DESTINATIONS.map((d) => d.parkId));

  it('has at least one fact', () => {
    expect(facts.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = facts.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('targets exactly one known park or region', () => {
    for (const fact of facts) {
      const hasPark = fact.parkId !== undefined;
      const hasRegion = fact.region !== undefined;
      expect(hasPark !== hasRegion).toBe(true);
      if (hasPark) expect(parkIds.has(fact.parkId!)).toBe(true);
      if (hasRegion) expect(REGIONS).toContain(fact.region);
    }
  });

  it('lists park-specific facts before region-wide ones', () => {
    for (const destination of DESTINATIONS) {
      const result = getFactsForPark(destination.parkId);
      const firstRegionIndex = result.findIndex((f) => f.region !== undefined);
      const lastParkIndex = result.map((f) => f.parkId !== undefined).lastIndexOf(true);
      if (firstRegionIndex !== -1 && lastParkIndex !== -1) {
        expect(lastParkIndex).toBeLessThan(firstRegionIndex);
      }
      for (const fact of result) {
        if (fact.parkId !== undefined) expect(fact.parkId).toBe(destination.parkId);
        else expect(fact.region).toBe(destination.region);
      }
    }
  });

  it('every fact shows on at least one park screen', () => {
    const shown = new Set<string>();
    for (const destination of DESTINATIONS) {
      for (const fact of getFactsForPark(destination.parkId)) shown.add(fact.id);
    }
    expect(shown.size).toBe(facts.length);
  });

  it('returns nothing for an unknown park', () => {
    expect(getFactsForPark('does-not-exist')).toEqual([]);
  });
});
