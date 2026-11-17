import { isOffline } from '../src/lib/useOffline';

describe('isOffline', () => {
  it('is offline only when the phone says so', () => {
    expect(isOffline({ isConnected: false })).toBe(true);
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
  });

  it('counts a missing or unknown reading as online', () => {
    expect(isOffline(undefined)).toBe(false);
    expect(isOffline({})).toBe(false);
    expect(isOffline({ isConnected: true })).toBe(false);
    expect(isOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
  });
});
