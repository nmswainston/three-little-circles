import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Platform } from 'react-native';

const PIECE_COUNT = 26;

interface ConfettiProps {
  colors: string[];
}

/**
 * A one-shot burst of confetti from the top center of its parent. Runs once
 * on mount; give it a fresh key to fire again.
 */
export default function Confetti({ colors }: ConfettiProps) {
  const progress = useRef(Array.from({ length: PIECE_COUNT }, () => new Animated.Value(0))).current;

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        color: colors[i % colors.length],
        dx: (Math.random() - 0.5) * 260,
        dy: 120 + Math.random() * 160,
        rotation: (Math.random() - 0.5) * 720,
        size: 6 + Math.random() * 6,
        round: i % 3 === 0,
        duration: 1000 + Math.random() * 500,
      })),
    // Colors are read once; the burst is a single shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    Animated.stagger(
      12,
      progress.map((value, i) =>
        Animated.timing(value, {
          toValue: 1,
          duration: pieces[i].duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        })
      )
    ).start();
  }, [pieces, progress]);

  return (
    <View style={styles.layer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((piece, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 0.6,
            borderRadius: piece.round ? piece.size / 2 : 1,
            backgroundColor: piece.color,
            opacity: progress[i].interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] }) },
              { translateY: progress[i].interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -40, piece.dy] }) },
              { rotate: progress[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.rotation}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
    pointerEvents: 'none',
  },
});
