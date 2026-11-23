/**
 * One-time unlock: two parks are free, and a single purchase opens the rest.
 *
 * The gate is off unless EXPO_PUBLIC_UNLOCK_ENABLED is "true", so current
 * beta builds keep every park open. Turn it on only in a build that also
 * has a purchase provider plugged in (see README, "One-time unlock").
 *
 * Purchases go through a provider so this module has no store SDK of its own.
 * The default provider reports "unavailable"; the RevenueCat adapter calls
 * setPurchaseProvider() once it is installed.
 */

/** Magic Kingdom and Disneyland Park stay free for everyone. */
export const FREE_PARK_IDS: readonly string[] = ['magic_kingdom_park', 'california_kingdom_park'];

/** Read at call time so tests (and Expo's env inlining) both work. */
export function isUnlockEnabled(): boolean {
  return process.env.EXPO_PUBLIC_UNLOCK_ENABLED === 'true';
}

export function isParkFree(parkId: string): boolean {
  return FREE_PARK_IDS.includes(parkId);
}

/** True when this park needs the unlock and the guest doesn't have it. */
export function isParkLocked(parkId: string, unlocked: boolean): boolean {
  return isUnlockEnabled() && !unlocked && !isParkFree(parkId);
}

export type PurchaseResult =
  | { status: 'unlocked' }
  | { status: 'cancelled' }
  | { status: 'not-found' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export interface PurchaseProvider {
  /** Localized price from the store, like "$4.99", or null if unknown. */
  priceLabel(): Promise<string | null>;
  /** Start the store's purchase sheet. */
  purchase(): Promise<PurchaseResult>;
  /** Look for an earlier purchase on this store account. */
  restore(): Promise<PurchaseResult>;
  /** Quiet check at launch, so a purchase made on another device shows up. */
  refresh(): Promise<boolean>;
}

const unavailableProvider: PurchaseProvider = {
  priceLabel: async () => null,
  purchase: async () => ({ status: 'unavailable' }),
  restore: async () => ({ status: 'unavailable' }),
  refresh: async () => false,
};

let provider: PurchaseProvider = unavailableProvider;

export function setPurchaseProvider(next: PurchaseProvider | null): void {
  provider = next ?? unavailableProvider;
}

export function getPurchaseProvider(): PurchaseProvider {
  return provider;
}

export function hasPurchaseProvider(): boolean {
  return provider !== unavailableProvider;
}
