import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/tokens";

export default function App() {
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

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
