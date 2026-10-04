import { useWindowDimensions } from "react-native";

/** Past this, a ring or tile stops growing and its text stops scaling with it. */
export const MAX_SCALE = 1.5;

/**
 * A size that grows with the guest's text size, up to MAX_SCALE. Use it for
 * a box that holds text, such as a progress ring, so large text does not
 * spill out of a fixed size.
 */
export function useScaledSize(base: number): number {
  const { fontScale } = useWindowDimensions();
  return Math.round(base * Math.min(Math.max(fontScale, 1), MAX_SCALE));
}
