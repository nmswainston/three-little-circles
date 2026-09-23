import { APP_NAME, entryShareText, parkShareText, progressShareText } from '../src/lib/share';
import { getAllEntries } from '../src/data/query';

const entries = getAllEntries();

describe('entryShareText', () => {
  it('names the find and the place, and says whether you found it', () => {
    const entry = entries.find((e) => e.display?.attractionName && e.display?.parkName);
    expect(entry).toBeDefined();
    const found = entryShareText(entry!, true);
    const hunting = entryShareText(entry!, false);

    expect(found).toContain(`I found the ${entry!.display!.entryTitle}`);
    expect(found).toContain(`at ${entry!.display!.attractionName}`);
    expect(found).toContain(`in ${entry!.display!.parkName}`);
    expect(found).toContain(`${entry!.difficulty} to spot`);
    expect(found).toContain(APP_NAME);
    expect(found).not.toContain('Any tips?');

    expect(hunting).toContain(`Hunting the ${entry!.display!.entryTitle}`);
    expect(hunting).toContain('Any tips?');
  });

  it('never leaks where to look or the tip', () => {
    for (const entry of entries) {
      for (const found of [true, false]) {
        const text = entryShareText(entry, found);
        expect(text).not.toContain(entry.whereToLook.scene);
        expect(text).not.toContain(entry.whereToLook.exactSpot);
        if (entry.bestTip) expect(text).not.toContain(entry.bestTip);
      }
    }
  });

  it('copes with an entry that has no display names', () => {
    const bare = { ...entries[0], display: undefined };
    expect(entryShareText(bare, true)).toBe(`I found the hidden detail. ${bare.difficulty} to spot. Tracked with ${APP_NAME}.`);
  });
});

describe('parkShareText', () => {
  it('reads differently for nothing, some, and everything found', () => {
    expect(parkShareText({ name: 'Studios Park', found: 0, total: 0 })).toBe(`Exploring Studios Park with ${APP_NAME}.`);
    expect(parkShareText({ name: 'Studios Park', found: 2, total: 5 })).toBe(
      `2 of 5 hidden details found in Studios Park. Tracked with ${APP_NAME}.`
    );
    expect(parkShareText({ name: 'Springs', found: 1, total: 1 })).toBe(
      `Found all 1 hidden detail in Springs. Tracked with ${APP_NAME}.`
    );
  });
});

describe('progressShareText', () => {
  const parks = [
    { name: 'Studios Park', found: 3, total: 5 },
    { name: 'Resorts', found: 0, total: 5 },
    { name: 'Springs', found: 1, total: 1 },
  ];

  it('lists only the parks you have started, and badges when you have any', () => {
    const text = progressShareText(4, 12, parks, 3);
    const lines = text.split('\n');
    expect(lines[0]).toBe(`4 of 12 hidden details found so far. Tracked with ${APP_NAME}.`);
    expect(lines[1]).toBe('Studios Park 3/5 · Springs 1/1');
    expect(lines[2]).toBe('3 badges earned.');
    expect(text).not.toContain('Resorts');
  });

  it('drops the park and badge lines when there is nothing to say', () => {
    expect(progressShareText(0, 12, parks.map((p) => ({ ...p, found: 0 })), 0)).toBe(
      `0 of 12 hidden details found so far. Tracked with ${APP_NAME}.`
    );
    expect(progressShareText(1, 12, parks, 1)).toContain('1 badge earned.');
  });
});
