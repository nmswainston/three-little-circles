import React, { useMemo } from "react";
import { Text, StyleSheet, ScrollView, View, Pressable, Alert, Platform } from "react-native";
import { getAllEntries } from "../data/query";
import { labelOrFallback } from "../data/labels";
import { useFoundStore } from "../store/useFoundStore";
import { useAchievementsStore, ACHIEVEMENTS } from "../store/useAchievementsStore";
import { groupProgress, summarize, percent, ProgressGroup } from "../utils/progress";
import AppShell from "../components/layout/AppShell";
import Section from "../components/layout/Section";
import { colors, spacing, radii, typography } from "../theme/tokens";

function byName(a: ProgressGroup, b: ProgressGroup) {
  return a.name.localeCompare(b.name);
}

export default function ProfileScreen() {
  const found = useFoundStore((s) => s.found);
  const clearAll = useFoundStore((s) => s.clearAll);
  const unlocked = useAchievementsStore((s) => s.unlocked);

  const entries = useMemo(() => getAllEntries(), []);
  const isFound = useMemo(() => (id: string) => id in found, [found]);

  const overall = useMemo(() => summarize(entries, isFound), [entries, isFound]);

  const parkProgress = useMemo(
    () =>
      groupProgress(entries, isFound, (e) => ({
        key: e.parkId,
        name: labelOrFallback(e.display?.parkName, e.parkId),
      })).sort(byName),
    [entries, isFound]
  );

  const landProgress = useMemo(
    () =>
      groupProgress(entries, isFound, (e) => ({
        key: `${e.parkId}/${e.landId}`,
        name: `${labelOrFallback(e.display?.landName, e.landId)} (${labelOrFallback(e.display?.parkName, e.parkId)})`,
      })).sort(byName),
    [entries, isFound]
  );

  const attractionProgress = useMemo(
    () =>
      groupProgress(entries, isFound, (e) => ({
        key: `${e.parkId}/${e.landId}/${e.attractionId}`,
        name: labelOrFallback(e.display?.attractionName, e.attractionId),
      })).sort(byName),
    [entries, isFound]
  );

  const handleReset = () => {
    const confirmAndClear = () => clearAll();
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Clear all your found marks? This cannot be undone.")) {
        confirmAndClear();
      }
      return;
    }
    Alert.alert("Reset progress", "Clear all your found marks? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: confirmAndClear },
    ]);
  };

  return (
    <AppShell title="Profile" subtitle="What you've noticed">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Section title="Progress" description={`${overall.found} of ${overall.total} documented`}>
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <Stat value={overall.found} label="Found" />
              <View style={styles.statDivider} />
              <Stat value={overall.total} label="Total" />
              <View style={styles.statDivider} />
              <Stat value={`${Math.round(percent(overall))}%`} label="Complete" />
            </View>
            <ProgressBar pct={percent(overall)} />
          </View>
        </Section>

        <ProgressSection title="By Park" description="See how close you are in each park" groups={parkProgress} />
        <ProgressSection title="By Land" description="Zoom in on specific areas" groups={landProgress} />
        <ProgressSection title="By Attraction" description="Track progress by ride or attraction" groups={attractionProgress} />

        <Section title="Achievements" description="Little milestones as you explore">
          <View style={styles.listCard}>
            {ACHIEVEMENTS.map((achievement) => {
              const earned = unlocked.includes(achievement.id);
              return (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementText}>
                    <Text style={[styles.achievementTitle, earned && styles.achievementTitleUnlocked]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  </View>
                  <View style={[styles.badge, earned ? styles.badgeUnlocked : styles.badgeLocked]}>
                    <Text style={[styles.badgeText, earned && styles.badgeTextUnlocked]}>
                      {earned ? "Unlocked" : "Locked"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>

        <Section title="About" description="">
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              Unofficial fan-created guide. Not affiliated with or endorsed by any theme park company.
            </Text>
          </View>
          {overall.found > 0 && (
            <Pressable onPress={handleReset} style={styles.resetButton} accessibilityRole="button">
              <Text style={styles.resetText}>Reset found progress</Text>
            </Pressable>
          )}
        </Section>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </AppShell>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

function ProgressSection({
  title,
  description,
  groups,
}: {
  title: string;
  description: string;
  groups: ProgressGroup[];
}) {
  return (
    <Section title={title} description={description}>
      <View style={styles.listCard}>
        {groups.length > 0 ? (
          groups.map((g) => (
            <View key={g.key} style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle} numberOfLines={1}>
                  {g.name}
                </Text>
                <Text style={styles.listItemMeta}>
                  {g.found} / {g.total}
                </Text>
              </View>
              <ProgressBar pct={g.pct} />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Nothing documented yet</Text>
        )}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: radii.full,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  listItem: {
    gap: spacing.xs,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  listItemTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  listItemMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  achievementTitleUnlocked: {
    color: colors.success,
  },
  achievementDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  badgeUnlocked: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  badgeLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  badgeTextUnlocked: {
    color: colors.success,
  },
  disclaimerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  disclaimerText: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
  resetButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  resetText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.error,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    padding: spacing.md,
  },
});
