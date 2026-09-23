import {
  BACKUP_FORMAT,
  Backup,
  BackupData,
  backupToText,
  buildBackup,
  mergeBackup,
  parseBackup,
  replaceWithBackup,
  summarizeBackup,
} from '../src/lib/backup';
import { applyBackup, currentBackupData, exportBackup } from '../src/store/backup';
import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useConfirmationsStore } from '../src/store/useConfirmationsStore';
import { getAllEntries } from '../src/data/query';

const NOW = Date.parse('2026-09-22T12:00:00Z');
const entries = getAllEntries();
const knownIds = new Set(entries.map((e) => e.id));

// Pick fixtures by what the tests need rather than by file order, so more
// content can't change what the assertions mean:
//   first  is alone at its attraction, so finding it completes that attraction;
//   third  shares its attraction with others, so finding it alone completes nothing;
//   second is any other entry.
const attractionSize = (e: (typeof entries)[number]) =>
  entries.filter((o) => o.parkId === e.parkId && o.landId === e.landId && o.attractionId === e.attractionId).length;
const first = entries.find((e) => attractionSize(e) === 1)!;
const third = entries.find((e) => attractionSize(e) > 1)!;
const second = entries.find((e) => e !== first && e !== third)!;

const sample: BackupData = {
  found: { [first.id]: NOW - 5000, [second.id]: NOW - 4000 },
  achievements: { unlocked: ['FIRST_FIND'], earnedAt: { FIRST_FIND: NOW - 5000 }, seen: ['FIRST_FIND'] },
  settings: { appearance: 'night', mapType: 'hybrid', hideFound: true, hintMode: false },
  reports: { [first.id]: { status: 'seen', at: NOW - 3000 } },
};

describe('buildBackup and backupToText', () => {
  it('round-trips through the message text', () => {
    const backup = buildBackup(sample, NOW);
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.exportedAtISO).toBe('2026-09-22T12:00:00.000Z');

    const text = backupToText(backup);
    expect(text.startsWith('Three Little Circles backup: 2 finds, 1 badge, exported 2026-09-22.')).toBe(true);

    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.backup).toEqual(backup);
  });

  it('copies rather than aliases the device data', () => {
    const backup = buildBackup(sample, NOW);
    backup.found.extra = 1;
    backup.achievements.unlocked.push('X');
    expect(sample.found.extra).toBeUndefined();
    expect(sample.achievements.unlocked).toEqual(['FIRST_FIND']);
  });
});

