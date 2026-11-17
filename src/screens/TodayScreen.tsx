import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import StatusBarScrim, { useScrolledPast } from "../components/layout/StatusBarScrim";
import Sunburst from "../components/ui/Sunburst";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import EntryRow from "../components/EntryRow";
import { describeTodaysList, todaysProgressLabel } from "../lib/todaysList";
import { useFoundStore } from "../store/useFoundStore";
import { useTodayStore } from "../store/useTodayStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * The finds a guest has picked for this visit, grouped by park and land in
 * the order they would meet them. Marking a find found keeps it on the list,
 * checked, so the page doubles as a record of the day.
 */
export default function TodayScreen() {
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll } = useScrolledPast();
  const ids = useTodayStore((s) => s.ids);
  const remove = useTodayStore((s) => s.remove);
  const clear = useTodayStore((s) => s.clear);
  const found = useFoundStore((s) => s.found);

  const list = useMemo(() => describeTodaysList(ids, found), [ids, found]);
  const progress = list.total === 0 ? 0 : list.found / list.total;

  const confirmClear = () =>
    Alert.alert("Clear today's list?", "This removes every find from the list. Your found marks and progress stay.", [
      { text: "Keep it", style: "cancel" },
      { text: "Clear list", style: "destructive", onPress: clear },
    ]);

  return (
    <View style={styles.screen}>
      <StatusBarScrim visible={scrolled} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Sunburst center={{ x: 195, y: -200 + insets.top }} />
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={t.colors.text} />
          </Pressable>
          <Text style={styles.eyebrow}>Plan</Text>
          <Text style={styles.title} accessibilityRole="header">
            Today's list
          </Text>
          {list.total > 0 ? (
            <View style={styles.progress} accessible accessibilityLabel={todaysProgressLabel(list)}>
              <Text style={styles.progressText}>{todaysProgressLabel(list)}</Text>
              <ProgressBar progress={progress} color={t.colors.success} />
            </View>
          ) : (
            <Text style={styles.subtitle}>The finds you pick to look for on this visit.</Text>
          )}
        </View>

        {list.total === 0 ? (
          <View style={styles.body}>
            <EmptyState
              title="Nothing on the list yet"
              message="Open a find and tap Add to today's list. They'll show up here in the order you'd walk to them."
              actionLabel="Browse parks"
              onAction={() => navigation.navigate("Parks")}
            />
          </View>
        ) : (
          <View style={styles.body}>
            {list.parks.map((park) => (
              <View key={park.parkId} style={styles.park}>
                <Text style={styles.parkName} accessibilityRole="header">
                  {park.parkName}
                </Text>
                {park.lands.map((land) => (
                  <View key={land.landId} style={styles.land}>
                    <Text style={styles.landName} accessibilityRole="header">
                      {land.landName}
                    </Text>
                    {land.attractions.map((attraction) => (
                      <View key={attraction.attractionId} style={styles.card}>
                        <Text style={styles.attractionName}>{attraction.attractionName}</Text>
                        {attraction.entries.map((entry) => (
                          <View key={entry.id} style={styles.entryRow}>
                            <View style={styles.entry}>
                              <EntryRow entry={entry} hideListMark onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })} />
                            </View>
                            <Pressable
                              onPress={() => remove([entry.id])}
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${entry.display?.entryTitle ?? "this find"} from today's list`}
                              hitSlop={4}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close" size={20} color={t.colors.textMuted} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.actions}>
              {list.found > 0 && list.found < list.total && (
                <Pressable
                  onPress={() => remove(list.foundIds)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>Remove found finds</Text>
                </Pressable>
              )}
              <Pressable
                onPress={confirmClear}
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Clear list</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    scroll: {
      paddingBottom: spacing.huge,
    },
    header: {
      position: "relative",
      overflow: "hidden",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backButton: {
      width: 44,
      height: 44,
      marginLeft: -12,
      alignItems: "center",
      justifyContent: "center",
    },
    eyebrow: {
      ...text.eyebrow,
      color: t.colors.textSecondary,
      marginTop: spacing.sm,
    },
    title: {
      ...text.display,
      color: t.colors.text,
      marginTop: spacing.xs,
    },
    subtitle: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.textSecondary,
      marginTop: spacing.xs,
    },
    progress: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    progressText: {
      ...text.body,
      color: t.colors.textSecondary,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      gap: spacing.lg,
    },
    park: {
      gap: spacing.md - 4,
    },
    parkName: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    land: {
      gap: spacing.sm,
    },
    landName: {
      ...text.labelCaps,
      color: t.colors.textSecondary,
    },
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      overflow: "hidden",
    },
    attractionName: {
      ...text.meta,
      color: t.colors.textSecondary,
      paddingHorizontal: spacing.md - 2,
      paddingTop: spacing.sm,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    entry: {
      flex: 1,
    },
    removeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm + 2,
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.controlBorder,
    },
    secondaryButtonText: {
      ...text.chip,
      color: t.colors.text,
    },
    pressed: {
      opacity: 0.85,
    },
  });
