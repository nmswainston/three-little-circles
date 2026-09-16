import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

describe('content pipeline', () => {
  it('validates every entry and the generated file is up to date', () => {
    const result = spawnSync(process.execPath, [join(__dirname, '..', 'scripts', 'build-entries.mjs'), '--check'], {
      encoding: 'utf8',
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
