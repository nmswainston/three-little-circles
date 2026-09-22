import { Alert, Platform } from "react-native";

/** A one-button notice. Alert on phones; the browser's own dialog on web, where Alert does nothing. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** A destructive yes/no. Runs onConfirm only when the person picks the confirming button. */
export function confirm(title: string, message: string, onConfirm: () => void, confirmLabel: string = "OK"): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}
