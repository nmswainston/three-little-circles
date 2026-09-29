import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { challengeEntries, getChallenge, sharedParkId } from "../data/challenges";
import { useFoundStore } from "../store/useFoundStore";
import ChallengeMapBanner from "../components/ChallengeMapBanner";
import { View, Text, StyleSheet, SectionList, SectionListData, SectionListRenderItem } from "react-native";
import { getAllEntries, getParksSummary } from "../data/query";
import { HiddenMickeyEntry } from "../data/types";
import { Theme, useStyles } from "../theme/ThemeProvider";
import { spacing, text } from "../theme/tokens";
import PageHeader from "../components/layout/PageHeader";
import ParkPicker from "../components/ParkPicker";
import EntryCard from "../components/EntryCard";
import EmptyState from "../components/ui/EmptyState";

const entryKey = (entry: HiddenMickeyEntry) => entry.id;

type ParkSection = { parkId: string; parkName: string; data: HiddenMickeyEntry[] };

/**
 * Web build: react-native-maps has no web renderer, so this screen shows the
 * same filtered entries as a list, grouped by park. Native builds use MapScreen.tsx.
 */
export default function MapScreen() {
  const styles = useStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Map">>();
  const found = useFoundStore((s) => s.found);
  const parks = useMemo(() => getParksSummary(), []);
  const [selectedParkId, setSelectedParkId] = useState<string | undefined>(undefined);

  // Same challenge filter as the native map, over the list.
  const challengeId = route.params?.challengeId;
  const challenge = challengeId ? getChallenge(challengeId) : undefined;
  const challengeIds = useMemo(
    () => (challenge ? new Set(challengeEntries(challenge).map((e) => e.id)) : undefined),
    [challenge]
  );
  useEffect(() => {
    if (challenge) setSelectedParkId(sharedParkId(challengeEntries(challenge)));
  }, [challenge]);
  const handleSelectPark = (parkId: string | undefined) => {
    navigation.setParams({ challengeId: undefined });
    setSelectedParkId(parkId);
  };

  const sections = useMemo<ParkSection[]>(() => {
    const byPark = new Map<string, HiddenMickeyEntry[]>();
    for (const entry of getAllEntries()) {
      if (selectedParkId && entry.parkId !== selectedParkId) continue;
      if (challengeIds && !challengeIds.has(entry.id)) continue;
      const list = byPark.get(entry.parkId);
      if (list) list.push(entry);
      else byPark.set(entry.parkId, [entry]);
    }
    return parks.flatMap((park) => {
      const data = byPark.get(park.parkId);
      return data ? [{ parkId: park.parkId, parkName: park.parkName, data }] : [];
    });
  }, [parks, selectedParkId, challengeIds]);
  const shown = sections.flatMap((s) => s.data);

  const renderEntry = useCallback<SectionListRenderItem<HiddenMickeyEntry, ParkSection>>(
    ({ item }) => <EntryCard entry={item} showLocation />,
    []
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<HiddenMickeyEntry, ParkSection> }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {section.parkName}
        </Text>
        <Text style={styles.sectionMeta}>
          {section.data.length} {section.data.length === 1 ? "find" : "finds"}
        </Text>
      </View>
    ),
    [styles]
  );

  return (
    <View style={styles.screen}>
      <PageHeader title="Map" subtitle="Sightlines and queues." />
      <ParkPicker parks={parks} selectedParkId={selectedParkId} onSelect={handleSelectPark} />
      {challenge && (
        <ChallengeMapBanner
          challenge={challenge}
          total={shown.length}
          found={shown.filter((e) => e.id in found).length}
          onClear={() => navigation.setParams({ challengeId: undefined })}
        />
      )}
      <SectionList
        sections={sections}
        keyExtractor={entryKey}
        renderItem={renderEntry}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={styles.caption}>The interactive map is available in the mobile app. Everything is listed here.</Text>
        }
        ListEmptyComponent={<EmptyState title="Nothing here yet" message="No entries match this filter." />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
      />
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xl,
      gap: spacing.sm + 2,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingTop: spacing.md,
    },
    sectionTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
      flexShrink: 1,
    },
    sectionMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    caption: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
  });
