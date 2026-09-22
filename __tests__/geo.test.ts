import {
  distanceMeters,
  distanceLabel,
  nearest,
  sortByDistance,
  unitsForRegion,
  WALK_METERS_PER_MINUTE,
  WALKING_RANGE_METERS,
} from '../src/lib/geo';
import { getAllEntries } from '../src/data/query';
import { Coordinates } from '../src/data/types';

type Spot = { id: string; coordinates?: Coordinates };

// One degree of latitude at the equator, for the earth radius the helper uses.
const ONE_DEGREE_METERS = 111195;

describe('distanceMeters', () => {
  it('is zero for the same point and symmetric', () => {
    const a = { latitude: 28.4181, longitude: -81.5843 };
    const b = { latitude: 28.3563, longitude: -81.5628 };
    expect(distanceMeters(a, a)).toBe(0);
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });

  it('matches a known distance along a meridian and along the equator', () => {
    const origin = { latitude: 0, longitude: 0 };
    expect(distanceMeters(origin, { latitude: 1, longitude: 0 })).toBeCloseTo(ONE_DEGREE_METERS, -1);
    expect(distanceMeters(origin, { latitude: 0, longitude: 1 })).toBeCloseTo(ONE_DEGREE_METERS, -1);
  });

  it('puts two Florida entries a few kilometers apart, not a few meters', () => {
    const kingdom = { latitude: 28.4181, longitude: -81.5843 };
    const studios = { latitude: 28.3563, longitude: -81.5628 };
    const meters = distanceMeters(kingdom, studios);
    expect(meters).toBeGreaterThan(6000);
    expect(meters).toBeLessThan(8000);
  });
});

describe('distanceLabel', () => {
  it('says right here for a few steps away', () => {
    expect(distanceLabel(0)).toBe('Right here');
    expect(distanceLabel(39)).toBe('Right here');
  });

  it('gives walking minutes inside walking range, never less than one', () => {
    expect(distanceLabel(40)).toBe('1 min walk');
    expect(distanceLabel(WALK_METERS_PER_MINUTE * 5)).toBe('5 min walk');
    expect(distanceLabel(WALKING_RANGE_METERS)).toBe(`${Math.round(WALKING_RANGE_METERS / WALK_METERS_PER_MINUTE)} min walk`);
  });

  it('switches to a rounded distance beyond walking range, in the units asked for', () => {
    expect(distanceLabel(WALKING_RANGE_METERS + 1, 'mi')).toBe('1.6 mi away');
    expect(distanceLabel(5000, 'km')).toBe('5.0 km away');
    expect(distanceLabel(25_000, 'km')).toBe('25 km away');
    expect(distanceLabel(25_000, 'mi')).toBe('16 mi away');
  });

  it('gives up on precision once it stops mattering', () => {
    expect(distanceLabel(3_000_000, 'km')).toBe('Far away');
    expect(distanceLabel(3_000_000, 'mi')).toBe('Far away');
  });

  it('defaults to miles', () => {
    expect(distanceLabel(5000)).toBe(distanceLabel(5000, 'mi'));
  });
});

describe('unitsForRegion', () => {
  it('uses miles for US destinations and kilometers elsewhere', () => {
    expect(unitsForRegion('Florida')).toBe('mi');
    expect(unitsForRegion('California')).toBe('mi');
    expect(unitsForRegion('Paris')).toBe('km');
    expect(unitsForRegion('Tokyo')).toBe('km');
    expect(unitsForRegion(undefined)).toBe('km');
  });
});

describe('sortByDistance and nearest', () => {
  const origin = { latitude: 28.4181, longitude: -81.5843 };
  const items: Spot[] = [
    { id: 'far', coordinates: { latitude: 28.5, longitude: -81.5 } },
    { id: 'none' },
    { id: 'near', coordinates: { latitude: 28.4185, longitude: -81.584 } },
    { id: 'mid', coordinates: { latitude: 28.43, longitude: -81.58 } },
  ];

  it('orders closest first and leaves out items without coordinates', () => {
    const sorted = sortByDistance(items, origin);
    expect(sorted.map((s) => s.item.id)).toEqual(['near', 'mid', 'far']);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].meters).toBeGreaterThanOrEqual(sorted[i - 1].meters);
    }
  });

  it('nearest agrees with the head of the sorted list', () => {
    expect(nearest(items, origin)?.item.id).toBe('near');
    const unpinned: Spot[] = [{ id: 'none' }];
    expect(nearest(unpinned, origin)).toBeUndefined();
    expect(sortByDistance(unpinned, origin)).toEqual([]);
  });

  it('handles the shipped content', () => {
    const entries = getAllEntries();
    const sorted = sortByDistance(entries, origin);
    expect(sorted).toHaveLength(entries.filter((e) => e.coordinates).length);
    expect(nearest(entries, origin)?.item).toBe(sorted[0].item);
  });
});
