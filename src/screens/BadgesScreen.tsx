import React, { ReactNode, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Achievement,
  closestToEarning,
  getAchievements,
  useAchievementsStore,
  useBadgeProgress,
} from "../store/useAchievementsStore";
import { challengeAchievementId, countUnreachableAchievements } from "../data/achievements";
import { challengeStatus, ChallengeStatus, getChallenges } from "../data/challenges";
import { Challenge } from "../data/types";
import { useChallengeProgress } from "../store/useChallengeProgress";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import Badge from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import BadgeProgressRow from "../components/BadgeProgressRow";
import AchievementSheet from "../components/AchievementSheet";
import ChallengeCard from "../components/ChallengeCard";

const CLOSEST_COUNT = 6;

function shortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Tab = "badges" | "challenges";
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Two tabs. Badges: earned (newest first), the ones closest to earning with a
 * bar each, and everything else as slim rows. Challenges: every themed hunt,
 * in progress first.
 */
export default function BadgesScreen() {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, "Badges">>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? "badges");

  const unlocked = useAchievementsStore((s) => s.unlocked);
  const seen = useAchievementsStore((s) => s.seen);
  const earnedAt = useAchievementsStore((s) => s.earnedAt);
  const markSeen = useAchievementsStore((s) => s.markSeen);
  const progress = useBadgeProgress();

  const achievements = useMemo(() => getAchievements(), []);
  const hiddenBadges = useMemo(() => countUnreachableAchievements(), []);
  const [selected, setSelected] = useState<Achievement | undefined>();

  const { earned, closest, restSkills, restParks, restChallenges, unseen } = useMemo(() => {
    const have = new Set(unlocked);
    const byId = new Map(achievements.map((a) => [a.id, a]));
    const closestIds = closestToEarning(progress, unlocked, CLOSEST_COUNT);
    const inClosest = new Set(closestIds);
    const rest = achievements.filter((a) => !have.has(a.id) && !inClosest.has(a.id));
    return {
      earned: achievements
        .filter((a) => have.has(a.id))
        .sort((a, b) => (earnedAt[b.id] ?? 0) - (earnedAt[a.id] ?? 0)),
      closest: closestIds.map((id) => byId.get(id)).filter((a): a is Achievement => !!a),
      restSkills: rest.filter((a) => a.kind === "milestone" || a.kind === "skill"),
      restParks: rest.filter((a) => a.kind === "park"),
      restChallenges: rest.filter((a) => a.kind === "challenge"),
      unseen: new Set(unlocked.filter((id) => !seen.includes(id))),
    };
  }, [achievements, progress, unlocked, seen, earnedAt]);

  // A challenge badge opens its challenge, which says far more than the sheet.
  const openBadge = (achievement: Achievement) => {
    if (unseen.has(achievement.id)) markSeen([achievement.id]);
    if (achievement.challengeId) navigation.navigate("ChallengeDetail", { challengeId: achievement.challengeId });
    else setSelected(achievement);
  };

  const share = achievements.length > 0 ? earned.length / achievements.length : 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Sunburst center={{ x: 195, y: -200 + insets.top }} />
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={t.colors.text} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            Badges
          </Text>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(["badges", "challenges"] as const).map((value) => {
            const selectedTab = tab === value;
            return (
              <Pressable
                key={value}
                onPress={() => setTab(value)}
                accessibilityRole="tab"
                accessibilityState={{ selected: selectedTab }}
                style={[styles.tab, selectedTab && styles.tabSelected]}
              >
                <Text style={[styles.tabLabel, selectedTab && styles.tabLabelSelected]}>
                  {value === "badges" ? "Badges" : "Challenges"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "challenges" ? (
          <ChallengesTab
            unlocked={unlocked}
            onOpen={(challenge) => navigation.navigate("ChallengeDetail", { challengeId: challenge.id })}
          />
        ) : (
          <View style={styles.body}>
            <View
              style={styles.summary}
              accessible
              accessibilityLabel={`${earned.length} of ${achievements.length} badges earned`}
            >
              <View style={styles.summaryRow}>
                <Text style={styles.summaryCount}>
                  {earned.length} of {achievements.length} earned
                </Text>
                <Text style={styles.summaryPct}>{Math.round(share * 100)}%</Text>
              </View>
              <ProgressBar progress={share} height={10} />
              {hiddenBadges > 0 && (
                <Text style={styles.caption}>
                  {hiddenBadges} more badge{hiddenBadges === 1 ? "" : "s"} unlock as the guide grows.
                </Text>
              )}
            </View>

            <Section title="Earned" note={earned.length > 1 ? "Newest first" : undefined}>
              {earned.length === 0 ? (
                <Text style={styles.empty}>Mark your first find and your first badge is yours.</Text>
              ) : (
                <View style={styles.grid}>
                  {earned.map((achievement) => {
                    const at = earnedAt[achievement.id];
                    const isNew = unseen.has(achievement.id);
                    return (
                      <Pressable
                        key={achievement.id}
                        onPress={() => openBadge(achievement)}
                        accessibilityRole="button"
                        accessibilityLabel={[achievement.title, at ? `earned ${shortDate(at)}` : "earned", isNew ? "new" : undefined]
                          .filter(Boolean)
                          .join(", ")}
                        style={({ pressed }) => [styles.earnedCell, pressed && styles.pressed]}
                      >
                        <Badge achievement={achievement} earned isNew={isNew} />
                        <Text style={styles.earnedTitle} numberOfLines={2}>
                          {achievement.title}
                        </Text>
                        {at !== undefined && <Text style={styles.earnedDate}>{shortDate(at)}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Section>

            {closest.length > 0 && (
              <Section title="Closest to earning" note="Most progress first">
                <View style={styles.stack}>
                  {closest.map((achievement) => (
                    <BadgeProgressRow
                      key={achievement.id}
                      achievement={achievement}
                      progress={progress[achievement.id]}
                      onPress={() => openBadge(achievement)}
                    />
                  ))}
                </View>
              </Section>
            )}

            {restSkills.length + restParks.length + restChallenges.length > 0 && (
              <Section title="More to earn">
                <RestGroup label="Skills" list={restSkills} progress={progress} onPress={openBadge} />
                <RestGroup label="Parks" list={restParks} progress={progress} onPress={openBadge} />
                <RestGroup label="Challenges" list={restChallenges} progress={progress} onPress={openBadge} />
              </Section>
            )}
          </View>
        )}
      </ScrollView>

      <AchievementSheet
        achievement={selected}
        earnedAt={selected ? earnedAt[selected.id] : undefined}
        earned={selected ? unlocked.includes(selected.id) : false}
        progress={selected ? progress[selected.id] : undefined}
        onClose={() => setSelected(undefined)}
      />
    </View>
  );
}

const STATUS_SECTIONS: { status: ChallengeStatus; title: string }[] = [
  { status: "inProgress", title: "In progress" },
  { status: "notStarted", title: "Not started" },
  { status: "complete", title: "Complete" },
];

function ChallengesTab({ unlocked, onOpen }: { unlocked: string[]; onOpen: (challenge: Challenge) => void }) {
  const styles = useStyles(createStyles);
  const progress = useChallengeProgress();
  const challenges = useMemo(() => getChallenges(), []);

  const byStatus = useMemo(() => {
    const groups = new Map<ChallengeStatus, Challenge[]>();
    for (const challenge of challenges) {
      const status = challengeStatus(progress[challenge.id], unlocked.includes(challengeAchievementId(challenge.id)));
      groups.set(status, [...(groups.get(status) ?? []), challenge]);
    }
    // Closest to done first within "In progress".
    groups.get("inProgress")?.sort((a, b) => progress[b.id].fraction - progress[a.id].fraction);
    return groups;
  }, [challenges, progress, unlocked]);

  if (challenges.length === 0) {
    return (
      <View style={styles.body}>
        <Text style={styles.empty}>Challenges arrive with a guide update.</Text>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={styles.intro}>
        Themed hunts with a badge at the end. Every find you mark counts toward any challenge it belongs to.
      </Text>
      {STATUS_SECTIONS.map(({ status, title }) => {
        const list = byStatus.get(status) ?? [];
        if (list.length === 0) return null;
        return (
          <Section key={status} title={title}>
            <View style={styles.stack}>
              {list.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  progress={progress[challenge.id]}
                  status={status}
                  onPress={() => onOpen(challenge)}
                />
              ))}
            </View>
          </Section>
        );
      })}
    </View>
  );
}

function RestGroup({
  label,
  list,
  progress,
  onPress,
}: {
  label: string;
  list: Achievement[];
  progress: ReturnType<typeof useBadgeProgress>;
  onPress: (achievement: Achievement) => void;
}) {
  const styles = useStyles(createStyles);
  if (list.length === 0) return null;
  return (
    <View style={styles.restGroup}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.listCard}>
        {list.map((achievement, index) => (
          <React.Fragment key={achievement.id}>
            {index > 0 && <View style={styles.divider} />}
            <BadgeProgressRow
              achievement={achievement}
              progress={progress[achievement.id]}
              onPress={() => onPress(achievement)}
              compact
            />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {note && <Text style={styles.sectionNote}>{note}</Text>}
      </View>
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
    title: {
      ...text.display,
      color: t.colors.text,
      marginTop: spacing.xs,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.lg,
    },
    tabs: {
      flexDirection: "row",
      gap: spacing.xs,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      padding: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: t.colors.backgroundSecondary,
    },
    tab: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.full,
    },
    tabSelected: {
      backgroundColor: t.colors.ink,
    },
    tabLabel: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.text,
    },
    tabLabelSelected: {
      color: t.colors.onInk,
    },
    intro: {
      ...text.body,
      color: t.colors.textSecondary,
    },
    summary: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    summaryCount: {
      ...text.sectionTitle,
      flex: 1,
      color: t.colors.text,
    },
    summaryPct: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    caption: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
    section: {
      gap: spacing.sm + 2,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    sectionTitle: {
      ...text.sectionTitle,
      flex: 1,
      color: t.colors.text,
    },
    sectionNote: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    empty: {
      ...text.body,
      color: t.colors.textSecondary,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      paddingVertical: spacing.sm,
    },
    earnedCell: {
      width: "25%",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: 2,
    },
    earnedTitle: {
      ...text.labelCaps,
      textTransform: "none",
      letterSpacing: 0,
      fontSize: 12,
      lineHeight: 15,
      color: t.colors.text,
      textAlign: "center",
    },
    earnedDate: {
      ...text.labelCaps,
      textTransform: "none",
      letterSpacing: 0,
      color: t.colors.textSecondary,
    },
    pressed: {
      opacity: 0.85,
    },
    stack: {
      gap: spacing.sm + 2,
    },
    restGroup: {
      gap: spacing.sm,
    },
    groupLabel: {
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
  });
