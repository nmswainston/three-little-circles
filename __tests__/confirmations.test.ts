import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describeFreshness, getConfirmation, ConfirmationSummary } from '../src/data/confirmations';
import { useConfirmationsStore } from '../src/store/useConfirmationsStore';

const NOW = Date.parse('2026-09-22T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

describe('describeFreshness', () => {
  it('has nothing to say before any reports', () => {
    expect(describeFreshness(undefined, NOW)).toEqual({ label: 'No reports yet', warning: false });
    expect(describeFreshness({ seen: 0, missing: 0 }, NOW)).toEqual({ label: 'No reports yet', warning: false });
    expect(describeFreshness({ seen: 2, missing: 0, lastSeenISO: 'garbage' }, NOW).label).toBe('No reports yet');
  });

  it('leads with the last sighting when that is the latest word', () => {
    const summary: ConfirmationSummary = { seen: 3, missing: 0, lastSeenISO: iso(21) };
    expect(describeFreshness(summary, NOW)).toEqual({ label: 'Last seen 3 weeks ago', detail: '3 saw it', warning: false });
  });

  it('warns when the most recent report says it is gone, but keeps the counts', () => {
    const summary: ConfirmationSummary = { seen: 10, missing: 1, lastSeenISO: iso(30), lastMissingISO: iso(1) };
    expect(describeFreshness(summary, NOW)).toEqual({
      label: 'Reported missing yesterday',
      detail: "10 saw it · 1 couldn't find it",
      warning: true,
    });
  });

  it('does not warn when someone has seen it since the last missing report', () => {
    const summary: ConfirmationSummary = { seen: 1, missing: 2, lastSeenISO: iso(2), lastMissingISO: iso(9) };
    const result = describeFreshness(summary, NOW);
    expect(result.warning).toBe(false);
    expect(result.label).toBe('Last seen 2 days ago');
    expect(result.detail).toBe("1 saw it · 2 couldn't find it");
  });

  it('returns undefined for an entry with no summary', () => {
    expect(getConfirmation('__no-such-entry__')).toBeUndefined();
  });
});

describe('useConfirmationsStore', () => {
  beforeEach(() => useConfirmationsStore.setState({ reported: {} }));

  it('remembers the latest report per entry with a timestamp', () => {
    const before = Date.now();
    useConfirmationsStore.getState().record('a', 'seen');
    useConfirmationsStore.getState().record('a', 'missing');
    useConfirmationsStore.getState().record('b', 'seen');
    const { reported } = useConfirmationsStore.getState();
    expect(reported.a.status).toBe('missing');
    expect(reported.a.at).toBeGreaterThanOrEqual(before);
    expect(reported.b.status).toBe('seen');
  });
});

// The aggregation is an ES module the pull script imports, and Jest here only
// transforms .js/.ts, so run it in a child Node process the way the content
// test runs the build script.
type Row = { entry_id: string; device_id: string; status: string; created_at: string };
type Summaries = Record<string, ConfirmationSummary>;

function summarize(rows: Row[], opts: { knownIds?: string[]; now: number; windowDays?: number }) {
  const mod = pathToFileURL(join(__dirname, '..', 'scripts', 'lib', 'summarize-confirmations.mjs')).href;
  const code = `
    import { summarizeConfirmations, renderGeneratedModule } from ${JSON.stringify(mod)};
    const opts = ${JSON.stringify(opts)};
    if (opts.knownIds) opts.knownIds = new Set(opts.knownIds);
    const result = summarizeConfirmations(${JSON.stringify(rows)}, opts);
    process.stdout.write(JSON.stringify({ ...result, module: renderGeneratedModule(result.summaries, "2026-09-22T12:00:00.000Z") }));
  `;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  expect(run.stderr).toBe('');
  expect(run.status).toBe(0);
  return JSON.parse(run.stdout) as { summaries: Summaries; unknownEntryIds: string[]; module: string };
}

describe('summarizeConfirmations (pull script)', () => {
  const row = (entry: string, device: string, status: string, daysAgo: number): Row => ({
    entry_id: entry,
    device_id: device,
    status,
    created_at: iso(daysAgo),
  });

  it('counts one vote per device, the latest one', () => {
    const { summaries } = summarize(
      [row('bells', 'A', 'seen', 10), row('bells', 'A', 'missing', 2), row('bells', 'B', 'seen', 5)],
      { now: NOW }
    );
    expect(summaries.bells).toEqual({ seen: 1, missing: 1, lastSeenISO: iso(5), lastMissingISO: iso(2) });
  });

  it('ignores rows outside the window, in the future, with a bad status, or for unknown entries', () => {
    const { summaries, unknownEntryIds } = summarize(
      [
        row('bells', 'A', 'seen', 100),
        row('bells', 'B', 'seen', 1),
        row('bells', 'C', 'maybe', 1),
        row('bells', 'D', 'seen', -1),
        row('ghost', 'A', 'seen', 1),
      ],
      { now: NOW, knownIds: ['bells'] }
    );
    expect(summaries).toEqual({ bells: { seen: 1, missing: 0, lastSeenISO: iso(1) } });
    expect(unknownEntryIds).toEqual(['ghost']);
  });

  it('sorts entries and renders a module the app can import', () => {
    const { summaries, module } = summarize([row('zebra', 'A', 'missing', 1), row('apple', 'A', 'seen', 1)], { now: NOW });
    expect(Object.keys(summaries)).toEqual(['apple', 'zebra']);
    expect(module).toContain('export const confirmations: Record<string, ConfirmationSummary> = {');
    expect(module).toContain('"apple": { seen: 1, missing: 0, lastSeenISO:');
    expect(module).toContain('"zebra": { seen: 0, missing: 1, lastMissingISO:');
    expect(module).toContain('CONFIRMATIONS_PULLED_AT_ISO: string | undefined = "2026-09-22T12:00:00.000Z"');
  });

  it('renders an empty module when there is nothing', () => {
    const { module } = summarize([], { now: NOW });
    expect(module).toContain('export const confirmations: Record<string, ConfirmationSummary> = {};');
  });
});
