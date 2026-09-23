import { getAllFacts, getFactCountsByPark, getFactsForPark } from '../src/data/facts';
import { DESTINATIONS, REGIONS, isThemePark } from '../src/data/destinations';

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

  it('shows region-wide facts on theme parks only', () => {
    const florida = DESTINATIONS.filter((d) => d.region === 'Florida');
    const parks = florida.filter((d) => isThemePark(d.parkId));
    const buckets = florida.filter((d) => !isThemePark(d.parkId));
    expect(parks.length).toBe(4);
    expect(buckets.length).toBe(2);

    for (const park of parks) {
      expect(getFactsForPark(park.parkId).some((f) => f.region === 'Florida')).toBe(true);
    }
    for (const bucket of buckets) {
      const result = getFactsForPark(bucket.parkId);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((f) => f.parkId === bucket.parkId)).toBe(true);
    }
  });

  it('every fact shows on at least one park screen', () => {
    const shown = new Set<string>();
    for (const destination of DESTINATIONS) {
      for (const fact of getFactsForPark(destination.parkId)) shown.add(fact.id);
    }
    expect(shown.size).toBe(facts.length);
  });

  it('counts facts for every listed destination', () => {
    const counts = getFactCountsByPark();
    expect(counts.size).toBe(DESTINATIONS.length);
    for (const destination of DESTINATIONS) {
      expect(counts.get(destination.parkId)).toBe(getFactsForPark(destination.parkId).length);
    }
    // Overseas parks have no finds yet but do carry region history, which is
    // what lets their cards open on the Parks screen.
    expect(counts.get('paris_kingdom_park')).toBeGreaterThan(0);
  });

  it('returns nothing for an unknown park', () => {
    expect(getFactsForPark('does-not-exist')).toEqual([]);
  });
});
