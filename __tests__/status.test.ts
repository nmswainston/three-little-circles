import { countsTowardProgress, listStatusLabel, STATUS_LABEL } from '../src/data/status';
import { getAllEntries, getProgressEntries } from '../src/data/query';
import { getDestinationSummaries } from '../src/data/destinations';
import { RESORTS_BUCKET_ID } from '../src/data/constants';

describe('countsTowardProgress', () => {
  it('counts anything a guest can still find', () => {
    expect(countsTowardProgress({})).toBe(true);
    for (const status of ['Current', 'Unverified', 'Seasonal', 'Variable'] as const) {
      expect(countsTowardProgress({ status })).toBe(true);
    }
  });

  it('leaves out leads and removed finds', () => {
    expect(countsTowardProgress({ status: 'Lead' })).toBe(false);
    expect(countsTowardProgress({ status: 'Removed' })).toBe(false);
  });
});

describe('listStatusLabel', () => {
  it('flags only the statuses that do not count', () => {
    expect(listStatusLabel({})).toBeNull();
    expect(listStatusLabel({ status: 'Unverified' })).toBeNull();
    expect(listStatusLabel({ status: 'Lead' })).toBe(STATUS_LABEL.Lead);
    expect(listStatusLabel({ status: 'Removed' })).toBe(STATUS_LABEL.Removed);
  });
});

describe('bundled leads', () => {
  const all = getAllEntries();
  const leads = all.filter((e) => e.status === 'Lead');

  it('exist and carry no verification', () => {
    expect(leads.length).toBeGreaterThan(0);
    for (const lead of leads) expect(lead.verification).toBe('Unknown');
  });

  it('are left out of the progress list and nothing else is', () => {
    const progress = getProgressEntries();
    expect(progress.some((e) => e.status === 'Lead' || e.status === 'Removed')).toBe(false);
    expect(progress.length).toBe(all.filter(countsTowardProgress).length);
  });

  it('are tallied separately per destination', () => {
    const summaries = getDestinationSummaries();
    expect(summaries.reduce((n, d) => n + d.count, 0)).toBe(getProgressEntries().length);
    expect(summaries.reduce((n, d) => n + d.leadCount, 0)).toBe(leads.length);
    const resorts = summaries.find((d) => d.parkId === RESORTS_BUCKET_ID);
    expect(resorts?.leadCount).toBe(leads.filter((e) => e.parkId === RESORTS_BUCKET_ID).length);
  });
});
