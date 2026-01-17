import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme/tokens";

export default function Disclaimer() {
  return (
    <Text style={styles.text}>
      Independent fan project. Not affiliated with or endorsed by any theme park company.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.normal,
    color: colors.textMuted,
    textAlign: "center",
  },
});
