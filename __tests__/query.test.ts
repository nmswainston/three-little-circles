import {
  getAllEntries,
  getEntryById,
  getParksSummary,
  getLandsByPark,
  getAttractionsByLand,
  getEntriesByAttraction,
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
