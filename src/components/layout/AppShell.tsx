import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/tokens';
import ThreeCircles from '../ui/ThreeCircles';

interface AppShellProps {
  title?: string;
  subtitle?: string;
  rightAction?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export default function AppShell({
  title,
  subtitle,
  rightAction,
  children,
  style,
  contentStyle,
}: AppShellProps) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const hasTitle = Boolean(title && typeof title === 'string' && title.trim().length > 0);
  const hasSubtitle = Boolean(subtitle && typeof subtitle === 'string' && subtitle.trim().length > 0);

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
      {(hasTitle || hasSubtitle || rightAction || canGoBack) && (
        <View style={styles.header}>
          {canGoBack && (
            <Pressable
              onPress={handleBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          )}
          <View style={styles.headerContent}>
            {hasTitle && (
              <>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.circlesContainer}>
                  <ThreeCircles size="small" />
                </View>
              </>
            )}
            {hasSubtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: spacing.xs,
  },
  circlesContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rightAction: {
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
});
