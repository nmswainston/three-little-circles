import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, LilitaOne_400Regular } from "@expo-google-fonts/lilita-one";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import AppNavigator from "./src/navigation/AppNavigator";
import AchievementToast from "./src/components/AchievementToast";
import Onboarding from "./src/components/Onboarding";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";

// Keep the native splash up until fonts are ready so the first frame uses them.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    LilitaOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Suppress harmless console warnings/errors from third-party services and React Navigation
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const originalWarn = console.warn;
      const originalError = console.error;

      // Filter console.warn messages
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Filter out @import rule warnings (typically from third-party services like Google)
        if (
          message.includes('@import rule') &&
          (message.includes('ignored') || message.includes('wasn\'t defined at the top') || message.includes('Define @import rules at the top'))
        ) {
          return;
        }
        // Filter out aria-hidden warnings from React Navigation (expected behavior on web)
        // These occur when React Navigation hides non-visible screens but they contain focusable elements
        if (
          message.includes('Blocked aria-hidden') ||
          message.includes('aria-hidden') && message.includes('descendant retained focus') ||
          message.includes('focus must not be hidden from assistive technology')
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };

      // Filter console.error messages
      console.error = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Filter out @import rule errors (typically from third-party services like Google)
        if (
          message.includes('@import rule') &&
          (message.includes('ignored') || message.includes('wasn\'t defined at the top') || message.includes('Define @import rules at the top'))
        ) {
          return;
        }
        // Filter out message channel errors (usually from browser extensions)
        if (message.includes('message channel closed') || message.includes('asynchronous response')) {
          return;
        }
        // Also filter aria-hidden errors (sometimes logged as errors)
        if (
          message.includes('Blocked aria-hidden') ||
          (message.includes('aria-hidden') && message.includes('descendant retained focus'))
        ) {
          return;
        }
        originalError.apply(console, args);
      };

      // Suppress unhandled promise rejections for message channel errors
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason?.toString() || '';
        if (reason.includes('message channel closed') || reason.includes('asynchronous response')) {
          event.preventDefault();
        }
      };
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      // Intercept browser console messages (some warnings come directly from browser, not console.warn)
      // This is a workaround for browser-level accessibility warnings that can't be filtered normally
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Filter aria-hidden warnings that might come through console.log
        if (message.includes('Blocked aria-hidden') || (message.includes('aria-hidden') && message.includes('descendant retained focus'))) {
          return;
        }
        originalLog.apply(console, args);
      };

      return () => {
        console.warn = originalWarn;
        console.error = originalError;
        console.log = originalLog;
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Everything under the theme: status bar style, navigation colors, screens. */
function Root() {
  const t = useTheme();

  const navigationTheme = useMemo(() => {
    const base = t.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.primary,
        background: t.colors.background,
        card: t.colors.surface,
        text: t.colors.text,
        border: t.colors.border,
      },
    };
  }, [t]);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
      <AchievementToast />
      <Onboarding />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
