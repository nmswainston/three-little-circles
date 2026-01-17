import React, { useEffect, useMemo } from 'react';
import { Text, StyleSheet, ScrollView, View } from 'react-native';
import { parks, lands } from '../data/sampleData';
import { useLocationsStore } from '../store/useLocationsStore';
import { useFoundStore } from '../store/useFoundStore';
import { useAchievementsStore, ACHIEVEMENTS } from '../store/useAchievementsStore';
import { groupProgress } from '../utils/progress';
import AppShell from '../components/layout/AppShell';
import Section from '../components/layout/Section';
import { colors, spacing, radii, typography } from '../theme/tokens';
import { Location } from '../types/models';

// Pure function to build progress stats from locations
function buildProgressStats(locations: Location[], isFound: (id: string) => boolean) {
  const totalCount = locations.length;
  const foundCount = locations.filter((loc) => isFound(loc.id)).length;
  const progress = totalCount > 0 ? (foundCount / totalCount) * 100 : 0;
  return { totalCount, foundCount, progress };
}

// Pure function to build park stats using stable parkId
function buildParkStats(locations: Location[], isFound: (id: string) => boolean) {
  const parksProgress = groupProgress(locations, isFound, (l) => l.parkId || undefined);
  
  return Array.from(parksProgress.entries())
    .map(([parkId, stats]) => {
      const park = parks.find((p) => p.id === parkId);
      const pct = stats.total > 0 ? (stats.found / stats.total) * 100 : 0;
      return {
        id: parkId,
        name: park?.name || parkId,
        ...stats,
        pct,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Pure function to build land stats using composite key to prevent cross-park collisions
function buildLandStats(locations: Location[], isFound: (id: string) => boolean) {
  // Use composite key `${parkId}:${landId}` to prevent collisions
  const landsProgress = groupProgress(
    locations,
    isFound,
    (l) => {
      if (!l.parkId || !l.landId) return undefined;
      return `${l.parkId}:${l.landId}`;
    }
  );

  return Array.from(landsProgress.entries())
    .map(([compositeKey, stats]) => {
      // Extract parkId and landId from composite key
      const [parkId, landId] = compositeKey.split(':');
      const land = lands.find((l) => l.id === landId && l.parkId === parkId);
      const park = parks.find((p) => p.id === parkId);
      const pct = stats.total > 0 ? (stats.found / stats.total) * 100 : 0;
      
      // Use composite key as id for React keys, but display the land name
      return {
        id: compositeKey,
        parkId,
        landId,
        name: land?.name || landId,
        parkName: park?.name,
        ...stats,
        pct,
      };
    })
    .sort((a, b) => {
      // Sort by park name first, then land name
      const parkCompare = (a.parkName || '').localeCompare(b.parkName || '');
      if (parkCompare !== 0) return parkCompare;
      return a.name.localeCompare(b.name);
    });
}

export default function ProfileScreen() {
  const locations = useLocationsStore((state) => state.locations);
  const isFound = useFoundStore((state) => state.isFound);
  const isUnlocked = useAchievementsStore((state) => state.isUnlocked);
  const checkAchievements = useAchievementsStore((state) => state.checkAchievements);

  // Build all stats from the same source of truth
  const progressStats = useMemo(
    () => buildProgressStats(locations, isFound),
    [locations, isFound]
  );
  const parkProgressData = useMemo(
    () => buildParkStats(locations, isFound),
    [locations, isFound]
  );
  const landProgressData = useMemo(
    () => buildLandStats(locations, isFound),
    [locations, isFound]
  );

  // Check achievements on mount and when found count changes
  useEffect(() => {
    checkAchievements();
  }, [progressStats.foundCount, checkAchievements]);

  // Attraction and resort progress (for future use)
  const attractionsProgress = groupProgress(locations, isFound, (l) => l.attractionId);
  const resortsProgress = groupProgress(locations, isFound, (l) => l.resortId);

  // Attraction and resort progress (for future use)
  const attractionProgressData = Array.from(attractionsProgress.entries())
    .map(([attractionId, stats]) => {
      const pct = stats.total > 0 ? (stats.found / stats.total) * 100 : 0;
      return {
        id: attractionId,
        name: attractionId,
        ...stats,
        pct,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const resortProgressData = Array.from(resortsProgress.entries())
    .map(([resortId, stats]) => {
      const pct = stats.total > 0 ? (stats.found / stats.total) * 100 : 0;
      return {
        id: resortId,
        name: resortId,
        ...stats,
        pct,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AppShell title="Profile" subtitle="What you've noticed">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Section
          title="Progress"
          description={`${progressStats.foundCount} of ${progressStats.totalCount} documented`}
        >
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progressStats.foundCount}</Text>
                <Text style={styles.statLabel}>Found</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progressStats.totalCount}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(progressStats.progress)}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressStats.progress}%` }]} />
            </View>
          </View>
        </Section>

        <Section
          title="By Park"
          description="See how close you are in each park"
        >
          <View style={styles.listCard}>
            {parkProgressData.length > 0 ? (
              parkProgressData.map((park) => (
                <View key={park.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>{park.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {park.found} / {park.total}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${park.pct}%` }]}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No park data available</Text>
            )}
          </View>
        </Section>

        <Section
          title="By Land"
          description="Zoom in on specific areas"
        >
          <View style={styles.listCard}>
            {landProgressData.length > 0 ? (
              landProgressData.map((land) => (
                <View key={land.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>
                      {land.parkName ? `${land.name} (${land.parkName})` : land.name}
                    </Text>
                    <Text style={styles.listItemMeta}>
                      {land.found} / {land.total}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${land.pct}%` }]}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No land data available</Text>
            )}
          </View>
        </Section>

        {attractionProgressData.length > 0 && (
          <Section
            title="By Attraction"
            description="Track progress by ride or attraction"
          >
            <View style={styles.listCard}>
              {attractionProgressData.map((attraction) => (
                <View key={attraction.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>{attraction.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {attraction.found} / {attraction.total}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${attraction.pct}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        {resortProgressData.length > 0 && (
          <Section
            title="By Resort"
            description="Track progress by resort"
          >
            <View style={styles.listCard}>
              {resortProgressData.map((resort) => (
                <View key={resort.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>{resort.name}</Text>
                    <Text style={styles.listItemMeta}>
                      {resort.found} / {resort.total}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${resort.pct}%` }]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section
          title="Achievements"
          description="Little milestones as you explore"
        >
          <View style={styles.listCard}>
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = isUnlocked(achievement.id);
              return (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementText}>
                    <Text
                      style={[
                        styles.achievementTitle,
                        unlocked && styles.achievementTitleUnlocked,
                      ]}
                    >
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.achievementBadge,
                      unlocked
                        ? styles.achievementBadgeUnlocked
                        : styles.achievementBadgeLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.achievementBadgeText,
                        unlocked && styles.achievementBadgeTextUnlocked,
                      ]}
                    >
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>

        <Section
          title="About"
          description=""
        >
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              Unofficial fan-created guide. Not affiliated with or endorsed by any theme park company.
            </Text>
          </View>
        </Section>
      </ScrollView>
    </AppShell>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
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
    textTransform: 'uppercase',
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
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radii.full,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listItemTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  listItemMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  achievementBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  achievementBadgeUnlocked: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  achievementBadgeLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  achievementBadgeText: {
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  achievementBadgeTextUnlocked: {
    color: colors.success,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
});
