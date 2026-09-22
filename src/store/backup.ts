import { useFoundStore } from "./useFoundStore";
import { useAchievementsStore } from "./useAchievementsStore";
import { useSettingsStore } from "./useSettingsStore";
import { useConfirmationsStore } from "./useConfirmationsStore";
import { Backup, BackupData, buildBackup, mergeBackup, replaceWithBackup } from "../lib/backup";

export type ImportMode = "merge" | "replace";

/** Everything worth carrying to another phone, read from the stores. */
export function currentBackupData(): BackupData {
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

export function exportBackup(now: number = Date.now()): Backup {
  return buildBackup(currentBackupData(), now);
}

/**
 * Writes a backup into the stores. Achievements go first so the found
 * subscription, which recomputes badges, only toasts ones the backup didn't
 * already carry. The device id is never touched.
 */
export function applyBackup(backup: Backup, mode: ImportMode): BackupData {
  const current = currentBackupData();
  const next = mode === "merge" ? mergeBackup(current, backup) : replaceWithBackup(current, backup);
  useAchievementsStore.setState({
    unlocked: next.achievements.unlocked,
    earnedAt: next.achievements.earnedAt,
    seen: next.achievements.seen,
  });
  useSettingsStore.setState({ ...next.settings });
  useConfirmationsStore.setState({ reported: next.reports });
  useFoundStore.setState({ found: next.found });
  return next;
}
