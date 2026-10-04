import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * True when the guest asked their device to cut back on motion. Decorative
 * movement such as confetti and pops should be skipped when it is on.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
