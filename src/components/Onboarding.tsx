import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSettingsStore } from "../store/useSettingsStore";
import { useHydrated } from "../store/useHydrated";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "./ui/Sunburst";
import ThreeCircles from "./ui/ThreeCircles";
import Disclaimer from "./Disclaimer";

type Page = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  /** No icon means the app mark. */
  icon?: keyof typeof Ionicons.glyphMap;
};

const PAGES: Page[] = [
  {
    key: "what",
    eyebrow: "Welcome",
    title: "Three little circles",
    body: "Hidden Mickeys are three circles, one big and two small, tucked into murals, props, and architecture by the people who built the parks. Some are obvious. Some take a second look.",
  },
  {
    key: "notes",
    eyebrow: "How it works",
    title: "Field notes, not riddles",
    body: "Every entry tells you the scene to find first, the exact spot within it, and the angle. Want the hunt? Hints open one at a time until you say otherwise.",
    icon: "bulb",
  },
  {
    key: "found",
    eyebrow: "Keep score",
    title: "Mark it. Keep it.",
    body: "Tap Found and it counts toward your progress and badges. Your finds stay on your phone. No account needed.",
    icon: "checkmark-circle",
  },
];

/**
 * The first-launch intro. Waits for the settings store to load so an
 * existing install never sees it flash, and comes back whenever the
 * onboarded flag is cleared ("Show the intro again" on Profile).
 */
export default function Onboarding() {
  const hydrated = useHydrated(useSettingsStore);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const visible = hydrated && !onboarded;
  const finish = () => setOnboarded(true);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={finish}>
      {visible && <OnboardingPages onDone={finish} />}
    </Modal>
  );
}

function OnboardingPages({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === PAGES.length - 1;
  const heroWidth = width - spacing.lg * 2;

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: width * next, animated: true });
    setIndex(next);
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.max(0, Math.min(PAGES.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.topBar}>
        <ThreeCircles size="small" />
        {!last && (
          <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip the intro" hitSlop={8}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
      >
        {PAGES.map((page, i) => (
          <View
            key={page.key}
            style={[styles.page, { width }]}
            accessibilityElementsHidden={i !== index}
            importantForAccessibility={i === index ? "yes" : "no-hide-descendants"}
          >
            <View style={styles.hero}>
              <Sunburst center={{ x: heroWidth / 2, y: HERO_HEIGHT / 2 }} />
              {page.icon ? (
                <View style={[styles.heroDisc, styles.heroDiscAccent]}>
                  <Ionicons name={page.icon} size={44} color={t.colors.onPrimary} />
                </View>
              ) : (
                <View style={styles.heroDisc}>
                  <ThreeCircles size="large" />
                </View>
              )}
            </View>
            <Text style={styles.eyebrow}>{page.eyebrow}</Text>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.body}>{page.body}</Text>
            {i === PAGES.length - 1 && (
              <View style={styles.disclaimer}>
                <Disclaimer />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}>
          {PAGES.map((page, i) => (
            <View key={page.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={() => (last ? onDone() : goTo(index + 1))}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>{last ? "Start hunting" : "Next"}</Text>
          <Ionicons name={last ? "checkmark" : "arrow-forward"} size={20} color={t.colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const HERO_HEIGHT = 220;

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 44,
      paddingHorizontal: spacing.lg,
    },
    skip: {
      ...text.meta,
      color: t.colors.textSecondary,
      textDecorationLine: "underline",
    },
    pager: {
      flex: 1,
    },
    page: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    hero: {
      position: "relative",
      overflow: "hidden",
      height: HERO_HEIGHT,
      borderRadius: radii.xl,
      backgroundColor: t.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    heroDisc: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: t.colors.surface,
      borderWidth: 2,
      borderColor: t.colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    heroDiscAccent: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    eyebrow: {
      ...text.eyebrow,
      color: t.colors.textSecondary,
    },
    title: {
      ...text.display,
      color: t.colors.text,
      marginTop: spacing.xs,
    },
    body: {
      ...text.body,
      lineHeight: 24,
      color: t.colors.textSecondary,
      marginTop: spacing.sm + 2,
    },
    disclaimer: {
      marginTop: spacing.lg,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.colors.track,
    },
    dotActive: {
      width: 24,
      backgroundColor: t.colors.ink,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      height: 56,
      borderRadius: radii.full,
      backgroundColor: t.colors.primary,
    },
    buttonText: {
      ...text.button,
      color: t.colors.onPrimary,
    },
    pressed: {
      opacity: 0.9,
    },
  });
