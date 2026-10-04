import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { Coordinates } from "../data/types";

/**
 * checking: asking the system what it already knows
 * ask: permission has not been decided, so a button can ask for it
 * ready: `position` is set
 * off: permission was refused or no fix could be had
 */
export type LocationStatus = "checking" | "ask" | "ready" | "off";

/** A fix this recent is good enough to say which land you are in. */
const MAX_FIX_AGE_MS = 2 * 60 * 1000;

async function currentPosition(): Promise<Coordinates> {
  const known = await Location.getLastKnownPositionAsync({ maxAge: MAX_FIX_AGE_MS });
  const fix = known ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
}

/**
 * The device position for the Parks home. It never prompts by itself: it
 * reads the position only when permission was already given, and `request`
 * asks when the guest taps for it. The position is read again each time the
 * app returns to the foreground.
 */
export function useDeviceLocation() {
  const [status, setStatus] = useState<LocationStatus>("checking");
  const [position, setPosition] = useState<Coordinates | undefined>();
  const mounted = useRef(true);

  const read = useCallback(async () => {
    try {
      const here = await currentPosition();
      if (!mounted.current) return;
      setPosition(here);
      setStatus("ready");
    } catch {
      if (mounted.current) setStatus("off");
    }
  }, []);

  const check = useCallback(async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (permission.granted) await read();
      else setStatus(permission.canAskAgain ? "ask" : "off");
    } catch {
      if (mounted.current) setStatus("off");
    }
  }, [read]);

  const request = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (permission.granted) await read();
      else setStatus("off");
    } catch {
      if (mounted.current) setStatus("off");
    }
  }, [read]);

  useEffect(() => {
    mounted.current = true;
    check().catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check().catch(() => {});
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [check]);

  return { status, position, request };
}
