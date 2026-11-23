import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ParkScreen from '../src/screens/ParkScreen';
import EntryDetailScreen from '../src/screens/EntryDetailScreen';
import ParkCard from '../src/components/ParkCard';
import UnlockCard from '../src/components/UnlockCard';
import { getAllEntries } from '../src/data/query';
import { getDestination } from '../src/data/destinations';
import {
  FREE_PARK_IDS,
  isParkLocked,
  PurchaseProvider,
  PurchaseResult,
  setPurchaseProvider,
} from '../src/lib/unlock';
import { refreshUnlock } from '../src/lib/useUnlock';
import { useUnlockStore } from '../src/store/useUnlockStore';

let mockParams: Record<string, string> = {};
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, push: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));

const LOCKED_PARK = 'studios_park';
const lockedEntry = getAllEntries().find((e) => e.parkId === LOCKED_PARK)!;
const freeEntry = getAllEntries().find((e) => e.parkId === FREE_PARK_IDS[0])!;

function provider(result: PurchaseResult, opts: { price?: string; refresh?: boolean } = {}): PurchaseProvider {
  return {
    priceLabel: async () => opts.price ?? null,
    purchase: jest.fn(async () => result),
    restore: jest.fn(async () => result),
    refresh: jest.fn(async () => opts.refresh ?? false),
  };
}

const ORIGINAL_FLAG = process.env.EXPO_PUBLIC_UNLOCK_ENABLED;

beforeEach(() => {
  process.env.EXPO_PUBLIC_UNLOCK_ENABLED = 'true';
  useUnlockStore.setState({ unlocked: false });
  setPurchaseProvider(null);
  mockGoBack.mockClear();
});

afterAll(() => {
  process.env.EXPO_PUBLIC_UNLOCK_ENABLED = ORIGINAL_FLAG;
});

describe('which parks are locked', () => {
  it('keeps Magic Kingdom and Disneyland Park free', () => {
    expect(FREE_PARK_IDS).toEqual(['magic_kingdom_park', 'california_kingdom_park']);
    for (const id of FREE_PARK_IDS) {
      expect(getDestination(id)).toBeDefined();
      expect(isParkLocked(id, false)).toBe(false);
    }
  });

  it('locks every other park until the unlock is bought', () => {
    expect(isParkLocked(LOCKED_PARK, false)).toBe(true);
    expect(isParkLocked(LOCKED_PARK, true)).toBe(false);
  });

  it('locks nothing while the gate is turned off', () => {
    process.env.EXPO_PUBLIC_UNLOCK_ENABLED = undefined;
    expect(isParkLocked(LOCKED_PARK, false)).toBe(false);
  });
});

describe('locked screens', () => {
  it('shows the unlock in place of a locked park', () => {
    mockParams = { parkId: LOCKED_PARK };
    render(<ParkScreen />);
    expect(screen.getByText('This park is part of the one-time unlock.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('opens a free park as usual', () => {
    mockParams = { parkId: FREE_PARK_IDS[0] };
    render(<ParkScreen />);
    expect(screen.queryByText('This park is part of the one-time unlock.')).toBeNull();
  });

  it('opens a locked park once it is unlocked', () => {
    useUnlockStore.setState({ unlocked: true });
    mockParams = { parkId: LOCKED_PARK };
    render(<ParkScreen />);
    expect(screen.queryByText('This park is part of the one-time unlock.')).toBeNull();
  });

  it('locks a find in a locked park, however it was reached', () => {
    mockParams = { entryId: lockedEntry.id };
    render(<EntryDetailScreen />);
    expect(screen.getByText('This park is part of the one-time unlock.')).toBeTruthy();
    expect(screen.queryByLabelText('See on map')).toBeNull();
  });

  it('opens a find in a free park', () => {
    mockParams = { entryId: freeEntry.id };
    render(<EntryDetailScreen />);
    expect(screen.queryByText('This park is part of the one-time unlock.')).toBeNull();
    expect(screen.getByLabelText('See on map')).toBeTruthy();
  });

  it('marks a locked park on its card', () => {
    render(<ParkCard parkId={LOCKED_PARK} name="Studios" parkKey="studios" count={3} found={0} />);
    expect(screen.getByTestId('park-card-lock')).toBeTruthy();
    expect(screen.getByLabelText(/locked$/)).toBeTruthy();
  });
});

describe('buying and restoring', () => {
  it('unlocks every park after a purchase and shows the store price', async () => {
    setPurchaseProvider(provider({ status: 'unlocked' }, { price: '$4.99' }));
    render(<UnlockCard />);
    const buy = await screen.findByText('Unlock for $4.99');
    await act(async () => {
      fireEvent.press(buy);
    });
    expect(useUnlockStore.getState().unlocked).toBe(true);
    expect(screen.getByText('Every park is unlocked')).toBeTruthy();
  });

  it('says so when no earlier purchase is found', async () => {
    setPurchaseProvider(provider({ status: 'not-found' }));
    render(<UnlockCard />);
    await act(async () => {
      fireEvent.press(screen.getByText('Restore purchases'));
    });
    expect(screen.getByText('No earlier purchase found on this account.')).toBeTruthy();
    expect(useUnlockStore.getState().unlocked).toBe(false);
  });

  it('says purchases are not available when no store is plugged in', async () => {
    render(<UnlockCard />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Unlock every park' }));
    });
    expect(screen.getByText("Purchases aren't available in this version yet.")).toBeTruthy();
  });

  it('picks up an unlock from another device at launch, and never takes one away', async () => {
    setPurchaseProvider(provider({ status: 'cancelled' }, { refresh: true }));
    await refreshUnlock();
    expect(useUnlockStore.getState().unlocked).toBe(true);

    setPurchaseProvider(provider({ status: 'cancelled' }, { refresh: false }));
    await refreshUnlock();
    expect(useUnlockStore.getState().unlocked).toBe(true);
  });
});
