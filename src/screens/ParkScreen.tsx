import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import {
  AttractionGroup,
  LandGroup,
  confirmedFirst,
  getAllEntries,
  getParksSummary,
  groupByLand,
  matchesEntryType,
} from "../data/query";
import { isConfirmed } from "../data/confirmations";
import { getDestination } from "../data/destinations";
import { getFactsForPark } from "../data/facts";
import { labelOrFallback } from "../data/labels";
import { Difficulty } from "../data/types";
import { parkShareText, shareText } from "../lib/share";
import { MAX_SCALE } from "../lib/useScaledSize";
import { notify } from "../lib/notify";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useFoundStore } from "../store/useFoundStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Theme, useParkPalette, useStyles, useTheme } from "../theme/ThemeProvider";
import { parkKeyFor, PARK_ICONS } from "../theme/parks";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import { SegmentedControlOption } from "../components/ui/SegmentedControl";
import ParkFilterSheet, { DIFFICULTIES } from "../components/ParkFilterSheet";
import EmptyState from "../components/ui/EmptyState";
import EntryRow from "../components/EntryRow";
import Chip from "../components/ui/Chip";
import FadingScrollRow from "../components/ui/FadingScrollRow";

type IconName = keyof typeof Ionicons.glyphMap;

/** Facts shown before the "Show more" toggle. */
const FACTS_PREVIEW_COUNT = 3;

type ParkRouteProp = RouteProp<RootStackParamList, "Park">;

// The finds are a virtualized section list: lands are the sections and each
// attraction card, with its rows, is one item. A big park would otherwise
// mount every row on the way in.
type AttractionItem = AttractionGroup & { landId: string };
type LandSection = LandGroup & { data: AttractionItem[] };
const attractionKey = (item: AttractionItem) => `${item.landId}:${item.attractionId}`;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Height of the bar that stays at the top, below the status bar. The bar and
 * the pinned land strip are fixed height, so their text stops scaling at
 * MAX_SCALE, as the progress rings do. Everything in the list keeps scaling.
 */
const TOP_BAR_HEIGHT = 52;

/** A row counts as the one at the top of the list once half of it is on screen. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };
/** Height of the pinned land strip, so a jump lands the first attraction just under it. */
const LAND_HEADER_OFFSET = 52;

