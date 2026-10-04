import { Platform } from "react-native";

/**
 * On web, React Navigation hides a stack screen that is no longer on top by
 * setting aria-hidden on it, but it leaves keyboard focus where it was: on
 * the button that was just pressed to leave. Chrome refuses an aria-hidden
 * that would hide the focused element ("Blocked aria-hidden on an element
 * because its descendant retained focus"), so the old screen stays exposed
 * to a screen reader, and the console says so on every push.
 *
 * Watching for the attribute and dropping focus the moment it lands on an
 * ancestor of the focused element fixes both. The observer callback runs
 * before Chrome's accessibility check, so the warning never fires.
 *
 * Returns a cleanup function. A no-op off the web.
 */
export function releaseFocusFromHiddenScreens(): () => void {
  if (Platform.OS !== "web" || typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver((mutations) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) return;
    const hidden = mutations.some(
      ({ target }) =>
        target instanceof Element && target.getAttribute("aria-hidden") === "true" && target.contains(active)
    );
    if (hidden) active.blur();
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["aria-hidden"], subtree: true });
  return () => observer.disconnect();
}
