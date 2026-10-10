import { isConfirmed } from '../src/data/confirmations';
import { confirmedFirst, getAllEntries, getEntryById, getParksSummary, getLandsByPark, getAttractionsByLand, getEntriesByAttraction, getRelatedEntries, groupByLand, matchesEntryType, walkOrder, orderLands, orderAttractions } from '../src/data/query';
import { DESTINATIONS, getDestination, getLandRank } from '../src/data/destinations';
import type { HiddenMickeyEntry } from '../src/data/types';

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

  it('keeps every entry once, in walk order within each attraction, and returns nothing for an empty list', () => {
    const park = entries[0].parkId;
    const list = entries.filter((e) => e.parkId === park);
    const grouped = groupByLand(list);
    const flat = grouped.flatMap((l) => l.attractions.flatMap((a) => a.entries));
    // Grouping clusters an attraction's entries together, so the flattened
    // order differs from file order once attractions interleave. Membership
    // and per-attraction order are what matter.
    expect(flat.map((e) => e.id).sort()).toEqual(list.map((e) => e.id).sort());
    for (const land of grouped) {
      for (const attraction of land.attractions) {
        expect(attraction.entries).toEqual(
          walkOrder(list.filter((e) => e.landId === land.landId && e.attractionId === attraction.attractionId))
        );
      }
    }
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

describe('walkOrder', () => {
  const base = getAllEntries()[0];
  const make = (id: string, patch: Partial<HiddenMickeyEntry>): HiddenMickeyEntry => ({ ...base, id, ...patch });

  it('walks entrance, queue, ride, exit, shop, whatever order the content came in', () => {
    const list = [
      make('shop', { areaContext: 'Shop', locationType: 'Indoor' }),
      make('exit', { areaContext: 'Exit', locationType: 'Indoor' }),
      make('ride', { areaContext: 'Ride', locationType: 'Ride' }),
      make('queue', { areaContext: 'Queue', locationType: 'Queue' }),
      make('entrance', { areaContext: 'Entrance', locationType: 'Outdoor' }),
    ];
    expect(walkOrder(list).map((e) => e.id)).toEqual(['entrance', 'queue', 'ride', 'exit', 'shop']);
  });

  it('puts the lobby before the queue, and slots an entry with no area context by its location type', () => {
    const list = [
      make('ride', { areaContext: 'Ride', locationType: 'Ride' }),
      make('boiler', { areaContext: 'Queue', locationType: 'Queue' }),
      make('library', { areaContext: undefined, locationType: 'Pre-show' }),
      make('balcony', { areaContext: 'Lobby', locationType: 'Queue' }),
      make('outside', { areaContext: undefined, locationType: 'Outdoor' }),
    ];
    // The lobby is the first room of the wait, and a pre-show with no area
    // named belongs there too, ahead of the deeper queue rooms.
    expect(walkOrder(list).map((e) => e.id)).toEqual(['outside', 'balcony', 'library', 'boiler', 'ride']);
  });

  it('puts confirmed finds first within a spot and keeps content order for the rest', () => {
    const list = [
      make('b', { areaContext: 'Ride', locationType: 'Ride', status: 'Unverified' }),
      make('a', { areaContext: 'Ride', locationType: 'Ride', status: 'Unverified' }),
      make('c', { areaContext: 'Ride', locationType: 'Ride', status: 'Current' }),
    ];
    expect(walkOrder(list).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(walkOrder([])).toEqual([]);
  });
});

describe('confirmedFirst', () => {
  const entries = getAllEntries();

  it('puts confirmed finds first and keeps content order within each half', () => {
    const sorted = confirmedFirst(entries);
    expect(sorted).toHaveLength(entries.length);
    const confirmed = entries.filter((e) => isConfirmed(e));
    const rest = entries.filter((e) => !isConfirmed(e));
    expect(sorted).toEqual([...confirmed, ...rest]);
  });

  it('has both confirmed and unconfirmed finds in the shipped content', () => {
    expect(entries.some((e) => isConfirmed(e))).toBe(true);
    expect(entries.some((e) => !isConfirmed(e))).toBe(true);
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

describe('land and attraction order', () => {
  const entries = getAllEntries();
  const alphabetical = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b));

  it('lists a park with a landOrder in that order, with every land of the park covered', () => {
    const ordered = DESTINATIONS.filter((d) => d.landOrder !== undefined);
    expect(ordered.length).toBeGreaterThan(0);
    for (const destination of ordered) {
      const lands = getLandsByPark(destination.parkId);
      if (lands.length === 0) continue;
      const ids = lands.map((l) => l.landId);
      // Every land that has entries is in the order, so none fall back to alphabetical.
      for (const id of ids) expect(destination.landOrder).toContain(id);
      expect(ids).toEqual(destination.landOrder!.filter((id) => ids.includes(id)));
      // The gate comes first.
      expect(ids[0]).toBe(destination.landOrder![0]);
    }
  });

  it('lists a park without a landOrder alphabetically', () => {
    const plain = DESTINATIONS.filter((d) => d.landOrder === undefined && getLandsByPark(d.parkId).length > 1);
    expect(plain.length).toBeGreaterThan(0);
    for (const destination of plain) {
      const names = getLandsByPark(destination.parkId).map((l) => l.landName);
      expect(names).toEqual(alphabetical(names));
    }
  });

  it('puts Main Street first at the castle parks', () => {
    expect(getLandsByPark('magic_kingdom_park')[0].landName).toBe('Main Street, U.S.A.');
    const disneyland = getLandsByPark('california_kingdom_park').map((l) => l.landName);
    expect(disneyland.slice(0, 2)).toEqual(['Park Entrance', 'Main Street, U.S.A.']);
  });

  it('lists attractions within a land alphabetically', () => {
    for (const park of getParksSummary()) {
      for (const land of getLandsByPark(park.parkId)) {
        const names = getAttractionsByLand(park.parkId, land.landId).map((a) => a.attractionName);
        expect(names).toEqual(alphabetical(names));
      }
    }
  });

  it('ranks unlisted lands after listed ones and sorts them by name', () => {
    expect(getLandRank('magic_kingdom_park', 'main_street_area')).toBe(0);
    expect(getLandRank('magic_kingdom_park', 'not_a_land')).toBe(Infinity);
    expect(getLandRank('resorts_bucket', 'riviera_resort')).toBe(Infinity);
    const lands = [
      { landId: 'zzz_area', landName: 'Zebra Crossing', count: 1 },
      { landId: 'future_city_area', landName: 'Tomorrowland', count: 1 },
      { landId: 'aaa_area', landName: 'Apple Orchard', count: 1 },
      { landId: 'main_street_area', landName: 'Main Street, U.S.A.', count: 1 },
    ];
    expect(orderLands('magic_kingdom_park', lands).map((l) => l.landId)).toEqual([
      'main_street_area',
      'future_city_area',
      'aaa_area',
      'zzz_area',
    ]);
    expect(orderAttractions([{ attractionName: 'Space Mountain' }, { attractionName: 'Astro Orbiter' }]).map((a) => a.attractionName)).toEqual([
      'Astro Orbiter',
      'Space Mountain',
    ]);
  });

  it('keeps parks in Parks-screen order when a list spans parks', () => {
    // Magic Kingdom is listed before Disneyland Park in destinations.json, and
    // the two share land ids such as main_street_area, so the grouped list
    // must be one park's lands in walk order followed by the other's.
    const mixed = entries.filter((e) => e.parkId === 'california_kingdom_park' || e.parkId === 'magic_kingdom_park');
    const grouped = groupByLand(mixed).map((l) => `${l.landName}/${l.landId}`);
    const expected = [
      ...getLandsByPark('magic_kingdom_park').map((l) => `${l.landName}/${l.landId}`),
      ...getLandsByPark('california_kingdom_park').map((l) => `${l.landName}/${l.landId}`),
    ];
    expect(grouped).toEqual(expected);
  });
});
