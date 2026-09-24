import React, { useState } from "react";
import { View, Text, Image, Pressable, Modal, StyleSheet, Platform, ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { EntryImage } from "../data/types";
import { Theme, useStyles, useTheme } from "../theme/ThemeProvider";
import { spacing, radii, text } from "../theme/tokens";

interface ReferencePhotoProps {
  source: ImageSourcePropType;
  image: EntryImage;
  /** True while the entry's answer is under wraps: the photo blurs until tapped. */
  hidden: boolean;
}

const BLUR = 28;

/**
 * The entry's reference photo. A photo gives the find away, so while hints
 * are on and the entry is unfound it renders blurred behind a "Reveal photo"
 * pill. Once revealed, or whenever the answer is already open, a tap opens
 * it full screen.
 */
export default function ReferencePhoto({ source, image, hidden }: ReferencePhotoProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [revealed, setRevealed] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const blurred = hidden && !revealed;

  const onPress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (blurred) setRevealed(true);
    else setEnlarged(true);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole={blurred ? "button" : "imagebutton"}
        accessibilityLabel={blurred ? "Reference photo, hidden. Tap to reveal." : `${image.alt}. Tap to enlarge.`}
        style={({ pressed }) => [styles.frame, pressed && styles.pressed]}
      >
        <Image
          source={source}
          style={styles.photo}
          resizeMode="cover"
          blurRadius={blurred ? BLUR : 0}
          accessible={false}
        />
        {blurred && (
          <View style={styles.scrim}>
            <View style={styles.pill}>
              <Ionicons name="eye-outline" size={18} color={t.colors.onInk} />
              <Text style={styles.pillText}>Reveal photo</Text>
            </View>
          </View>
        )}
      </Pressable>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>{blurred ? "Blurred while hints are on." : "Tap to enlarge."}</Text>
        {image.credit && <Text style={styles.credit}>Photo: {image.credit}</Text>}
      </View>

      <Modal visible={enlarged} transparent animationType="fade" onRequestClose={() => setEnlarged(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEnlarged(false)} accessibilityLabel="Close">
          <Image source={source} style={styles.full} resizeMode="contain" accessibilityLabel={image.alt} accessible />
          <View style={[styles.closeWrap, { top: insets.top + spacing.sm }]}>
            <Pressable
              onPress={() => setEnlarged(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={styles.close}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
          {image.credit && (
            <Text style={[styles.fullCredit, { bottom: insets.bottom + spacing.md }]}>Photo: {image.credit}</Text>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.xs + 2,
    },
    frame: {
      aspectRatio: 4 / 3,
      borderRadius: radii.md,
      overflow: "hidden",
      backgroundColor: t.colors.track,
    },
    pressed: {
      opacity: 0.92,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    scrim: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(31,42,68,0.28)",
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm - 2,
      height: 44,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.full,
      backgroundColor: t.colors.ink,
    },
    pillText: {
      ...text.chip,
      fontSize: 15,
      color: t.colors.onInk,
    },
    captionRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    caption: {
      ...text.bodySmall,
      color: t.colors.textMuted,
    },
    credit: {
      ...text.meta,
      color: t.colors.textSecondary,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.94)",
      alignItems: "center",
      justifyContent: "center",
    },
    full: {
      width: "100%",
      height: "100%",
    },
    closeWrap: {
      position: "absolute",
      right: spacing.md,
    },
    close: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    fullCredit: {
      position: "absolute",
      ...text.meta,
      color: "rgba(255,255,255,0.8)",
    },
  });
