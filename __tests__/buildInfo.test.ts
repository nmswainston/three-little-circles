import { formatBuildInfo, readBuildInfo } from '../src/lib/buildInfo';

describe('formatBuildInfo', () => {
  it('says the version, build number, and commit', () => {
    expect(formatBuildInfo({ version: '1.0.0', build: '24', commit: '83e4a60' })).toBe('Version 1.0.0 · build 24 · 83e4a60');
  });

  it('adds the update id when an over-the-air update is running', () => {
    expect(formatBuildInfo({ version: '1.0.0', build: '24', commit: '83e4a60', updateId: 'ab12cd3' })).toBe(
      'Version 1.0.0 · build 24 · 83e4a60 · update ab12cd3'
    );
  });

  it('leaves out whatever this build does not know', () => {
    expect(formatBuildInfo({ version: '1.0.0' })).toBe('Version 1.0.0');
    expect(formatBuildInfo({ version: '1.0.0', commit: '83e4a60' })).toBe('Version 1.0.0 · 83e4a60');
    expect(formatBuildInfo({})).toBe('');
  });
});

describe('readBuildInfo', () => {
  it('does not throw where there is no app manifest, as in tests', () => {
    expect(() => readBuildInfo()).not.toThrow();
    expect(['string', 'undefined']).toContain(typeof readBuildInfo().updateId);
  });
});
