import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography, radii, shadows } from "../theme/tokens";
import ThreeCircles from "../components/ui/ThreeCircles";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type HomeAction = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
};

const ACTIONS: HomeAction[] = [
  {
    title: "Parks",
    subtitle: "By park and land",
    icon: "map-outline",
    route: "Parks",
  },
  {
    title: "Map",
    subtitle: "Sightlines and queues",
    icon: "navigate-outline",
    route: "Map",
  },
  {
    title: "Profile",
    subtitle: "What you've noticed",
    icon: "person-circle-outline",
    route: "Profile",
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
        <View style={styles.logoRow}>
          <ThreeCircles size="medium" />
          <Text style={styles.title}>Three Little Circles</Text>
        </View>
        <Text style={styles.tagline}>The magic hides in plain sight.</Text>
      </Animated.View>

      <Animated.View style={[styles.cardList, { opacity: fadeAnim }]}>
        {ACTIONS.map((a, index) => (
          <ActionCard
            key={a.title}
            action={a}
            navigation={navigation}
            delay={index * 50}
          />
        ))}
      </Animated.View>

      <Text style={styles.footerNote}>
        Unofficial fan-created guide. Not affiliated with or endorsed by any theme park company.
      </Text>
    </View>
  );
}

function ActionCard({
  action,
  navigation,
  delay,
}: {
  action: HomeAction;
  navigation: NavigationProp;
  delay: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => {
          navigation.navigate(action.route as any, undefined);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={action.icon} size={20} color={colors.primary} />
        </View>

        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{action.title}</Text>
          <Text style={styles.cardSubtitle}>{action.subtitle}</Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },

  hero: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },


  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    letterSpacing: typography.letterSpacing.wide,
  },

  tagline: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.normal,
    color: colors.textSecondary,
    maxWidth: 360,
  },

  cardList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },

  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    marginRight: spacing.sm,
  },

  cardText: {
    flex: 1,
    gap: 2,
  },

  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
  },

  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },

  footerNote: {
    marginTop: "auto",
    paddingTop: spacing.md,
    fontSize: typography.sizes.xs,
    lineHeight: typography.lineHeights.tight,
    color: colors.textMuted,
  },
});
