import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, RootTabParamList } from "../navigation/types";
import { challengeGroups, challengeStatus, getChallenge, goalSentence, progressUnit } from "../data/challenges";
import { challengeAchievementId, getAchievement } from "../data/achievements";
import { getDestination } from "../data/destinations";
import { labelOrFallback } from "../data/labels";
import { useAchievementsStore } from "../store/useAchievementsStore";
import { useChallengeProgress } from "../store/useChallengeProgress";
import { useFoundStore } from "../store/useFoundStore";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import ProgressRing from "../components/ui/ProgressRing";
import { MAX_SCALE, useScaledSize } from "../lib/useScaledSize";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import EntryRow from "../components/EntryRow";
import { challengeAccent } from "../components/ChallengeCard";

type IconName = keyof typeof Ionicons.glyphMap;
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

function longDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

/**
 * One challenge: what it is, how far along, and every place it covers with a
 * dot per find. Tapping a place opens its finds.
 */
export default function ChallengeDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ChallengeDetail">>();
  const navigation = useNavigation<NavigationProp>();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const ringSize = useScaledSize(76);
  const insets = useSafeAreaInsets();

  const challenge = getChallenge(route.params.challengeId);
  const allProgress = useChallengeProgress();
  const found = useFoundStore((s) => s.found);
  const badgeId = challenge ? challengeAchievementId(challenge.id) : "";
  const earned = useAchievementsStore((s) => s.unlocked.includes(badgeId));
  const earnedAt = useAchievementsStore((s) => s.earnedAt[badgeId]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Attraction targets group under their land; lands, parks, and single finds
  // are already places, so they share one untitled section.
  const sections = useMemo(() => {
    if (!challenge) return [];
    const list: { title?: string; groups: ReturnType<typeof challengeGroups> }[] = [];
    challenge.targets.forEach((target) => {
      const group = challengeGroups({ ...challenge, targets: [target] })[0];
      const title =
        "attraction" in target ? labelOrFallback(group.entries[0]?.display?.landName, group.key.split("/")[1]) : undefined;
      const existing = list.find((s) => s.title === title);
      if (existing) existing.groups.push(group);
      else list.push({ title, groups: [group] });
    });
    return list;
  }, [challenge]);

  if (!challenge) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
        <EmptyState title="Challenge not found" message="It may have been retired in an update." />
      </View>
    );
  }

  const progress = allProgress[challenge.id];
  const status = challengeStatus(progress, earned);
  const done = status === "complete";
  const palette = challengeAccent(t, challenge);
  const parkName = challenge.parkId ? getDestination(challenge.parkId)?.name : undefined;
  const badge = getAchievement(badgeId);

  const headerBg = t.dark ? t.colors.surface : palette.accent;
  const headerText = t.dark ? palette.accent : palette.onAccent;
  const headerMuted = t.dark ? t.colors.textSecondary : palette.onAccent;

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + spacing.sm }]}>
          <Sunburst
            color={t.dark ? palette.accent : palette.onAccent}
            opacity={t.dark ? 0.08 : 0.14}
            center={{ x: 195, y: -190 + insets.top }}
          />
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={headerText} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: headerMuted }]}>
            {parkName ? `${parkName} · Challenge` : "Challenge"}
          </Text>
          <Text style={[styles.title, { color: headerText }]} accessibilityRole="header">
            {challenge.title}
          </Text>
          <Text style={[styles.blurb, { color: headerMuted }]}>{challenge.blurb}</Text>
        </View>

        <View style={styles.body}>
          <View
            style={styles.summary}
            accessible
            accessibilityLabel={[
              done ? "Challenge complete" : `${progress.current} of ${progress.goal} ${progressUnit(challenge)}`,
              done ? undefined : `${progress.remaining} to go`,
              !done && progress.focus ? `Next: ${progress.focus.name}` : undefined,
            ]
              .filter(Boolean)
              .join(", ")}
          >
            <View style={[styles.ringWrap, { width: ringSize, height: ringSize }]}>
              <ProgressRing progress={done ? 1 : progress.fraction} size={ringSize} strokeWidth={8} color={palette.accent} />
              <View style={styles.ringCenter}>
                <Text style={styles.ringCount} maxFontSizeMultiplier={MAX_SCALE}>
                  {progress.current}
                </Text>
                <Text style={styles.ringOf} maxFontSizeMultiplier={MAX_SCALE}>
                  of {progress.goal}
                </Text>
              </View>
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>{done ? "Complete" : `${progress.remaining} to go`}</Text>
              {!done && progress.focus && <Text style={styles.summaryDetail}>Next: {progress.focus.name}</Text>}
              <Text style={styles.summaryDetail}>{goalSentence(challenge)}</Text>
              {badge && (
                <View style={styles.reward}>
                  <Badge achievement={badge} earned={done} inProgress={!done} size={24} />
                  <Text style={[styles.rewardText, { color: palette.text }]}>
                    {done
                      ? earnedAt
                        ? `Badge earned ${longDate(earnedAt)}`
                        : "Badge earned"
                      : `Earns the ${challenge.title} badge`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {sections.map((section, s) => (
            <View key={section.title ?? `places-${s}`} style={styles.section}>
              {section.title && <Text style={styles.sectionLabel}>{section.title}</Text>}
              <View style={styles.listCard}>
                {section.groups.map((group, index) => {
                  const hits = group.entries.filter((e) => e.id in found).length;
                  const groupDone = challenge.goal === "all" ? hits === group.entries.length : hits > 0;
                  const expanded = open.has(group.key);
                  return (
                    <View key={group.key}>
                      {index > 0 && <View style={styles.divider} />}
                      <Pressable
                        onPress={() => toggle(group.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`${group.name}, ${hits} of ${group.entries.length} found${groupDone ? ", done" : ""}`}
                        accessibilityState={{ expanded }}
                        style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}
                      >
                        <View style={styles.placeText}>
                          <Text style={styles.placeName}>{group.name}</Text>
                          <View style={styles.dots}>
                            {group.entries.map((e) => (
                              <View
                                key={e.id}
                                style={[
                                  styles.dot,
                                  e.id in found
                                    ? { backgroundColor: palette.accent }
                                    : { borderWidth: 2, borderColor: palette.accent },
                                ]}
                              />
                            ))}
                          </View>
                        </View>
                        {groupDone ? (
                          <Ionicons name="checkmark-circle" size={22} color={palette.text} />
                        ) : (
                          <Text style={[styles.placeCount, { color: hits > 0 ? palette.text : t.colors.textSecondary }]}>
                            {hits} / {group.entries.length}
                          </Text>
                        )}
                        <Ionicons
                          name={(expanded ? "chevron-up" : "chevron-down") as IconName}
                          size={18}
                          color={t.colors.textSecondary}
                        />
                      </Pressable>
                      {expanded && (
                        <View style={styles.entries}>
                          {group.entries.map((entry) => (
                            <EntryRow
                              key={entry.id}
                              entry={entry}
                              onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => navigation.navigate("MapTab", { screen: "Map", params: { challengeId: challenge.id } })}
            accessibilityRole="button"
            accessibilityLabel="Show these on the map"
            style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
          >
            <Ionicons name="map" size={20} color={t.colors.onPrimary} />
            <Text style={styles.mapButtonText}>Show these on the map</Text>
          </Pressable>
        </View>
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
      paddingBottom: spacing.lg,
      borderBottomLeftRadius: radii.xl,
      borderBottomRightRadius: radii.xl,
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
      marginTop: spacing.sm,
    },
    title: {
      ...text.display,
      marginTop: spacing.xs,
    },
    blurb: {
      ...text.body,
      marginTop: spacing.sm,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.lg,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    ringWrap: {
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
    ringCount: {
      ...text.sectionTitle,
      color: t.colors.text,
    },
    ringOf: {
      ...text.labelCaps,
      textTransform: "none",
      letterSpacing: 0,
      color: t.colors.textSecondary,
    },
    summaryText: {
      flex: 1,
      gap: spacing.xs,
    },
    summaryTitle: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    summaryDetail: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    reward: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    rewardText: {
      ...text.meta,
      flex: 1,
    },
    section: {
      gap: spacing.sm,
    },
    sectionLabel: {
      ...text.eyebrow,
      color: t.colors.textSecondary,
    },
    listCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md - 2,
    },
    divider: {
      height: 1,
      backgroundColor: t.colors.border,
    },
    placeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      minHeight: 60,
      paddingVertical: spacing.sm + 2,
    },
    pressed: {
      opacity: 0.85,
    },
    placeText: {
      flex: 1,
      gap: spacing.sm - 2,
    },
    placeName: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    dots: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    placeCount: {
      ...text.meta,
      fontVariant: ["tabular-nums"],
    },
    mapButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 48,
      borderRadius: radii.full,
      backgroundColor: t.colors.primary,
    },
    mapButtonText: {
      ...text.button,
      fontSize: 15,
      color: t.colors.onPrimary,
    },
    entries: {
      paddingBottom: spacing.sm,
    },
  });
