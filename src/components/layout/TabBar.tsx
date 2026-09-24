import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme, useStyles, useTheme } from '../../theme/ThemeProvider';
import { spacing, radii, typography } from '../../theme/tokens';
import { useAchievementsStore } from '../../store/useAchievementsStore';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  ParksTab: { active: 'map', inactive: 'map-outline' },
  MapTab: { active: 'location', inactive: 'location-outline' },
  ProfileTab: { active: 'person-circle', inactive: 'person-circle-outline' },
};

/**
 * Bottom tab bar: the active tab's icon sits on a gold pill, labels stay
 * visible for every tab. Respects the home-indicator inset.
 */
export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const seen = useAchievementsStore((s) => s.seen);
  const hasNewBadge = unlocked.some((id) => !seen.includes(id));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const icon = ICONS[route.name] ?? ICONS.ParksTab;
        const showsNewBadge = route.name === 'ProfileTab' && hasNewBadge;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={`${options.tabBarAccessibilityLabel ?? label}${showsNewBadge ? ', new badge' : ''}`}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.item}
            hitSlop={8}
          >
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons
                name={focused ? icon.active : icon.inactive}
                size={22}
                color={focused ? t.colors.onPrimary : t.colors.textMuted}
              />
              {showsNewBadge && <View style={styles.newDot} />}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
      paddingTop: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      backgroundColor: t.colors.tabBar,
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    item: {
      alignItems: 'center',
      gap: spacing.xs,
      width: 72,
      minHeight: 44,
    },
    pill: {
      width: 52,
      height: 32,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillActive: {
      backgroundColor: t.colors.primary,
    },
    newDot: {
      position: 'absolute',
      top: 2,
      right: 8,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.colors.error,
      borderWidth: 2,
      borderColor: t.colors.tabBar,
    },
    label: {
      fontFamily: typography.fonts.bodyBold,
      fontSize: typography.sizes.xs,
      color: t.colors.textMuted,
    },
    labelActive: {
      fontFamily: typography.fonts.bodyExtrabold,
      color: t.colors.text,
    },
  });
