import { useFoundStore } from "./useFoundStore";
import { useAchievementsStore } from "./useAchievementsStore";
import { useSettingsStore } from "./useSettingsStore";
import { useConfirmationsStore } from "./useConfirmationsStore";
import { Backup, BackupData, buildBackup, mergeBackup, replaceWithBackup } from "../lib/backup";

export type ImportMode = "merge" | "replace";

const STORES = [useFoundStore, useAchievementsStore, useSettingsStore, useConfirmationsStore];

/** True once every store a backup touches has loaded from disk. */
export function backupStoresHydrated(): boolean {
  return STORES.every((store) => store.persist.hasHydrated());
}

export const STILL_LOADING_MESSAGE = "Your progress is still loading. Try again in a moment.";

function assertHydrated(): void {
  // Reading before hydration would export the empty initial state, and a
  // late hydration would overwrite whatever an import just applied.
  if (!backupStoresHydrated()) throw new Error(STILL_LOADING_MESSAGE);
}

/** Everything worth carrying to another phone, read from the stores. */
export function currentBackupData(): BackupData {
  assertHydrated();
  const achievements = useAchievementsStore.getState();
  const settings = useSettingsStore.getState();
  return {
    found: useFoundStore.getState().found,
    achievements: { unlocked: achievements.unlocked, earnedAt: achievements.earnedAt, seen: achievements.seen },
    settings: {
      appearance: settings.appearance,
      mapType: settings.mapType,
      hideFound: settings.hideFound,
      hintMode: settings.hintMode,
    },
    reports: useConfirmationsStore.getState().reported,
  };
}

/** Throws with STILL_LOADING_MESSAGE if the stores have not loaded yet. */
export function exportBackup(now: number = Date.now()): Backup {
  return buildBackup(currentBackupData(), now);
}

/**
 * Writes a backup into the stores. Achievements go first so the found
 * subscription, which recomputes badges, only toasts ones the backup didn't
 * already carry. A replace also drops any toast still queued, since the
 * badge it announces may not exist in the restored progress. The device id
 * is never touched. Throws with STILL_LOADING_MESSAGE before hydration.
 */
export function applyBackup(backup: Backup, mode: ImportMode): BackupData {
  const current = currentBackupData();
  const next = mode === "merge" ? mergeBackup(current, backup) : replaceWithBackup(current, backup);
  useAchievementsStore.setState({
    unlocked: next.achievements.unlocked,
    earnedAt: next.achievements.earnedAt,
    seen: next.achievements.seen,
    ...(mode === "replace" ? { pending: [] } : {}),
  });
  useSettingsStore.setState({ ...next.settings });
  useConfirmationsStore.setState({ reported: next.reports });
  useFoundStore.setState({ found: next.found });
  return next;
}
