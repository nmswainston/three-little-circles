/**
 * RevenueCat as the unlock's purchase provider.
 *
 * Runs only when the unlock gate is on and this platform has a public SDK
 * key. The keys are public client keys, read from EXPO_PUBLIC_ env vars so
 * the Test Store key can be swapped for the appl_ and goog_ keys later
 * without a code change.
 *
 * RevenueCat setup this expects (see README, "One-time unlock"):
 * - an entitlement with the identifier "all_parks"
 * - the current offering holds one package for the unlock (Lifetime is
 *   used if present, otherwise the first package)
 */
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { isUnlockEnabled, PurchaseProvider, PurchaseResult, setPurchaseProvider } from './unlock';

export const ENTITLEMENT_ID = 'all_parks';

/** This platform's public SDK key, or undefined when none is set. */
export function revenueCatKey(os: string = Platform.OS): string | undefined {
  const key =
    os === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : os === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
        : undefined;
  return key?.trim() || undefined;
}

export function hasUnlockEntitlement(info: CustomerInfo): boolean {
  return ENTITLEMENT_ID in info.entitlements.active;
}

async function unlockPackage(): Promise<PurchasesPackage | null> {
  const offering = (await Purchases.getOfferings()).current;
  return offering?.lifetime ?? offering?.availablePackages[0] ?? null;
}

function isCancelled(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { userCancelled?: boolean }).userCancelled === true;
}

function failure(e: unknown): PurchaseResult {
  return isCancelled(e) ? { status: 'cancelled' } : { status: 'error', message: String((e as Error)?.message ?? e) };
}

export const revenueCatProvider: PurchaseProvider = {
  async priceLabel() {
    try {
      return (await unlockPackage())?.product.priceString ?? null;
    } catch {
      return null;
    }
  },
  async purchase() {
    try {
      const pkg = await unlockPackage();
      if (!pkg) return { status: 'unavailable' };
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return hasUnlockEntitlement(customerInfo)
        ? { status: 'unlocked' }
        : { status: 'error', message: 'Purchase finished without the all_parks entitlement' };
    } catch (e) {
      return failure(e);
    }
  },
  async restore() {
    try {
      return hasUnlockEntitlement(await Purchases.restorePurchases()) ? { status: 'unlocked' } : { status: 'not-found' };
    } catch (e) {
      return failure(e);
    }
  },
  async refresh() {
    try {
      return hasUnlockEntitlement(await Purchases.getCustomerInfo());
    } catch {
      return false;
    }
  },
};

let configured = false;

/**
 * Configure RevenueCat and plug it in as the purchase provider. Safe to call
 * more than once. Returns false, and leaves purchases "unavailable", when the
 * gate is off, the platform has no key (web included), or configure throws
 * (Expo Go without a development build, for example).
 */
export function setupRevenueCat(): boolean {
  if (configured) return true;
  if (!isUnlockEnabled()) return false;
  const apiKey = revenueCatKey();
  if (!apiKey) return false;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
  } catch {
    return false;
  }
  setPurchaseProvider(revenueCatProvider);
  configured = true;
  return true;
}

/** Tests only. */
export function resetRevenueCatForTests(): void {
  configured = false;
  setPurchaseProvider(null);
}
