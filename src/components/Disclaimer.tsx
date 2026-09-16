import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTheme, useStyles, Theme } from "../theme/ThemeProvider";
import { typography } from "../theme/tokens";

export default function Disclaimer() {
  const styles = useStyles(createStyles);
  return (
    <Text style={styles.text}>
      Independent fan project. Not affiliated with or endorsed by any theme park company.
    </Text>
  );
}

const createStyles = (t: Theme) => StyleSheet.create({
  text: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.normal,
    color: t.colors.textMuted,
    textAlign: "center",
  },
});
