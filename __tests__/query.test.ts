import {
  getAllEntries,
  getEntryById,
  getParksSummary,
  getLandsByPark,
  getAttractionsByLand,
  getEntriesByAttraction,
  getRelatedEntries,
  groupByLand,
  matchesEntryType,
} from '../src/data/query';

describe('bundled content', () => {
  const entries = getAllEntries();

  it('has at least one entry', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('can look up every entry by id', () => {
    for (const e of entries) {
      expect(getEntryById(e.id)).toBe(e);
    }
    expect(getEntryById('does-not-exist')).toBeUndefined();
  });

  it('park, land, and attraction counts add up to the total', () => {
    const parks = getParksSummary();
    expect(parks.reduce((n, p) => n + p.count, 0)).toBe(entries.length);

    for (const park of parks) {
      const lands = getLandsByPark(park.parkId);
      expect(lands.reduce((n, l) => n + l.count, 0)).toBe(park.count);

      for (const land of lands) {
        const attractions = getAttractionsByLand(park.parkId, land.landId);
        expect(attractions.reduce((n, a) => n + a.count, 0)).toBe(land.count);

        for (const attraction of attractions) {
          const list = getEntriesByAttraction(park.parkId, land.landId, attraction.attractionId);
          expect(list).toHaveLength(attraction.count);
        }
      }
    }
  });

  it('entry-type filters partition the entries', () => {
    const finds = getParksSummary('FIND').reduce((n, p) => n + p.count, 0);
    const facts = getParksSummary('FACT').reduce((n, p) => n + p.count, 0);
    expect(finds + facts).toBe(entries.length);
  });
});

describe('matchesEntryType', () => {
  const entries = getAllEntries();

  it('lets everything through with no filter or All', () => {
    for (const e of entries) {
      expect(matchesEntryType(e)).toBe(true);
      expect(matchesEntryType(e, 'All')).toBe(true);
    }
  });

  it('keeps only the chosen type otherwise', () => {
    for (const e of entries) {
      expect(matchesEntryType(e, 'FIND')).toBe(e.entryType === 'FIND');
      expect(matchesEntryType(e, 'FACT')).toBe(e.entryType === 'FACT');
    }
  });
});

describe('groupByLand', () => {
  const entries = getAllEntries();

  it('matches the per-level helpers for a whole park', () => {
    for (const park of getParksSummary()) {
      const grouped = groupByLand(entries.filter((e) => e.parkId === park.parkId));
      expect(grouped.map((l) => l.landId)).toEqual(getLandsByPark(park.parkId).map((l) => l.landId));

      for (const land of grouped) {
        expect(land.count).toBe(land.attractions.reduce((n, a) => n + a.count, 0));
        expect(land.attractions.map((a) => a.attractionId)).toEqual(
          getAttractionsByLand(park.parkId, land.landId).map((a) => a.attractionId)
        );
        for (const attraction of land.attractions) {
          expect(attraction.entries).toHaveLength(attraction.count);
          expect(attraction.entries).toEqual(
            getEntriesByAttraction(park.parkId, land.landId, attraction.attractionId)
          );
        }
      }
    }
  });

  it('keeps content order and returns nothing for an empty list', () => {
    const park = entries[0].parkId;
    const list = entries.filter((e) => e.parkId === park);
    const flat = groupByLand(list).flatMap((l) => l.attractions.flatMap((a) => a.entries));
    expect(flat).toEqual(list);
    expect(groupByLand([])).toEqual([]);
  });

  it('drops an attraction, and its land, once nothing in it remains', () => {
    // Hunting mode filters found entries out before grouping, so a fully
    // found attraction should vanish rather than show as an empty card.
    const target = entries[0];
    const park = entries.filter((e) => e.parkId === target.parkId);
    const sameAttraction = (e: (typeof entries)[number]) =>
      e.landId === target.landId && e.attractionId === target.attractionId;

    const remaining = park.filter((e) => !sameAttraction(e));
    const grouped = groupByLand(remaining);
    const attractionIds = grouped.flatMap((l) => l.attractions.map((a) => `${l.landId}/${a.attractionId}`));
    expect(attractionIds).not.toContain(`${target.landId}/${target.attractionId}`);

    const landStillHasEntries = remaining.some((e) => e.landId === target.landId);
    expect(grouped.some((l) => l.landId === target.landId)).toBe(landStillHasEntries);
  });
});

describe('getRelatedEntries', () => {
  const entries = getAllEntries();

  it('returns the other entries at the same attraction, never the entry itself', () => {
    for (const entry of entries) {
      const related = getRelatedEntries(entry);
      expect(related).not.toContain(entry);
      for (const other of related) {
        expect(other.parkId).toBe(entry.parkId);
        expect(other.landId).toBe(entry.landId);
        expect(other.attractionId).toBe(entry.attractionId);
      }
      const atAttraction = getEntriesByAttraction(entry.parkId, entry.landId, entry.attractionId);
      expect(related).toHaveLength(atAttraction.length - 1);
    }
  });

  it('has at least one attraction with related entries in the shipped content', () => {
    expect(entries.some((e) => getRelatedEntries(e).length > 0)).toBe(true);
  });
});
