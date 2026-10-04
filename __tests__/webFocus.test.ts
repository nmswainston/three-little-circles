/**
 * @jest-environment jsdom
 */
import { releaseFocusFromHiddenScreens } from '../src/lib/webFocus';

// The helper is a no-op off the web; this test is about the web branch.
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let wrap: HTMLDivElement;
let button: HTMLButtonElement;
let stop: () => void;

beforeEach(() => {
  document.body.innerHTML = '<div id="wrap"><button id="b">Go</button></div><div id="other"></div>';
  wrap = document.getElementById('wrap') as HTMLDivElement;
  button = document.getElementById('b') as HTMLButtonElement;
  stop = releaseFocusFromHiddenScreens();
});

afterEach(() => {
  stop();
});

describe('releaseFocusFromHiddenScreens', () => {
  it('drops focus when an ancestor of the focused element is hidden from assistive tech', async () => {
    button.focus();
    expect(document.activeElement).toBe(button);
    wrap.setAttribute('aria-hidden', 'true');
    await flush();
    expect(document.activeElement).toBe(document.body);
  });

  it('leaves focus alone when the hidden element is somewhere else', async () => {
    button.focus();
    document.getElementById('other')!.setAttribute('aria-hidden', 'true');
    await flush();
    expect(document.activeElement).toBe(button);
  });

  it('leaves focus alone when aria-hidden is switched off', async () => {
    wrap.setAttribute('aria-hidden', 'true');
    await flush();
    button.focus();
    wrap.setAttribute('aria-hidden', 'false');
    await flush();
    expect(document.activeElement).toBe(button);
  });

  it('stops watching once cleaned up', async () => {
    stop();
    button.focus();
    wrap.setAttribute('aria-hidden', 'true');
    await flush();
    expect(document.activeElement).toBe(button);
  });
});
