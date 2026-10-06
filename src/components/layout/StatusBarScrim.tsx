import React, { useCallback, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Whether a scroll view has moved past the top, for screens that show a
 * StatusBarScrim. Pass `onScroll` to the list and set `scrollEventThrottle`.
 */
export function useScrolledPast(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = e.nativeEvent.contentOffset.y > threshold;
      setScrolled((prev) => (prev === next ? prev : next));
    },
    [threshold]
  );
  return { scrolled, onScroll };
}

/**
 * A solid strip the height of the status bar. The app draws edge to edge, so
 * once a screen has scrolled, its content would pass behind the clock and the
 * battery icons. At the top of the page the strip stays out of the way so the
 * header's rays reach the top of the screen.
 */
export default function StatusBarScrim({ visible }: { visible: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible || insets.top === 0) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.scrim, { height: insets.top, backgroundColor: t.colors.background }]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
