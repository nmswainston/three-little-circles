import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entries } from '../src/data/entries';

describe('reconcile-master script', () => {
  const script = join(__dirname, '..', 'scripts', 'reconcile-master.mjs');
  const linked = entries.find((e) => e.sourceId);

  it('reports new rows, orphaned entries, and status disagreements', () => {
    expect(linked).toBeDefined();
    const dir = mkdtempSync(join(tmpdir(), 'tlc-reconcile-'));
    const csvPath = join(dir, 'master.csv');
    const sheetStatus: Record<string, string> = {
      Current: 'Current',
      Unverified: 'Needs reverification',
      Seasonal: 'Seasonal/time-specific',
      Variable: 'Variable/prop-dependent',
      Removed: 'Historical/removed',
    };
    const rows = [
      'find_id,category,park,land_area,attraction_venue,find_description,status',
      // Same status as the app for the linked entry: no disagreement.
      `${linked!.sourceId},Hidden Mickey,Kingdom Park,Land,Venue,"Already written up",${
        sheetStatus[linked!.status ?? 'Current']
      }`,
      // A row nobody has written up yet.
      'TLC-ZZ-0001,Hidden Mickey,Kingdom Park,Land,"New, unwritten venue","A brand new report",Needs reverification',
    ];
    writeFileSync(csvPath, rows.join('\n'));

    const result = spawnSync(process.execPath, [script, csvPath], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('TLC-ZZ-0001');
    expect(result.stdout).toContain('New, unwritten venue');
    // Every other linked entry is "orphaned" from this two-row sheet.
    const linkedCount = entries.filter((e) => e.sourceId).length;
    expect(result.stdout).toContain(`Entries whose sourceId is not in the spreadsheet: ${linkedCount - 1}`);
    expect(result.stdout).toContain('Entries whose status disagrees with the spreadsheet: 0');
  });

  it('fails clearly without a file', () => {
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage');
  });
});
