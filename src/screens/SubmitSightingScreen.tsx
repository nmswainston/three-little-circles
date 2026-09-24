import React, { ReactNode, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Switch,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "../navigation/types";
import { getDestinationSummaries } from "../data/destinations";
import { Difficulty, LocationType } from "../data/types";
import { useSettingsStore } from "../store/useSettingsStore";
import { submitSighting, validateSighting, LIMITS, SightingInput } from "../lib/submissions";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";
import Sunburst from "../components/ui/Sunburst";
import Chip from "../components/ui/Chip";

type SubmitRouteProp = RouteProp<RootStackParamList, "SubmitSighting">;

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const LOCATION_TYPES: LocationType[] = ["Queue", "Ride", "Pre-show", "Outdoor", "Indoor"];

export default function SubmitSightingScreen() {
  const route = useRoute<SubmitRouteProp>();
  const navigation = useNavigation();
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const deviceId = useSettingsStore((s) => s.deviceId);

  const destinations = useMemo(() => getDestinationSummaries(), []);
  const nameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of destinations) counts.set(d.name, (counts.get(d.name) ?? 0) + 1);
    return counts;
  }, [destinations]);

  const [parkId, setParkId] = useState<string | undefined>(route.params?.parkId ?? destinations[0]?.parkId);
  const [attraction, setAttraction] = useState("");
  const [land, setLand] = useState("");
  const [title, setTitle] = useState("");
  const [whereToLook, setWhereToLook] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [locationType, setLocationType] = useState<LocationType>("Queue");
  const [photo, setPhoto] = useState<{ uri: string; mimeType?: string } | undefined>();
  const [contactName, setContactName] = useState("");
  const [creditOk, setCreditOk] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot: people never see it, bots fill it
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  const destination = destinations.find((d) => d.parkId === parkId);

  const pickPhoto = async (fromCamera: boolean) => {
    setError(undefined);
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(fromCamera ? "Camera access is turned off for this app." : "Photo access is turned off for this app.");
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7 };
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? undefined : result.assets[0];
      if (asset) setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
    } catch {
      setError("Couldn't open the photo picker.");
    }
  };

  const buildInput = (): SightingInput | undefined => {
    if (!destination) return undefined;
    return {
      parkId: destination.parkId,
      parkName: destination.name,
      region: destination.region,
      landName: land,
      attractionName: attraction,
      title,
      whereToLook,
      difficulty,
      locationType,
      photo,
      contactName,
      creditOk,
    };
  };

  const handleSubmit = async () => {
    setError(undefined);
    if (website.trim().length > 0) {
      // Looks automated. Pretend it worked and send nothing.
      setDone(true);
      return;
    }
    const input = buildInput();
    if (!input) {
      setError("Pick the park or resort.");
      return;
    }
    const problems = validateSighting(input);
    if (problems.length > 0) {
      setError(problems[0]);
      return;
    }
    setSubmitting(true);
    const result = await submitSighting(input, deviceId);
    setSubmitting(false);
    if (result.ok) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(true);
    } else {
      setError(result.message);
    }
  };

  const reset = () => {
    setAttraction("");
    setLand("");
    setTitle("");
    setWhereToLook("");
    setPhoto(undefined);
    setError(undefined);
    setDone(false);
  };

  return (
    // "padding" on both platforms: with edge-to-edge on Android the window no
    // longer resizes for the keyboard, so the view has to make room itself.
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Sunburst center={{ x: 195, y: -200 + insets.top }} />
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={t.colors.text} />
          </Pressable>
          <Text style={styles.eyebrow}>Community</Text>
          <Text style={styles.title}>Suggest a find</Text>
          <Text style={styles.subtitle}>
            Spotted a Hidden Mickey we don't have? Tell us where to look. A person checks every suggestion before it goes live.
          </Text>
        </View>

        {done ? (
          <View style={styles.body}>
            <View style={styles.successCard}>
              <View style={styles.successDisc}>
                <Ionicons name="checkmark" size={32} color={t.colors.onSuccess} />
              </View>
              <Text style={styles.successTitle}>Thanks, we'll take a look</Text>
              <Text style={styles.successBody}>
                Suggestions are reviewed by a person before they're added, so it can take a little while to show up in the app.
              </Text>
              <View style={styles.successButtons}>
                <Pressable onPress={reset} accessibilityRole="button" style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Suggest another</Text>
                </Pressable>
                <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            <Field label="Park or resort">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
                {destinations.map((d) => (
                  <Chip
                    key={d.parkId}
                    label={(nameCounts.get(d.name) ?? 0) > 1 ? `${d.name} (${d.region})` : d.name}
                    selected={d.parkId === parkId}
                    onPress={() => setParkId(d.parkId)}
                  />
                ))}
              </ScrollView>
            </Field>

            <Field label="Attraction, shop, or spot">
              <TextInput
                value={attraction}
                onChangeText={setAttraction}
                placeholder="Backyard Coaster"
                placeholderTextColor={t.colors.textMuted}
                style={styles.input}
                maxLength={LIMITS.attraction.max}
                autoCapitalize="words"
                accessibilityLabel="Attraction, shop, or spot"
              />
            </Field>

            <Field label="Land or area" hint="Optional">
              <TextInput
                value={land}
                onChangeText={setLand}
                placeholder="Toy Story Land"
                placeholderTextColor={t.colors.textMuted}
                style={styles.input}
                maxLength={LIMITS.land.max}
                autoCapitalize="words"
                accessibilityLabel="Land or area"
              />
            </Field>

            <Field label="Short title">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Queue Cloud Mickey"
                placeholderTextColor={t.colors.textMuted}
                style={styles.input}
                maxLength={LIMITS.title.max}
                autoCapitalize="words"
                accessibilityLabel="Short title"
              />
            </Field>

            <Field label="Where to look" hint={`${whereToLook.trim().length} / ${LIMITS.whereToLook.max}`}>
              <TextInput
                value={whereToLook}
                onChangeText={setWhereToLook}
                placeholder="Which scene or prop, then the exact spot within it. What angle or timing helps?"
                placeholderTextColor={t.colors.textMuted}
                style={[styles.input, styles.multiline]}
                multiline
                textAlignVertical="top"
                maxLength={LIMITS.whereToLook.max}
                accessibilityLabel="Where to look"
              />
            </Field>

            <Field label="How hard is it to spot?">
              <View style={styles.wrapRow}>
                {DIFFICULTIES.map((level) => (
                  <Chip key={level} label={level} selected={difficulty === level} onPress={() => setDifficulty(level)} />
                ))}
              </View>
            </Field>

            <Field label="Where is it?">
              <View style={styles.wrapRow}>
                {LOCATION_TYPES.map((type) => (
                  <Chip key={type} label={type} selected={locationType === type} onPress={() => setLocationType(type)} />
                ))}
              </View>
            </Field>

            <Field label="Photo" hint="Optional. Only reviewers see it.">
              {photo ? (
                <View style={styles.photoRow}>
                  <Image source={{ uri: photo.uri }} style={styles.thumbnail} accessibilityLabel="Attached photo" />
                  <Pressable onPress={() => setPhoto(undefined)} accessibilityRole="button" style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.wrapRow}>
                  {Platform.OS !== "web" && (
                    <Pressable onPress={() => pickPhoto(true)} accessibilityRole="button" style={styles.secondaryButton}>
                      <Ionicons name="camera-outline" size={18} color={t.colors.text} />
                      <Text style={styles.secondaryButtonText}>Take photo</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => pickPhoto(false)} accessibilityRole="button" style={styles.secondaryButton}>
                    <Ionicons name="image-outline" size={18} color={t.colors.text} />
                    <Text style={styles.secondaryButtonText}>Choose photo</Text>
                  </Pressable>
                </View>
              )}
            </Field>

            <Field label="Credit" hint="Optional">
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Your name or handle"
                placeholderTextColor={t.colors.textMuted}
                style={styles.input}
                maxLength={LIMITS.contact.max}
                accessibilityLabel="Your name or handle"
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Credit me by this name if it's added</Text>
                <Switch
                  value={creditOk}
                  onValueChange={setCreditOk}
                  trackColor={{ false: t.colors.track, true: t.colors.primary }}
                  thumbColor={t.colors.surface}
                  accessibilityLabel="Credit me by this name"
                />
              </View>
            </Field>

            <TextInput
              value={website}
              onChangeText={setWebsite}
              style={styles.honeypot}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              autoComplete="off"
              placeholder="Website"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, styles.submit, (pressed || submitting) && styles.pressed]}
            >
              {submitting ? (
                <ActivityIndicator color={t.colors.onInk} />
              ) : (
                <Text style={styles.primaryButtonText}>Send suggestion</Text>
              )}
            </Pressable>
            <Text style={styles.footnote}>
              Please don't include employee-only areas or anything that isn't part of the guest experience.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
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
    eyebrow: {
      ...text.eyebrow,
      color: t.colors.textSecondary,
      marginTop: spacing.sm,
    },
    title: {
      ...text.display,
      color: t.colors.text,
      marginTop: spacing.xs,
    },
    subtitle: {
      ...text.body,
      lineHeight: 22,
      color: t.colors.textSecondary,
      marginTop: spacing.xs,
    },
    body: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md - 4,
      gap: spacing.md + 2,
    },
    field: {
      gap: spacing.sm,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    fieldLabel: {
      ...text.labelCaps,
      fontSize: 13,
      lineHeight: 18,
      color: t.colors.textSecondary,
    },
    fieldHint: {
      ...text.bodySmall,
      lineHeight: 18,
      color: t.colors.textMuted,
    },
    input: {
      ...text.body,
      lineHeight: 20,
      minHeight: 48,
      paddingHorizontal: spacing.md - 2,
      paddingVertical: spacing.sm + 2,
      color: t.colors.text,
      backgroundColor: t.colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    multiline: {
      minHeight: 132,
      lineHeight: 22,
    },
    chipScroll: {
      marginHorizontal: -spacing.lg,
      flexGrow: 0,
      flexShrink: 0,
    },
    chipRow: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    wrapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    photoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md - 4,
    },
    thumbnail: {
      width: 88,
      height: 88,
      borderRadius: radii.md,
      backgroundColor: t.colors.track,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      minHeight: 44,
    },
    switchLabel: {
      flex: 1,
      ...text.bodySmall,
      color: t.colors.text,
    },
    honeypot: {
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
      left: -1000,
    },
    error: {
      ...text.meta,
      color: t.colors.error,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      height: 52,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    primaryButtonText: {
      ...text.button,
      color: t.colors.onInk,
    },
    submit: {
      backgroundColor: t.colors.primary,
    },
    pressed: {
      opacity: 0.85,
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm - 2,
      height: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radii.full,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    secondaryButtonText: {
      ...text.chip,
      color: t.colors.text,
    },
    footnote: {
      ...text.bodySmall,
      color: t.colors.textMuted,
      textAlign: "center",
    },
    successCard: {
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: t.colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    successDisc: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    successTitle: {
      ...text.title,
      color: t.colors.text,
      textAlign: "center",
    },
    successBody: {
      ...text.body,
      color: t.colors.textSecondary,
      textAlign: "center",
    },
    successButtons: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginTop: spacing.xs,
    },
  });
