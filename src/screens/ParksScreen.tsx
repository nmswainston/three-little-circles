import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { getParksSummary } from "../data/query";
import AppShell from "../components/layout/AppShell";
import Disclaimer from "../components/Disclaimer";
import { colors, spacing, typography, radii, shadows } from "../theme/tokens";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ParksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const parks = getParksSummary();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  return (
    <AppShell
      title="Parks"
      subtitle="By park and land"
      contentStyle={styles.content}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {parks.map((park) => (
            <TouchableOpacity
              key={park.parkId}
              style={styles.card}
              onPress={() => navigation.navigate("Park", { parkId: park.parkId })}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{park.parkName}</Text>
                <Text style={styles.cardCount}>{park.count} {park.count === 1 ? "entry" : "entries"}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.footer}>
            <Disclaimer />
          </View>
        </ScrollView>
      </Animated.View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardCount: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  footer: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
