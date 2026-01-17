import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { getEntryById, formatSubtitle } from "../data/query";
import { labelOrFallback } from "../data/labels";
import AppShell from "../components/layout/AppShell";
import Section from "../components/layout/Section";
import EmptyState from "../components/ui/EmptyState";
import FoundToggle from "../components/ui/FoundToggle";
import { colors, spacing, typography, radii } from "../theme/tokens";
import { useFoundStore } from "../store/useFoundStore";

type EntryDetailRouteProp = RouteProp<RootStackParamList, "EntryDetail">;

export default function EntryDetailScreen() {
  const route = useRoute<EntryDetailRouteProp>();
  const { entryId } = route.params;

  const entry = getEntryById(entryId);

  const isFound = useFoundStore((s) => s.isFound);
  const toggleFound = useFoundStore((s) => s.toggleFound);
  const found = isFound(entryId);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, []);

  const handleToggleFound = () => {
    toggleFound(entryId);
  };

  if (!entry) {
    return (
      <AppShell title="Entry" subtitle="">
        <EmptyState title="Not found" message="This entry isn't documented." />
      </AppShell>
    );
  }

  const title = labelOrFallback(entry.display?.entryTitle, "Hidden Find");

  return (
    <AppShell title={title} subtitle={formatSubtitle(entry)}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* FOUND BUTTON */}
          <View style={styles.foundButtonWrap}>
            <FoundToggle isFound={found} onToggle={handleToggleFound} />

            <Text style={styles.foundHelperText}>
              {found
                ? "Nice catch. This now counts toward your progress."
                : "Mark it found to add it to your progress."}
            </Text>
          </View>

          <Section title="Description" description="">
            <Text style={styles.descriptionText}>{entry.description}</Text>
          </Section>

          <Section title="Where to Look" description="">
            <View style={styles.whereToLookContainer}>
              <Text style={styles.sceneLabel}>Scene:</Text>
              <Text style={styles.sceneText}>{entry.whereToLook.scene}</Text>
              <Text style={styles.exactSpotLabel}>Exact Spot:</Text>
              <Text style={styles.exactSpotText}>
                {entry.whereToLook.exactSpot}
              </Text>
              {entry.whereToLook.orientation && (
                <>
                  <Text style={styles.orientationLabel}>Orientation:</Text>
                  <Text style={styles.orientationText}>
                    {entry.whereToLook.orientation}
                  </Text>
                </>
              )}
            </View>
          </Section>

          {entry.bestTip && (
            <Section title="Best Tip" description="">
              <Text style={styles.tipText}>{entry.bestTip}</Text>
            </Section>
          )}

          {entry.funFacts && entry.funFacts.length > 0 && (
            <Section title="Fun Facts" description="">
              <View style={styles.funFactsContainer}>
                {entry.funFacts.map((fact, index) => (
                  <Text key={index} style={styles.funFactText}>
                    • {fact}
                  </Text>
                ))}
              </View>
            </Section>
          )}

          {entry.confidence && (
            <Section title="Confidence" description="">
              <Text style={styles.metadataText}>{entry.confidence}</Text>
            </Section>
          )}

          {entry.verification && (
            <Section title="Verification" description="">
              <Text style={styles.metadataText}>{entry.verification}</Text>
            </Section>
          )}

          {entry.areaContext && (
            <Section title="Area Context" description="">
              <Text style={styles.metadataText}>{entry.areaContext}</Text>
            </Section>
          )}

          {entry.viewing &&
            Object.values(entry.viewing).some(
              (value) =>
                value !== undefined && value !== null && value !== ""
            ) && (
              <Section title="Viewing Conditions" description="">
                <View style={styles.viewingConditionsContainer}>
                  {entry.viewing.motion && (
                    <>
                      <Text style={styles.viewingLabel}>Motion:</Text>
                      <Text style={styles.viewingValue}>
                        {entry.viewing.motion}
                      </Text>
                    </>
                  )}
                  {entry.viewing.lighting && (
                    <>
                      <Text style={styles.viewingLabel}>Lighting:</Text>
                      <Text style={styles.viewingValue}>
                        {entry.viewing.lighting}
                      </Text>
                    </>
                  )}
                  {entry.viewing.angle && (
                    <>
                      <Text style={styles.viewingLabel}>Angle:</Text>
                      <Text style={styles.viewingValue}>
                        {entry.viewing.angle}
                      </Text>
                    </>
                  )}
                  {entry.viewing.crowding && (
                    <>
                      <Text style={styles.viewingLabel}>Crowding:</Text>
                      <Text style={styles.viewingValue}>
                        {entry.viewing.crowding}
                      </Text>
                    </>
                  )}
                  {entry.viewing.distance && (
                    <>
                      <Text style={styles.viewingLabel}>Distance:</Text>
                      <Text style={styles.viewingValue}>
                        {entry.viewing.distance}
                      </Text>
                    </>
                  )}
                  {entry.viewing.notes && (
                    <>
                      <Text style={styles.viewingLabel}>Notes:</Text>
                      <Text style={styles.viewingNotes}>
                        {entry.viewing.notes}
                      </Text>
                    </>
                  )}
                </View>
              </Section>
            )}

          {/* little breathing room at end */}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </Animated.View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  foundButtonWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  foundHelperText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },

  descriptionText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.loose,
    color: colors.textSecondary,
  },
  whereToLookContainer: {
    gap: spacing.sm,
  },
  sceneLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  sceneText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exactSpotLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  exactSpotText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  orientationLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  orientationText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
  tipText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.loose,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  funFactsContainer: {
    gap: spacing.sm,
  },
  funFactText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
  metadataText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
  },
  viewingConditionsContainer: {
    gap: spacing.sm,
  },
  viewingLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  viewingValue: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  viewingNotes: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
});