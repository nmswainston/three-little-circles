import { day, night, ParkKey } from '../src/theme/themes';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const SMALL_TEXT = 4.5;
const CONTROL_EDGE = 3;
const parkKeys: ParkKey[] = ['kingdom', 'studios', 'showcase', 'adventure', 'springs', 'resorts'];

describe('day theme contrast', () => {
  it.each(parkKeys)('puts readable small text on the %s header accent', (key) => {
    const { accent, onAccent } = day.parks[key];
    expect(ratio(day.colors.textOnAccent, accent)).toBeGreaterThanOrEqual(SMALL_TEXT);
    expect(ratio(onAccent, accent)).toBeGreaterThanOrEqual(SMALL_TEXT);
  });

  it.each(['Easy', 'Medium', 'Hard'] as const)('keeps the %s pill text readable', (level) => {
    const { bg, text } = day.difficulty[level];
    expect(ratio(text, bg)).toBeGreaterThanOrEqual(SMALL_TEXT);
  });
});

describe('control borders', () => {
  it('stand out from the surfaces controls sit on in the day theme', () => {
    for (const surface of [day.colors.surface, day.colors.background]) {
      expect(ratio(day.colors.controlBorder, surface)).toBeGreaterThanOrEqual(CONTROL_EDGE);
    }
  });

  it('stand out from the surfaces controls sit on in the night theme', () => {
    for (const surface of [night.colors.surface, night.colors.background, night.colors.tabBar]) {
      expect(ratio(night.colors.controlBorder, surface)).toBeGreaterThanOrEqual(CONTROL_EDGE);
    }
  });
});
