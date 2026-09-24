import { FEEDBACK_SUBJECT, feedbackEmail, feedbackMailto } from '../src/lib/feedback';

describe('feedbackEmail', () => {
  const original = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;
    else process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = original;
  });

  it('is undefined when the variable is unset or blank', () => {
    delete process.env.EXPO_PUBLIC_FEEDBACK_EMAIL;
    expect(feedbackEmail()).toBeUndefined();
    process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = '   ';
    expect(feedbackEmail()).toBeUndefined();
  });

  it('trims the address', () => {
    process.env.EXPO_PUBLIC_FEEDBACK_EMAIL = ' beta@example.com ';
    expect(feedbackEmail()).toBe('beta@example.com');
  });
});

describe('feedbackMailto', () => {
  it('addresses the mail, fills the subject, and puts the build under the notes', () => {
    const url = feedbackMailto('beta@example.com', { version: '1.0.0', platform: 'iOS', osVersion: '18.0' });
    expect(url.startsWith('mailto:beta@example.com?')).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('subject')).toBe(FEEDBACK_SUBJECT);
    expect(params.get('body')).toBe('\n\n\n---\nApp 1.0.0 on iOS 18.0');
  });

  it('says so when there is no build version', () => {
    const url = feedbackMailto('beta@example.com', { platform: 'Android', osVersion: 34 });
    expect(decodeURIComponent(url)).toContain('App development build on Android 34');
  });
});