describe('parseBackup', () => {
  const backup = buildBackup(sample, NOW);

  it('finds the code inside whatever surrounds it', () => {
    const wrapped = `Hey, here's my backup!\n\n${JSON.stringify(backup)}\n\nSent from my phone`;
    const parsed = parseBackup(wrapped);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.backup.found).toEqual(sample.found);
  });

  it('explains what went wrong', () => {
    expect(parseBackup('')).toEqual({ ok: false, message: expect.stringContaining("doesn't look like") });
    expect(parseBackup('{"app":"three-little-circles",')).toEqual({ ok: false, message: expect.stringContaining('incomplete') });
    expect(parseBackup('{"app":"other-app","format":1}')).toEqual({ ok: false, message: expect.stringContaining("not a Three Little Circles") });
    expect(parseBackup(JSON.stringify({ ...backup, format: BACKUP_FORMAT + 1 }))).toEqual({
      ok: false,
      message: expect.stringContaining('newer version'),
    });
  });

  it('refuses a well-formed object that is not a backup, so Replace cannot wipe the phone on nothing', () => {
    const incomplete = { ok: false, message: expect.stringContaining('incomplete') };
    expect(parseBackup('{"app":"three-little-circles"}')).toEqual(incomplete);
    expect(parseBackup('{"app":"three-little-circles","format":1}')).toEqual(incomplete);
    expect(parseBackup('{"app":"three-little-circles","format":1,"found":{}}')).toEqual(incomplete);
    expect(parseBackup('{"app":"three-little-circles","format":0,"found":{},"achievements":{}}')).toEqual(incomplete);
    expect(parseBackup('{"app":"three-little-circles","format":"1","found":{},"achievements":{}}')).toEqual(incomplete);
    expect(parseBackup('{"app":"three-little-circles","format":1,"found":[],"achievements":{}}')).toEqual(incomplete);
    // The minimal genuine backup still parses.
    const minimal = parseBackup('{"app":"three-little-circles","format":1,"found":{},"achievements":{}}');
    expect(minimal.ok).toBe(true);
    if (minimal.ok) expect(minimal.backup.achievements).toEqual({ unlocked: [], earnedAt: {}, seen: [] });
  });

  it('drops values it cannot trust and keeps the rest', () => {
    const messy = {
      app: 'three-little-circles',
      format: 1,
      exportedAtISO: 'not a date',
      found: { good: 123.9, negative: -1, text: 'no', '': 5 },
      achievements: { unlocked: ['A', 'A', 7, ''], earnedAt: { A: 'soon' }, seen: 'nope' },
      settings: { appearance: 'neon', mapType: 'hybrid', hideFound: 'yes', hintMode: true },
      reports: { x: { status: 'seen', at: 10 }, y: { status: 'maybe', at: 10 }, z: 'seen' },
    };
    const parsed = parseBackup(JSON.stringify(messy));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.exportedAtISO).toBe('');
    expect(parsed.backup.found).toEqual({ good: 123 });
    expect(parsed.backup.achievements).toEqual({ unlocked: ['A'], earnedAt: {}, seen: [] });
    // Two settings fields were invalid and there is nothing to fall back to, so no settings at all.
    expect(parsed.backup.settings).toBeUndefined();
    expect(parsed.backup.reports).toEqual({ x: { status: 'seen', at: 10 } });
  });
});

describe('summarizeBackup', () => {
  it('counts finds, what is new here, and what this version does not know', () => {
    const backup = buildBackup({ ...sample, found: { ...sample.found, 'future-entry': NOW } }, NOW);
    const summary = summarizeBackup(backup, { [first.id]: 1 }, knownIds);
    expect(summary).toEqual({
      finds: 3,
      badges: 1,
      newFinds: 2,
      unknownFinds: 1,
      hasSettings: true,
      reports: 1,
      exportedAtISO: '2026-09-22T12:00:00.000Z',
    });
  });
});

describe('mergeBackup and replaceWithBackup', () => {
  const current: BackupData = {
    found: { [first.id]: NOW - 1000, [third.id]: NOW - 9000 },
    achievements: { unlocked: ['FIRST_FIND', 'LAND_COMPLETE'], earnedAt: { FIRST_FIND: NOW - 1000, LAND_COMPLETE: NOW - 900 }, seen: [] },
    settings: { appearance: 'day', mapType: 'standard', hideFound: false, hintMode: true },
    reports: { [first.id]: { status: 'missing', at: NOW - 100 }, [third.id]: { status: 'seen', at: NOW - 8000 } },
  };
  const backup = buildBackup(sample, NOW);

  it('merge keeps everything from both sides with the earlier dates, and leaves settings alone', () => {
    const merged = mergeBackup(current, backup);
    expect(merged.found).toEqual({ [first.id]: NOW - 5000, [second.id]: NOW - 4000, [third.id]: NOW - 9000 });
    expect(merged.achievements.unlocked).toEqual(['FIRST_FIND', 'LAND_COMPLETE']);
    expect(merged.achievements.earnedAt.FIRST_FIND).toBe(NOW - 5000);
    expect(merged.achievements.seen).toEqual(['FIRST_FIND']);
    expect(merged.settings).toEqual(current.settings);
    // The newer report wins per entry.
    expect(merged.reports).toEqual({ [first.id]: { status: 'missing', at: NOW - 100 }, [third.id]: { status: 'seen', at: NOW - 8000 } });
  });

  it('replace makes this device match the backup, settings included when present', () => {
    const replaced = replaceWithBackup(current, backup);
    expect(replaced.found).toEqual(sample.found);
    expect(replaced.achievements).toEqual(sample.achievements);
    expect(replaced.settings).toEqual(sample.settings);
    expect(replaced.reports).toEqual(sample.reports);

    const trimmed: Backup = { ...backup, settings: undefined, reports: undefined };
    const kept = replaceWithBackup(current, trimmed);
    expect(kept.settings).toEqual(current.settings);
    expect(kept.reports).toEqual({});
  });
});