export default function ParkScreen() {
  const route = useRoute<ParkRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { parkId } = route.params;

  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const palette = useParkPalette(parkId);
  const parkKey = parkKeyFor(parkId);

  const destination = getDestination(parkId);
  const parkName =
    destination?.name ??
    labelOrFallback(getParksSummary().find((p) => p.parkId === parkId)?.parkName, "Park");

  const [filter, setFilter] = useState<SegmentedControlOption>("All");
  const [difficulties, setDifficulties] = useState<Difficulty[]>(DIFFICULTIES);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const found = useFoundStore((s) => s.found);
  const hideFound = useSettingsStore((s) => s.hideFound);
  const setHideFound = useSettingsStore((s) => s.setHideFound);
  const confirmedOnly = useSettingsStore((s) => s.confirmedOnly);
  const setConfirmedOnly = useSettingsStore((s) => s.setConfirmedOnly);

  const parkEntries = useMemo(() => getAllEntries().filter((e) => e.parkId === parkId), [parkId]);
  const hasFinds = parkEntries.length > 0;
  const foundCount = parkEntries.filter((e) => e.id in found).length;
  const pct = hasFinds ? (foundCount / parkEntries.length) * 100 : 0;

  // The type filter narrows first; hunting mode then drops what's already
  // found, and "Confirmed only" what nobody has checked, so an attraction
  // with nothing left to show disappears entirely.
  const trimmedQuery = query.trim().toLowerCase();
  const typed = useMemo(
    () =>
      parkEntries.filter(
        (e) =>
          matchesEntryType(e, filter) &&
          difficulties.includes(e.difficulty) &&
          (!trimmedQuery ||
            [e.display?.entryTitle, e.display?.attractionName, e.display?.landName].some((v) =>
              v?.toLowerCase().includes(trimmedQuery)
            ))
      ),
    [parkEntries, filter, difficulties, trimmedQuery]
  );
  const visible = useMemo(
    () => typed.filter((e) => (!hideFound || !(e.id in found)) && (!confirmedOnly || isConfirmed(e))),
    [typed, hideFound, confirmedOnly, found]
  );
  const hiddenCount = typed.length - visible.length;
  const groups = useMemo(() => groupByLand(visible), [visible]);
  // Land progress ignores the filters, so "2 of 9" always means the whole land.
  const landProgress = useMemo(() => {
    const progress = new Map<string, { found: number; total: number }>();
    for (const e of parkEntries) {
      const p = progress.get(e.landId) ?? { found: 0, total: 0 };
      p.total++;
      if (e.id in found) p.found++;
      progress.set(e.landId, p);
    }
    return progress;
  }, [parkEntries, found]);
  const difficultyFiltered = difficulties.length < DIFFICULTIES.length;
  const activeCount =
    (filter !== "All" ? 1 : 0) + (difficultyFiltered ? 1 : 0) + (hideFound ? 1 : 0) + (confirmedOnly ? 1 : 0);
  const resetFilters = () => {
    setFilter("All");
    setDifficulties(DIFFICULTIES);
    setHideFound(false);
    setConfirmedOnly(false);
  };
  const allFoundHere = hideFound && typed.length > 0 && typed.every((e) => e.id in found);
  // Within each attraction, the finds most likely to be there come first.
  const sections = useMemo<LandSection[]>(
    () =>
      groups.map((land) => ({
        ...land,
        data: land.attractions.map((a) => ({ ...a, entries: confirmedFirst(a.entries), landId: land.landId })),
      })),
    [groups]
  );

  const listRef = useRef<SectionList<AttractionItem, LandSection>>(null);
  // The land at the top of the list, so its chip can be highlighted. This has
  // to be the onViewableItemsChanged prop, not viewabilityConfigCallbackPairs:
  // SectionList attaches each token's section only on the former, so a pair
  // never sees a landId and the highlight never lights up. The list also
  // refuses a callback that changes between renders, hence the empty deps.
  const [currentLandId, setCurrentLandId] = useState<string | undefined>();
  const chipX = useRef<Record<string, number>>({});
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ section?: { landId?: string } }> }) => {
      setCurrentLandId(viewableItems[0]?.section?.landId);
    },
    []
  );

  const pendingJump = useRef<number | null>(null);
  const jumpToLand = useCallback((sectionIndex: number) => {
    pendingJump.current = sectionIndex;
    listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: LAND_HEADER_OFFSET, animated: true });
  }, []);
  // Rows further down are not measured yet, so scroll toward them first and
  // try again once the list has rendered that far.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const target = pendingJump.current;
      if (target === null) return;
      pendingJump.current = null;
      (listRef.current as unknown as { getScrollResponder: () => { scrollTo: (o: object) => void } | null })
        ?.getScrollResponder()
        ?.scrollTo({ y: info.averageItemLength * info.index, animated: false });
      setTimeout(() => jumpToLand(target), 100);
    },
    [jumpToLand]
  );

  // Park history and trivia. Independent of the finds filter so it does not
  // disappear when a filter empties the list above it.
  const parkFacts = useMemo(() => getFactsForPark(parkId), [parkId]);
  // A park with several facts would otherwise end in a very tall card after
  // an already long list of finds, so show a few and let the reader expand.
  const [showAllFacts, setShowAllFacts] = useState(false);
  const visibleFacts = showAllFacts ? parkFacts : parkFacts.slice(0, FACTS_PREVIEW_COUNT);
  const hiddenFactCount = parkFacts.length - visibleFacts.length;

  const handleShare = async () => {
    const outcome = await shareText(parkShareText({ name: parkName, found: foundCount, total: parkEntries.length }));
    if (outcome === "copied") notify("Copied", "The text is on your clipboard.");
    else if (outcome === "unavailable") notify("Couldn't share", "Sharing isn't available here.");
  };

  // By day the header is the park's solid accent; by night it stays a dark
  // surface and the accent moves into the text so the screen is not blinding.
  const headerBg = t.dark ? t.colors.surface : palette.accent;
  const headerText = t.dark ? palette.accent : t.colors.textOnAccent;
  const headerMuted = t.dark ? t.colors.textSecondary : t.colors.textOnAccent;
  const headerDisc = t.dark ? palette.tint : "rgba(255,244,220,0.18)";
  const track = t.dark ? t.colors.track : "rgba(255,244,220,0.25)";

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<AttractionItem, LandSection> }) => (
      <View style={[styles.rowPad, styles.sectionHeaderWrap]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {section.landName}
            {landProgress.get(section.landId) && (
              <Text style={[styles.landProgress, { color: palette.text }]}>
                {`  ${landProgress.get(section.landId)!.found} of ${landProgress.get(section.landId)!.total}`}
              </Text>
            )}
          </Text>
          <Text style={styles.sectionMeta}>
            {section.attractions.length} {section.attractions.length === 1 ? "attraction" : "attractions"}
          </Text>
        </View>
      </View>
    ),
    [styles, landProgress, palette]
  );

  const renderAttraction = useCallback<SectionListRenderItem<AttractionItem, LandSection>>(
    ({ item }) => (
      <View style={[styles.rowPad, styles.attractionRow]}>
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={[styles.dot, { backgroundColor: palette.accent }]} />
            <Text style={[styles.groupTitle, { color: palette.text }]} accessibilityRole="header">
              {item.attractionName}
            </Text>
          </View>
          {item.entries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {index > 0 && <View style={styles.divider} />}
              <EntryRow entry={entry} onPress={() => navigation.navigate("EntryDetail", { entryId: entry.id })} />
            </React.Fragment>
          ))}
        </View>
      </View>
    ),
    [styles, palette, navigation]
  );

  // The back and share buttons live in a bar that stays put. Once the big
  // header has scrolled up under it, the bar also shows the park name and a
  // thin progress line, so the list gets the screen without losing the way back.
  const reduceMotion = useReducedMotion();
  const [compact, setCompact] = useState(false);
  const headerHeight = useRef(160);
  const compactFade = useRef(new Animated.Value(0)).current;
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > headerHeight.current - 24;
    setCompact((prev) => (prev === next ? prev : next));
  }, []);
  useEffect(() => {
    if (!compact) return;
    compactFade.setValue(reduceMotion ? 1 : 0);
    if (!reduceMotion) Animated.timing(compactFade, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [compact, compactFade, reduceMotion]);

  const topBar = (
    <View style={[styles.topBar, { backgroundColor: headerBg, paddingTop: insets.top }]}>
      <Sunburst
        color={t.dark ? palette.accent : t.colors.textOnAccent}
        opacity={t.dark ? 0.08 : 0.14}
        center={{ x: 195, y: -190 + insets.top }}
      />
      <View style={styles.topBarRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={headerText} />
        </Pressable>
        {compact ? (
          <Animated.View style={[styles.compactTitleWrap, { opacity: compactFade }]}>
            <Text
              style={[styles.compactTitle, { color: headerText }]}
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_SCALE}
              accessibilityRole="header"
            >
              {parkName}
            </Text>
            {hasFinds && (
              <Text style={[styles.compactCount, { color: headerText }]} maxFontSizeMultiplier={MAX_SCALE}>
                {`${foundCount}/${parkEntries.length}`}
              </Text>
            )}
          </Animated.View>
        ) : (
          <View style={styles.compactTitleWrap} />
        )}
        <Pressable
          onPress={() => handleShare().catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel="Share park progress"
          hitSlop={8}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={22} color={headerText} />
        </Pressable>
      </View>
      {compact && hasFinds && (
        <Animated.View style={[styles.compactTrack, { backgroundColor: track, opacity: compactFade }]}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </Animated.View>
      )}
    </View>
  );

  // Keeps the highlighted chip in view when the strip is wider than the screen.
  const chipFocusX =
    currentLandId !== undefined && chipX.current[currentLandId] !== undefined
      ? Math.max(0, chipX.current[currentLandId] - spacing.lg)
      : undefined;
  const jumpChips = sections.map((land, index) => (
    <View
      key={land.landId}
      onLayout={(e) => {
        chipX.current[land.landId] = e.nativeEvent.layout.x;
      }}
    >
      <Chip
        label={land.landName}
        selected={land.landId === currentLandId}
        onPress={() => jumpToLand(index)}
        maxFontSizeMultiplier={MAX_SCALE}
      />
    </View>
  ));
  // Once the big header is gone, the strip stays under the top bar and names
  // the land at the top of the list, so the list itself needs no sticky headers.
  const showPinnedStrip = compact && hasFinds && sections.length > 1;

  const header = (
    <>
      <View
        style={[styles.header, { backgroundColor: headerBg, paddingTop: spacing.sm }]}
        onLayout={(e) => {
          headerHeight.current = e.nativeEvent.layout.height;
        }}
      >
        <Sunburst
          color={t.dark ? palette.accent : t.colors.textOnAccent}
          opacity={t.dark ? 0.08 : 0.14}
          center={{ x: 195, y: -190 - TOP_BAR_HEIGHT }}
        />
        <View style={[styles.headerDisc, { backgroundColor: headerDisc }]}>
          <Ionicons name={PARK_ICONS[parkKey] as IconName} size={22} color={headerText} accessibilityElementsHidden importantForAccessibility="no" />
        </View>
        {destination?.region && (
          <Text style={[styles.eyebrow, { color: headerMuted }]}>{destination.region}</Text>
        )}
        <Text style={[styles.title, { color: headerText }]} accessibilityRole="header">
          {parkName}
        </Text>
        <View
          style={styles.progressRow}
          accessible
          accessibilityRole={hasFinds ? "progressbar" : undefined}
          accessibilityLabel={hasFinds ? `${foundCount} of ${parkEntries.length} found` : "No finds yet"}
          accessibilityValue={hasFinds ? { min: 0, max: parkEntries.length, now: foundCount } : undefined}
        >
          {hasFinds && (
            <View style={[styles.track, { backgroundColor: track }]}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
          )}
          <Text style={[styles.progressLabel, { color: headerText }]}>
            {hasFinds ? `${foundCount} of ${parkEntries.length} found` : "No finds yet"}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {hasFinds && (
          <View style={styles.tools}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={t.colors.textMuted} accessibilityElementsHidden importantForAccessibility="no" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search this park"
                placeholderTextColor={t.colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search this park"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={t.colors.textMuted} />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={activeCount > 0 ? `Filter, ${activeCount} on` : "Filter"}
              style={[styles.filterButton, activeCount > 0 && styles.filterButtonOn]}
            >
              <Ionicons name="options-outline" size={18} color={activeCount > 0 ? t.colors.onInk : t.colors.text} />
              <Text style={[styles.filterLabel, activeCount > 0 && { color: t.colors.onInk }]}>Filter</Text>
              {activeCount > 0 && (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>{activeCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {activeCount > 0 && (
          <View style={styles.tags}>
            {filter !== "All" && (
              <Pressable
                onPress={() => setFilter("All")}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter: ${filter === "FIND" ? "Finds" : "Surprises"} only`}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{filter === "FIND" ? "Finds only" : "Surprises only"}</Text>
                <Ionicons name="close" size={14} color={t.colors.text} />
              </Pressable>
            )}
            {difficultyFiltered && (
              <Pressable
                onPress={() => setDifficulties(DIFFICULTIES)}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter: ${difficulties.join(", ")} only`}
                style={styles.tag}
              >
                <Text style={styles.tagText}>{difficulties.join(" + ")}</Text>
                <Ionicons name="close" size={14} color={t.colors.text} />
              </Pressable>
            )}
            {hideFound && (
              <Pressable
                onPress={() => setHideFound(false)}
                accessibilityRole="button"
                accessibilityLabel="Remove filter: Hide found"
                style={styles.tag}
              >
                <Text style={styles.tagText}>Hide found</Text>
                <Ionicons name="close" size={14} color={t.colors.text} />
              </Pressable>
            )}
            {confirmedOnly && (
              <Pressable
                onPress={() => setConfirmedOnly(false)}
                accessibilityRole="button"
                accessibilityLabel="Remove filter: Confirmed only"
                style={styles.tag}
              >
                <Text style={styles.tagText}>Confirmed only</Text>
                <Ionicons name="close" size={14} color={t.colors.text} />
              </Pressable>
            )}
            {hiddenCount > 0 && <Text style={styles.huntMeta}>{hiddenCount} hidden</Text>}
          </View>
        )}

        {hasFinds && sections.length > 1 && (
          <FadingScrollRow contentContainerStyle={styles.jumpRow} style={styles.jump} scrollToX={chipFocusX}>
            {jumpChips}
          </FadingScrollRow>
        )}

        {groups.length === 0 &&
          (!hasFinds ? (
            <EmptyState
              title="No finds documented yet"
              message="Read up on the park below, and send in anything you spot."
            />
          ) : allFoundHere ? (
            <EmptyState
              title="All found here"
              message={`You've spotted every documented ${filter === "All" ? "detail" : filter === "FIND" ? "find" : "hidden surprise"} here. Show them again to revisit.`}
              actionLabel="Show found"
              onAction={() => setHideFound(false)}
            />
          ) : confirmedOnly ? (
            <EmptyState
              title="Nothing confirmed here yet"
              message="Nobody has checked these in person yet. Show them all, and tap Still there? on any you spot."
              actionLabel="Show all"
              onAction={() => setConfirmedOnly(false)}
            />
          ) : (
            <EmptyState
              title="Nothing here yet"
              message="No entries match this search or filter."
              actionLabel={activeCount > 0 || trimmedQuery ? "Clear filters" : undefined}
              onAction={
                activeCount > 0 || trimmedQuery
                  ? () => {
                      resetFilters();
                      setQuery("");
                    }
                  : undefined
              }
            />
          ))}
      </View>
    </>
  );

  const filterSheet = (
    <ParkFilterSheet
      visible={sheetOpen}
      onClose={() => setSheetOpen(false)}
      type={filter}
      onTypeChange={setFilter}
      difficulties={difficulties}
      onDifficultiesChange={setDifficulties}
      hideFound={hideFound}
      onHideFoundChange={setHideFound}
      confirmedOnly={confirmedOnly}
      onConfirmedOnlyChange={setConfirmedOnly}
      resultCount={visible.length}
      foundCount={foundCount}
      canReset={activeCount > 0}
      onReset={resetFilters}
    />
  );

  const footer = (
    <View style={styles.footerBody}>
      {parkFacts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Did you know?
            </Text>
            <Text style={styles.sectionMeta}>
              {parkFacts.length} {parkFacts.length === 1 ? "fact" : "facts"}
            </Text>
          </View>
          <View style={styles.factsCard}>
            {visibleFacts.map((fact, index) => (
              <React.Fragment key={fact.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.fact}>
                  <View style={[styles.factIcon, { backgroundColor: palette.tint }]}>
                    <Ionicons name="bulb-outline" size={16} color={palette.text} accessibilityElementsHidden importantForAccessibility="no" />
                  </View>
                  <View style={styles.factText}>
                    <Text style={styles.factTitle}>{fact.title}</Text>
                    <Text style={styles.factBody}>{fact.body}</Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
            {hiddenFactCount > 0 && (
              <>
                <View style={styles.divider} />
                <Pressable
                  onPress={() => setShowAllFacts(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${hiddenFactCount} more ${hiddenFactCount === 1 ? "fact" : "facts"}`}
                  style={({ pressed }) => [styles.factsMore, pressed && styles.suggestButtonPressed]}
                >
                  <Text style={[styles.factsMoreText, { color: palette.text }]}>
                    Show {hiddenFactCount} more
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={palette.text} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      <View style={styles.suggestCard}>
        <Text style={styles.suggestTitle}>Know one we're missing?</Text>
        <Text style={styles.suggestBody}>Send it in and we'll check it out before adding it.</Text>
        <Pressable
          onPress={() => navigation.navigate("SubmitSighting", { parkId })}
          accessibilityRole="button"
          accessibilityLabel="Suggest a find"
          style={({ pressed }) => [styles.suggestButton, pressed && styles.suggestButtonPressed]}
        >
          <Ionicons name="add-circle-outline" size={20} color={t.colors.onInk} />
          <Text style={styles.suggestButtonText}>Suggest a find</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {topBar}
      {showPinnedStrip && (
        <View style={[styles.pinnedStrip, { top: insets.top + TOP_BAR_HEIGHT }]}>
          <FadingScrollRow contentContainerStyle={styles.jumpRow} scrollToX={chipFocusX}>
            {jumpChips}
          </FadingScrollRow>
        </View>
      )}
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={attractionKey}
        renderItem={renderAttraction}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        // Never sticky. The big header plus the search row are taller than the
        // point where the pinned strip takes over, so a land header could not
        // reach the top before the strip appears anyway. Toggling this with
        // the strip rewraps every land header cell mid-scroll, and on Android
        // that rebuild cancels a jump started from the top of the list.
        stickySectionHeadersEnabled={false}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollToIndexFailed={onScrollToIndexFailed}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
      />
      {filterSheet}
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
    header: {
      position: "relative",
      overflow: "hidden",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md + 2,
      borderBottomLeftRadius: radii.xl,
      borderBottomRightRadius: radii.xl,
    },
    topBar: {
      position: "relative",
      overflow: "hidden",
      paddingHorizontal: spacing.lg,
    },
    topBarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: TOP_BAR_HEIGHT,
    },
    compactTitleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    compactTitle: {
      ...text.cardTitle,
      flexShrink: 1,
    },
    compactCount: {
      ...text.meta,
      fontVariant: ["tabular-nums"],
    },
    compactTrack: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
    },
    backButton: {
      width: 44,
      height: 44,
      marginLeft: -12,
      alignItems: "center",
      justifyContent: "center",
    },
    shareButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerDisc: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.lg,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    // The park icon sits in the top right, so the two lines beside it leave room.
    eyebrow: {
      ...text.eyebrow,
      marginTop: spacing.sm,
      marginRight: 56,
    },
    title: {
      ...text.display,
      marginTop: spacing.xs,
      marginRight: 56,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
      marginTop: spacing.sm + 4,
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: radii.full,
      overflow: "hidden",
    },
    fill: {
      height: 8,
      borderRadius: radii.full,
      backgroundColor: t.colors.primary,
    },
    progressLabel: {
      ...text.meta,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      gap: spacing.md - 4,
    },
    // Over the top of the list, so the list does not move when it appears.
    pinnedStrip: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 2,
      paddingVertical: spacing.sm,
      backgroundColor: t.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border,
    },
    jump: {
      marginHorizontal: -spacing.lg,
    },
    jumpRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    tools: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.md - 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: t.colors.controlBorder,
    },
    searchInput: {
      flex: 1,
      // On web an input refuses to shrink below its own default width, which
      // pushed the clear button out of the field and under the Filter button.
      minWidth: 0,
      ...text.body,
      lineHeight: 20,
      color: t.colors.text,
      paddingVertical: 0,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
      minHeight: 44,
      paddingHorizontal: spacing.md - 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.controlBorder,
    },
    filterButtonOn: {
      backgroundColor: t.colors.ink,
      borderColor: t.colors.ink,
    },
    filterLabel: {
      ...text.chip,
      fontSize: 14,
      color: t.colors.text,
    },
    filterCount: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primary,
    },
    filterCountText: {
      ...text.chip,
      fontSize: 12,
      lineHeight: 16,
      color: t.colors.onPrimary,
    },
    tags: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.sm,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      minHeight: 32,
      paddingHorizontal: spacing.sm + 4,
      borderRadius: radii.full,
      backgroundColor: t.colors.primaryLight,
    },
    tagText: {
      ...text.meta,
      color: t.colors.text,
    },
    huntMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    rowPad: {
      paddingHorizontal: spacing.lg,
    },
    // Opaque, because the header sticks over the attraction cards.
    sectionHeaderWrap: {
      backgroundColor: t.colors.background,
      paddingTop: spacing.md - 4 + spacing.xs,
      paddingBottom: spacing.sm,
    },
    attractionRow: {
      paddingBottom: spacing.sm,
    },
    footerBody: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md - 4,
    },
    section: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    sectionTitle: {
      ...text.sectionTitle,
      color: t.colors.text,
      flexShrink: 1,
    },
    landProgress: {
      ...text.meta,
    },
    sectionMeta: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    groupCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      overflow: "hidden",
      paddingBottom: spacing.xs,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.md - 4,
      paddingHorizontal: spacing.md - 2,
      paddingBottom: spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    groupTitle: {
      ...text.labelCaps,
      fontSize: 13,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      marginHorizontal: spacing.md - 2,
      backgroundColor: t.colors.border,
    },
    factsCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      overflow: "hidden",
    },
    fact: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 4,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.md - 2,
    },
    factIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    factText: {
      flex: 1,
      gap: spacing.xs,
    },
    factTitle: {
      ...text.itemTitle,
      color: t.colors.text,
    },
    factBody: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    factsMore: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      minHeight: 44,
      paddingHorizontal: spacing.md - 2,
    },
    factsMoreText: {
      ...text.chip,
      fontSize: 14,
    },
    suggestCard: {
      alignItems: "flex-start",
      gap: spacing.xs,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    suggestTitle: {
      ...text.cardTitle,
      color: t.colors.text,
    },
    suggestBody: {
      ...text.bodySmall,
      color: t.colors.textSecondary,
    },
    suggestButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm - 2,
      minHeight: 44,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
      marginTop: spacing.sm,
    },
    suggestButtonPressed: {
      opacity: 0.85,
    },
    suggestButtonText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
  });
