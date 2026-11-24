import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { describeTodaysList, todaysProgressLabel } from "../lib/todaysList";
import { useFoundStore } from "../store/useFoundStore";
import { useTodayStore } from "../store/useTodayStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import ProgressBar from "./ui/ProgressBar";

interface TodayCardProps {
  onOpen: () => void;
}

/** A line on the Parks home that opens today's list. Absent until a find is on it. */
export default function TodayCard({ onOpen }: TodayCardProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const ids = useTodayStore((s) => s.ids);
  const found = useFoundStore((s) => s.found);
  const list = useMemo(() => describeTodaysList(ids, found), [ids, found]);

  if (list.total === 0) return null;
  const label = todaysProgressLabel(list);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Today's list, ${label}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Ionicons name="bookmark" size={22} color={t.colors.text} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={styles.textColumn}>
        <Text style={styles.title}>Today's list</Text>
        <Text style={styles.meta}>{label}</Text>
        <ProgressBar progress={list.found / list.total} color={t.colors.success} height={6} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={t.colors.textMuted} />
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
      minHeight: 64,
      padding: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: t.colors.controlBorder,
    },
    pressed: {
      opacity: 0.85,
    },
    textColumn: {
      flex: 1,
      gap: 3,
    },
    title: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    meta: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
  });