describe('applyBackup on the stores', () => {
  beforeAll(async () => {
    await useFoundStore.persist.rehydrate();
    await useAchievementsStore.persist.rehydrate();
    await useSettingsStore.persist.rehydrate();
    await useConfirmationsStore.persist.rehydrate();
  });

  beforeEach(() => {
    useFoundStore.setState({ found: {} });
    useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
    useSettingsStore.setState({ appearance: 'system', mapType: 'standard', hideFound: false, hintMode: true });
    useConfirmationsStore.setState({ reported: {} });
  });

  it('exports what the stores hold, without the device id', () => {
    useFoundStore.getState().toggleFound(first.id);
    const backup = exportBackup(NOW);
    expect(Object.keys(backup.found)).toEqual([first.id]);
    expect(backup.achievements.unlocked).toContain('FIRST_FIND');
    expect(JSON.stringify(backup)).not.toContain('deviceId');
    expect('deviceId' in (backup.settings ?? {})).toBe(false);
  });

  it('merge adds finds and badges without toasting badges the backup already carried', () => {
    // This phone already has one find, so FIRST_FIND is earned and its toast has been seen.
    useFoundStore.setState({ found: { [third.id]: NOW - 1 } });
    useAchievementsStore.setState({ pending: [] });
    expect(useAchievementsStore.getState().unlocked).toContain('FIRST_FIND');

    // The backup carries a badge this phone has not earned on its own.
    const backup = buildBackup(
      { ...sample, achievements: { ...sample.achievements, unlocked: ['FIRST_FIND', 'TEN_FINDS'] } },
      NOW
    );
    applyBackup(backup, 'merge');

    const found = useFoundStore.getState().found;
    expect(Object.keys(found).sort()).toEqual([first.id, second.id, third.id].sort());
    const state = useAchievementsStore.getState();
    expect(state.unlocked).toEqual(expect.arrayContaining(['FIRST_FIND', 'TEN_FINDS']));
    // Badges the backup brought along are not news; badges the merged finds newly satisfy are.
    expect(state.pending).not.toContain('FIRST_FIND');
    expect(state.pending).not.toContain('TEN_FINDS');
    expect(state.pending).toContain('ATTRACTION_COMPLETE');
    expect(useSettingsStore.getState().appearance).toBe('system');
    expect(useConfirmationsStore.getState().reported[first.id]).toEqual({ status: 'seen', at: NOW - 3000 });
  });

  it('replace overwrites finds, badges, settings, and reports, and keeps the device id', () => {
    const deviceId = useSettingsStore.getState().deviceId;
    useFoundStore.setState({ found: { [third.id]: NOW - 1 } });
    applyBackup(buildBackup(sample, NOW), 'replace');

    expect(useFoundStore.getState().found).toEqual(sample.found);
    // The backup's badge and its original date survive; badges the restored finds satisfy are recomputed on top.
    expect(useAchievementsStore.getState().unlocked).toContain('FIRST_FIND');
    expect(useAchievementsStore.getState().earnedAt.FIRST_FIND).toBe(NOW - 5000);
    expect(useAchievementsStore.getState().unlocked).toContain('ATTRACTION_COMPLETE');
    expect(useSettingsStore.getState().appearance).toBe('night');
    expect(useSettingsStore.getState().hintMode).toBe(false);
    expect(useSettingsStore.getState().deviceId).toBe(deviceId);
    expect(useConfirmationsStore.getState().reported).toEqual(sample.reports);
    expect(currentBackupData().settings).toEqual(sample.settings);
  });
});
