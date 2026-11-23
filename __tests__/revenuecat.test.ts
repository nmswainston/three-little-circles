import Purchases from 'react-native-purchases';
import {
  ENTITLEMENT_ID,
  resetRevenueCatForTests,
  revenueCatKey,
  revenueCatProvider,
  setupRevenueCat,
} from '../src/lib/revenuecat';
import { getPurchaseProvider, hasPurchaseProvider } from '../src/lib/unlock';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

const sdk = Purchases as jest.Mocked<typeof Purchases>;
const withUnlock = { entitlements: { active: { [ENTITLEMENT_ID]: {} } } } as never;
const withoutUnlock = { entitlements: { active: {} } } as never;
const pkg = { product: { priceString: '$4.99' } };

const ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  resetRevenueCatForTests();
  process.env.EXPO_PUBLIC_UNLOCK_ENABLED = 'true';
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'test_ios_key';
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = 'test_android_key';
  sdk.getOfferings.mockResolvedValue({ current: { lifetime: pkg, availablePackages: [pkg] } } as never);
});

afterAll(() => {
  process.env = ENV;
  resetRevenueCatForTests();
});

describe('setup', () => {
  it('picks the key for the platform, and none on web', () => {
    expect(revenueCatKey('ios')).toBe('test_ios_key');
    expect(revenueCatKey('android')).toBe('test_android_key');
    expect(revenueCatKey('web')).toBeUndefined();
  });

  it('configures RevenueCat and plugs it in when the unlock is on', () => {
    expect(setupRevenueCat()).toBe(true);
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'test_ios_key' });
    expect(getPurchaseProvider()).toBe(revenueCatProvider);
  });

  it('stays out of the way while the unlock is off', () => {
    process.env.EXPO_PUBLIC_UNLOCK_ENABLED = '';
    expect(setupRevenueCat()).toBe(false);
    expect(sdk.configure).not.toHaveBeenCalled();
    expect(hasPurchaseProvider()).toBe(false);
  });

  it('stays out of the way without a key', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = ' ';
    expect(setupRevenueCat()).toBe(false);
    expect(hasPurchaseProvider()).toBe(false);
  });

  it('leaves purchases unavailable if the SDK cannot start, as in Expo Go', () => {
    sdk.configure.mockImplementationOnce(() => {
      throw new Error('native module missing');
    });
    expect(setupRevenueCat()).toBe(false);
    expect(hasPurchaseProvider()).toBe(false);
  });
});

describe('the provider', () => {
  it('shows the store price', async () => {
    expect(await revenueCatProvider.priceLabel()).toBe('$4.99');
  });

  it('unlocks when the purchase grants the entitlement', async () => {
    sdk.purchasePackage.mockResolvedValue({ customerInfo: withUnlock } as never);
    expect(await revenueCatProvider.purchase()).toEqual({ status: 'unlocked' });
    expect(sdk.purchasePackage).toHaveBeenCalledWith(pkg);
  });

  it('falls back to the first package when there is no Lifetime package', async () => {
    const other = { product: { priceString: '$2.99' } };
    sdk.getOfferings.mockResolvedValue({ current: { lifetime: null, availablePackages: [other] } } as never);
    sdk.purchasePackage.mockResolvedValue({ customerInfo: withUnlock } as never);
    await revenueCatProvider.purchase();
    expect(sdk.purchasePackage).toHaveBeenCalledWith(other);
  });

  it('treats a closed purchase sheet as cancelled, not an error', async () => {
    sdk.purchasePackage.mockRejectedValue({ userCancelled: true });
    expect(await revenueCatProvider.purchase()).toEqual({ status: 'cancelled' });
  });

  it('reports a store error', async () => {
    sdk.purchasePackage.mockRejectedValue(new Error('network'));
    expect(await revenueCatProvider.purchase()).toMatchObject({ status: 'error' });
  });

  it('says unavailable when no offering is set up yet', async () => {
    sdk.getOfferings.mockResolvedValue({ current: null } as never);
    expect(await revenueCatProvider.purchase()).toEqual({ status: 'unavailable' });
  });

  it('restores an earlier purchase, or says none was found', async () => {
    sdk.restorePurchases.mockResolvedValueOnce(withUnlock);
    expect(await revenueCatProvider.restore()).toEqual({ status: 'unlocked' });
    sdk.restorePurchases.mockResolvedValueOnce(withoutUnlock);
    expect(await revenueCatProvider.restore()).toEqual({ status: 'not-found' });
  });

  it('checks the entitlement quietly at launch', async () => {
    sdk.getCustomerInfo.mockResolvedValueOnce(withUnlock);
    expect(await revenueCatProvider.refresh()).toBe(true);
    sdk.getCustomerInfo.mockRejectedValueOnce(new Error('offline'));
    expect(await revenueCatProvider.refresh()).toBe(false);
  });
});
