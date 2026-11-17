import { useEffect, useState } from "react";

type NetworkLike = { isConnected?: boolean; isInternetReachable?: boolean };

/**
 * True only when the phone says it has no connection. A reading that is
 * missing, or an unknown reachability, counts as online: wrongly telling a
 * guest they are offline is worse than saying nothing.
 */
export function isOffline(state: NetworkLike | undefined): boolean {
  if (!state) return false;
  return state.isConnected === false || state.isInternetReachable === false;
}

/**
 * Whether the phone is offline right now, following changes as they happen.
 * The network module is loaded on demand so a build made before it was added
 * still runs; it just never reports offline.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    try {
      const Network: typeof import("expo-network") = require("expo-network");
      Network.getNetworkStateAsync()
        .then((state) => {
          if (!cancelled) setOffline(isOffline(state));
        })
        .catch(() => {});
      subscription = Network.addNetworkStateListener((state) => setOffline(isOffline(state)));
    } catch {
      // No network module in this build: assume online.
    }
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return offline;
}
