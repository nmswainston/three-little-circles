import { Alert, Platform } from "react-native";

/** A one-button notice. Alert on phones; the browser's own dialog on web, where Alert does nothing. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
