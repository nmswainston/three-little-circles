import { useCallback, useEffect, useState } from 'react';
import { useUnlockStore } from '../store/useUnlockStore';
import { getPurchaseProvider, isParkLocked, isUnlockEnabled, PurchaseResult } from './unlock';

/** True when this park is behind the unlock for this guest. */
export function useParkLocked(parkId: string | undefined): boolean {
  const unlocked = useUnlockStore((s) => s.unlocked);
  return parkId ? isParkLocked(parkId, unlocked) : false;
}

export type UnlockBusy = 'purchase' | 'restore' | null;

/** Price, buy and restore for the unlock card and the Profile section. */
export function useUnlock() {
  const unlocked = useUnlockStore((s) => s.unlocked);
  const setUnlocked = useUnlockStore((s) => s.setUnlocked);
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState<UnlockBusy>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getPurchaseProvider()
      .priceLabel()
      .then((label) => live && setPrice(label))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const handle = useCallback(
    (result: PurchaseResult, kind: 'purchase' | 'restore') => {
      switch (result.status) {
        case 'unlocked':
          setUnlocked(true);
          setMessage(null);
          break;
        case 'cancelled':
          setMessage(null);
          break;
        case 'not-found':
          setMessage('No earlier purchase found on this account.');
          break;
        case 'unavailable':
          setMessage("Purchases aren't available in this version yet.");
          break;
        case 'error':
          setMessage(
            kind === 'purchase'
              ? "The purchase didn't go through. You weren't charged. Try again in a moment."
              : "Couldn't check for a purchase. Try again in a moment."
          );
          break;
      }
    },
    [setUnlocked]
  );

  const run = useCallback(
    async (kind: 'purchase' | 'restore') => {
      if (busy) return;
      setBusy(kind);
      setMessage(null);
      try {
        const p = getPurchaseProvider();
        handle(await (kind === 'purchase' ? p.purchase() : p.restore()), kind);
      } catch (e) {
        handle({ status: 'error', message: String(e) }, kind);
      } finally {
        setBusy(null);
      }
    },
    [busy, handle]
  );

  return {
    unlocked,
    price,
    busy,
    message,
    purchase: () => run('purchase'),
    restore: () => run('restore'),
  };
}

/**
 * Quiet launch check with the store. Only ever turns the unlock on, so a
 * guest with no signal keeps what they bought.
 */
export async function refreshUnlock(): Promise<void> {
  if (!isUnlockEnabled() || useUnlockStore.getState().unlocked) return;
  try {
    if (await getPurchaseProvider().refresh()) useUnlockStore.getState().setUnlocked(true);
  } catch {
    // Offline or store hiccup: try again next launch.
  }
}
