import { relativeTime } from '../src/lib/time';

const NOW = Date.parse('2026-09-22T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('relativeTime', () => {
  it('never says more than a day of precision', () => {
    expect(relativeTime(NOW, NOW)).toBe('today');
    expect(relativeTime(NOW - 5 * 60 * 1000, NOW)).toBe('today');
    expect(relativeTime(NOW - 23 * 60 * 60 * 1000, NOW)).toBe('today');
  });

  it('counts days, then weeks, then months', () => {
    expect(relativeTime(NOW - DAY, NOW)).toBe('yesterday');
    expect(relativeTime(NOW - 3 * DAY, NOW)).toBe('3 days ago');
    expect(relativeTime(NOW - 7 * DAY, NOW)).toBe('a week ago');
    expect(relativeTime(NOW - 20 * DAY, NOW)).toBe('2 weeks ago');
    expect(relativeTime(NOW - 35 * DAY, NOW)).toBe('a month ago');
    expect(relativeTime(NOW - 100 * DAY, NOW)).toBe('3 months ago');
    expect(relativeTime(NOW - 400 * DAY, NOW)).toBe('over a year ago');
  });

  it('accepts ISO strings and Dates, and treats the future as now', () => {
    expect(relativeTime(new Date(NOW - 2 * DAY).toISOString(), NOW)).toBe('2 days ago');
    expect(relativeTime(new Date(NOW - 2 * DAY), NOW)).toBe('2 days ago');
    expect(relativeTime(NOW + DAY, NOW)).toBe('today');
    expect(relativeTime('not a date', NOW)).toBe('at some point');
  });
});
