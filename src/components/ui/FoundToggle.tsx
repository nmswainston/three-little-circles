import React, { useRef } from "react";
import { Pressable, Animated, Text, ViewStyle, TextStyle } from "react-native";
import { colors, spacing, radii, typography } from "../../theme/tokens";

type Props = {
  isFound: boolean;
  onToggle: () => void;
};

export default function FoundToggle({ isFound, onToggle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pop = () => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const containerBase: ViewStyle = {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  };

  const containerOff: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  const containerOn: ViewStyle = {
    backgroundColor: colors.success,
    borderColor: colors.success,
  };

  const textBase: TextStyle = {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  };

  const textOff: TextStyle = {
    color: colors.text,
  };

  const textOn: TextStyle = {
    color: colors.background,
    fontWeight: typography.weights.bold,
  };

  return (
    <Pressable
      onPress={() => {
        onToggle();
        pop();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isFound }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Animated.View
        style={[
          containerBase,
          isFound ? containerOn : containerOff,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[textBase, isFound ? textOn : textOff]}>
          {isFound ? "Found" : "Mark Found"}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
