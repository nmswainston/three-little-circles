import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
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
import { releaseFocusFromHiddenScreens } from "./src/lib/webFocus";

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

  // Web only: keep focus out of screens the stack has hidden.
  useEffect(() => releaseFocusFromHiddenScreens(), []);

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
