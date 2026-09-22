import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, Switch } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { getAllEntries, getEntryById } from "../data/query";
import { getDestinationSummaries } from "../data/destinations";
import { labelOrFallback } from "../data/labels";
import { progressShareText, shareText } from "../lib/share";
import { backupToText } from "../lib/backup";
import { exportBackup } from "../store/backup";
import { confirm, notify } from "../lib/notify";
import { useFoundStore } from "../store/useFoundStore";
import { useAchievementsStore, getAchievements, Achievement } from "../store/useAchievementsStore";
import { useSettingsStore, Appearance } from "../store/useSettingsStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import PageHeader from "../components/layout/PageHeader";
import ProgressRing from "../components/ui/ProgressRing";
import Chip from "../components/ui/Chip";
import Badge from "../components/ui/Badge";
import AchievementSheet from "../components/AchievementSheet";
import Disclaimer from "../components/Disclaimer";

const APPEARANCE_OPTIONS: { value: Appearance; label: string }[] = [
  { value: "system", label: "System" },
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();

  const found = useFoundStore((s) => s.found);
  const clearAll = useFoundStore((s) => s.clearAll);
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const seen = useAchievementsStore((s) => s.seen);
  const earnedAt = useAchievementsStore((s) => s.earnedAt);
  const markSeen = useAchievementsStore((s) => s.markSeen);
  const appearance = useSettingsStore((s) => s.appearance);
  const hintMode = useSettingsStore((s) => s.hintMode);
  const setHintMode = useSettingsStore((s) => s.setHintMode);

  const achievements = useMemo(() => getAchievements(), []);
  const unseen = useMemo(() => new Set(unlocked.filter((id) => !seen.includes(id))), [unlocked, seen]);
  const [selected, setSelected] = useState<Achievement | undefined>();

  // "New" dots stay while you look; they clear once you leave the tab.
  useFocusEffect(
    useCallback(() => {
      return () => markSeen();
    }, [markSeen])
  );

  const openBadge = (achievement: Achievement) => {
    setSelected(achievement);
    if (unseen.has(achievement.id)) markSeen([achievement.id]);
  };
  const setAppearance = useSettingsStore((s) => s.setAppearance);

  const entries = useMemo(() => getAllEntries(), []);
  const total = entries.length;
  const foundCount = entries.filter((e) => e.id in found).length;
  const progress = total > 0 ? foundCount / total : 0;

  const latest = useMemo(() => {
    let best: { id: string; at: number } | undefined;
    for (const [id, at] of Object.entries(found)) {
      if (getEntryById(id) && (!best || at > best.at)) best = { id, at };
    }
    return best ? getEntryById(best.id) : undefined;
  }, [found]);

  const parks = useMemo(() => getDestinationSummaries().filter((d) => d.count > 0), []);
  const foundByPark = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      if (entry.id in found) map.set(entry.parkId, (map.get(entry.parkId) ?? 0) + 1);
    }
    return map;
  }, [entries, found]);

  const handleShare = async () => {
    const byPark = parks.map((p) => ({ name: p.name, found: foundByPark.get(p.parkId) ?? 0, total: p.count }));
    const outcome = await shareText(progressShareText(foundCount, total, byPark, unlocked.length));
    if (outcome === "copied") notify("Copied", "Your progress is on the clipboard.");
    else if (outcome === "unavailable") notify("Couldn't share", "Sharing isn't available here.");
  };

  const handleExport = async () => {
    const outcome = await shareText(backupToText(exportBackup()), "Three Little Circles backup");
    if (outcome === "copied") notify("Copied", "Your backup is on the clipboard. Paste it somewhere you can reach from your other phone.");
    else if (outcome === "unavailable") notify("Couldn't share", "Sharing isn't available here.");
  };

  const handleReset = () => {
    confirm("Reset progress", "Clear all your found marks? This cannot be undone.", clearAll, "Clear");
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader title="Profile" subtitle="What you've noticed." />

        <View style={styles.body}>
          <View style={styles.hero}>
            <View style={styles.ringWrap}>
              <ProgressRing progress={progress} size={100} strokeWidth={10} />
              <View style={styles.ringCenter}>
                <Text style={styles.ringPct}>{Math.round(progress * 100)}%</Text>
                <Text style={styles.ringLabel}>complete</Text>
              </View>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroCount}>
                {foundCount} of {total}
              </Text>
              <Text style={styles.heroCaption}>hidden details found</Text>
              {latest && (
                <View style={styles.latest}>
                  <Text style={styles.latestLabel}>Latest find</Text>
                  <Text style={styles.latestValue} numberOfLines={2}>
                    {labelOrFallback(latest.display?.entryTitle, "Hidden Find")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => handleShare().catch(() => {})}
            accessibilityRole="button"
            style={({ pressed }) => [styles.shareButton, pressed && styles.badgePressed]}
          >
            <Ionicons name="share-outline" size={20} color={t.colors.text} />
            <Text style={styles.shareButtonText}>Share progress</Text>
          </Pressable>

          <Section title="By park">
            <View style={styles.listCard}>
              {parks.map((park, index) => {
                const palette = t.parks[park.parkKey];
                const parkFound = foundByPark.get(park.parkId) ?? 0;
                return (
                  <React.Fragment key={park.parkId}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.parkRow}>
                      <View style={[styles.dot, { backgroundColor: palette.accent }]} />
                      <Text style={styles.parkName} numberOfLines={1}>
                        {park.name}
                      </Text>
                      <Text style={styles.parkMeta}>
                        {parkFound} / {park.count}
                      </Text>
                      <ProgressRing progress={parkFound / park.count} size={24} strokeWidth={4} color={palette.accent} />
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </Section>

          <Section title="Badges">
            <View style={styles.grid}>
              {achievements.map((achievement) => {
                const earned = unlocked.includes(achievement.id);
                return (
                  <Pressable
                    key={achievement.id}
                    onPress={() => openBadge(achievement)}
                    accessibilityRole="button"
                    accessibilityLabel={`${achievement.title}, ${earned ? "unlocked" : "locked"}`}
                    style={({ pressed }) => [styles.badge, pressed && styles.badgePressed]}
                  >
                    <Badge achievement={achievement} earned={earned} isNew={unseen.has(achievement.id)} />
                    <Text style={[styles.badgeTitle, earned && styles.badgeTitleEarned]} numberOfLines={2}>
                      {achievement.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Appearance">
            <View style={styles.chipRow}>
              {APPEARANCE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={appearance === option.value}
                  onPress={() => setAppearance(option.value)}
                />
              ))}
            </View>
            <Text style={styles.caption}>System follows your device setting.</Text>
          </Section>

          <Section title="Hunting">
            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Hints one at a time</Text>
                <Text style={styles.caption}>
                  Where-to-look opens a step per tap and the full note waits for the last hint. Off shows everything at
                  once.
                </Text>
              </View>
              <Switch
                value={hintMode}
                onValueChange={setHintMode}
                trackColor={{ false: t.colors.track, true: t.colors.primary }}
                thumbColor={t.colors.surface}
                accessibilityLabel="Hints one at a time"
              />
            </View>
          </Section>

          <Section title="Backup">
            <View style={styles.aboutCard}>
              <Text style={styles.communityBody}>
                Moving to a new phone? Export makes a message to send yourself. Import reads it back, and shows what's in
                it before anything changes.
              </Text>
              <View style={styles.backupRow}>
                <Pressable
                  onPress={() => handleExport().catch(() => {})}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.suggestButton, pressed && styles.badgePressed]}
                >
                  <Ionicons name="arrow-up-circle-outline" size={20} color={t.colors.onInk} />
                  <Text style={styles.suggestButtonText}>Export</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate("ImportProgress")}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.backupSecondary, pressed && styles.badgePressed]}
                >
                  <Ionicons name="arrow-down-circle-outline" size={20} color={t.colors.text} />
                  <Text style={styles.backupSecondaryText}>Import</Text>
                </Pressable>
              </View>
            </View>
          </Section>

          <Section title="Community">
            <View style={styles.aboutCard}>
              <Text style={styles.communityBody}>
                Spotted a Hidden Mickey we don't have? Send it in and a person will check it before it's added.
              </Text>
              <Pressable
                onPress={() => navigation.navigate("SubmitSighting", undefined)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.suggestButton, pressed && styles.badgePressed]}
              >
                <Ionicons name="add-circle-outline" size={20} color={t.colors.onInk} />
                <Text style={styles.suggestButtonText}>Suggest a find</Text>
              </Pressable>
            </View>
          </Section>

          <Section title="About">
            <View style={styles.aboutCard}>
              <Disclaimer />
            </View>
            {foundCount > 0 && (
              <Pressable onPress={handleReset} accessibilityRole="button" style={styles.resetButton}>
                <Text style={styles.resetText}>Reset found progress</Text>
              </Pressable>
            )}
          </Section>
        </View>
      </ScrollView>

      <AchievementSheet
        achievement={selected}
        earnedAt={selected ? earnedAt[selected.id] : undefined}
        onClose={() => setSelected(undefined)}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
      paddingBottom: spacing.xl,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      gap: spacing.md,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    ringWrap: {
      width: 100,
      height: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    ringCenter: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    ringPct: {
      ...text.title,
      color: t.colors.text,
    },
    ringLabel: {
      ...text.labelCaps,
      color: t.colors.textMuted,
    },
    heroText: {
      flex: 1,
      gap: spacing.sm,
    },
    heroCount: {
      ...text.title,
      color: t.colors.text,
    },
    heroCaption: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
      marginTop: -spacing.sm + 2,
    },
    latest: {
      gap: 2,
    },
    latestLabel: {
      ...text.labelCaps,
      color: t.colors.textMuted,
    },
    latestValue: {
      ...text.meta,
      color: t.colors.text,
    },
    section: {
      gap: spacing.sm,
    },
    backupRow: {
      flexDirection: "row",
      gap: spacing.sm + 2,
    },
    backupSecondary: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm - 2,
      height: 44,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
      marginTop: spacing.sm,
    },
    backupSecondaryText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.text,
    },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      height: 44,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    shareButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.text,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    settingText: {
      flex: 1,
      gap: 2,
    },
    settingTitle: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    sectionTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    listCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md - 2,
    },
    parkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
      height: 52,
    },
    divider: {
      height: 1,
      backgroundColor: t.colors.border,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    parkName: {
      flex: 1,
      ...text.itemTitle,
      color: t.colors.text,
    },
    parkMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    badge: {
      width: "31%",
      flexGrow: 1,
      alignItems: "center",
      gap: spacing.sm - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.xs + 2,
    },
    badgePressed: {
      opacity: 0.85,
    },
    badgeTitle: {
      ...text.labelCaps,
      textTransform: "none",
      letterSpacing: 0,
      fontSize: 11,
      lineHeight: 14,
      color: t.colors.textMuted,
      textAlign: "center",
    },
    badgeTitleEarned: {
      color: t.colors.text,
    },
    chipRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    caption: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
    aboutCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm + 2,
    },
    communityBody: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    suggestButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.sm - 2,
      height: 44,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    suggestButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    resetButton: {
      alignSelf: "flex-start",
      height: 44,
      paddingHorizontal: spacing.md + 4,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: t.colors.error,
      alignItems: "center",
      justifyContent: "center",
    },
    resetText: {
      ...text.chip,
      color: t.colors.error,
    },
  });
