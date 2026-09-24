import React, { useState } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';

const FADE_WIDTH = 32;

interface FadingScrollRowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Six-digit hex the edges fade into. Defaults to the screen background. */
  fadeColor?: string;
}

/**
 * A horizontal chip row that fades out at whichever edge still has more to
 * scroll, so a chip cut off at the screen edge reads as "keep swiping".
 */
export default function FadingScrollRow({ children, style, contentContainerStyle, fadeColor }: FadingScrollRowProps) {
  const t = useTheme();
  const color = fadeColor ?? t.colors.background;
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(e.nativeEvent.contentOffset.x);
  const showStart = offset > 4;
  const showEnd = contentWidth - width - offset > 4;

  return (
    <View style={[styles.wrap, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
      {showStart && (
        <LinearGradient
          colors={[color, `${color}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.start]}
        />
      )}
      {showEnd && (
        <LinearGradient
          colors={[`${color}00`, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.end]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView in a column will otherwise shrink to make room
  // for a long sibling list, hiding the chips behind it.
  wrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
    pointerEvents: 'none',
  },
  start: {
    left: 0,
  },
  end: {
    right: 0,
  },
});
