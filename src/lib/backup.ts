import type { Appearance, MapType } from "../store/useSettingsStore";
import type { ConfirmationStatus } from "./confirm";

/**
 * Progress backups: a small JSON document wrapped in a message you can send
 * yourself, then paste into the app on another phone. Everything here is
 * pure; src/store/backup.ts reads and writes the stores.
 */
export const BACKUP_APP = "three-little-circles";
export const BACKUP_FORMAT = 1;

export type BackupSettings = {
  appearance: Appearance;
  mapType: MapType;
  hideFound: boolean;
  hintMode: boolean;
};

export type BackupAchievements = {
  unlocked: string[];
  earnedAt: Record<string, number>;
  seen: string[];
};

export type BackupReports = Record<string, { status: ConfirmationStatus; at: number }>;

/** What lives on a device and travels in a backup. */
export type BackupData = {
  found: Record<string, number>;
  achievements: BackupAchievements;
  settings: BackupSettings;
  reports: BackupReports;
};

export type Backup = {
  app: typeof BACKUP_APP;
  format: number;
  exportedAtISO: string;
  found: Record<string, number>;
  achievements: BackupAchievements;
  /** Absent in a backup that was hand-trimmed; import then keeps the device's own. */
  settings?: BackupSettings;
  reports?: BackupReports;
};

const APPEARANCES: Appearance[] = ["system", "day", "night"];
const MAP_TYPES: MapType[] = ["standard", "hybrid"];
const STATUSES: ConfirmationStatus[] = ["seen", "missing"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isTimestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function cleanFound(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(value)) return out;
  for (const [id, at] of Object.entries(value)) {
    if (isNonEmptyString(id) && isTimestamp(at)) out[id] = Math.floor(at);
  }
  return out;
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isNonEmptyString)));
}

function cleanAchievements(value: unknown): BackupAchievements {
  const record = isRecord(value) ? value : {};
  return { unlocked: cleanIds(record.unlocked), earnedAt: cleanFound(record.earnedAt), seen: cleanIds(record.seen) };
}

function cleanSettings(value: unknown, fallback?: BackupSettings): BackupSettings | undefined {
  if (!isRecord(value)) return undefined;
  const appearance = APPEARANCES.includes(value.appearance as Appearance) ? (value.appearance as Appearance) : fallback?.appearance;
  const mapType = MAP_TYPES.includes(value.mapType as MapType) ? (value.mapType as MapType) : fallback?.mapType;
  const hideFound = typeof value.hideFound === "boolean" ? value.hideFound : fallback?.hideFound;
  const hintMode = typeof value.hintMode === "boolean" ? value.hintMode : fallback?.hintMode;
  if (appearance === undefined || mapType === undefined || hideFound === undefined || hintMode === undefined) return undefined;
  return { appearance, mapType, hideFound, hintMode };
}

function cleanReports(value: unknown): BackupReports {
  const out: BackupReports = {};
  if (!isRecord(value)) return out;
  for (const [id, report] of Object.entries(value)) {
    if (!isNonEmptyString(id) || !isRecord(report)) continue;
    if (STATUSES.includes(report.status as ConfirmationStatus) && isTimestamp(report.at)) {
      out[id] = { status: report.status as ConfirmationStatus, at: Math.floor(report.at) };
    }
  }
  return out;
}

/** Wraps the device's data as a backup. */
export function buildBackup(data: BackupData, now: number = Date.now()): Backup {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAtISO: new Date(now).toISOString(),
    found: { ...data.found },
    achievements: {
      unlocked: [...data.achievements.unlocked],
      earnedAt: { ...data.achievements.earnedAt },
      seen: [...data.achievements.seen],
    },
    settings: { ...data.settings },
    reports: { ...data.reports },
  };
}

/** The message to send yourself: a plain-English header, then the JSON. */
export function backupToText(backup: Backup): string {
  const finds = Object.keys(backup.found).length;
  const badges = backup.achievements.unlocked.length;
  return [
    `Three Little Circles backup: ${finds} find${finds === 1 ? "" : "s"}, ${badges} badge${badges === 1 ? "" : "s"}, exported ${backup.exportedAtISO.slice(0, 10)}.`,
    "Paste this whole message into Profile > Import progress on your other phone. Keep the code below intact.",
    "",
    JSON.stringify(backup),
  ].join("\n");
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; message: string };

/** Reads a backup out of pasted text, tolerating whatever was typed around it. */
export function parseBackup(text: string): ParseResult {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1) {
    return { ok: false, message: "That doesn't look like a Three Little Circles backup." };
  }
  const incomplete = { ok: false as const, message: "The backup code is incomplete or damaged. Paste the whole message." };
  if (end <= start) return incomplete;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return incomplete;
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, message: "That's not a Three Little Circles backup." };
  }
  // A well-formed object that merely names the app is not a backup. Without
  // a supported format and the payload it would read as an empty backup, and
  // Replace would then wipe the phone on the strength of nothing.
  const format = raw.format;
  if (!Number.isInteger(format) || (format as number) < 1) return incomplete;
  if ((format as number) > BACKUP_FORMAT) {
    return { ok: false, message: "This backup is from a newer version of the app. Update the app, then try again." };
  }
  if (!isRecord(raw.found) || !isRecord(raw.achievements)) return incomplete;
  const exportedAtISO = typeof raw.exportedAtISO === "string" && !Number.isNaN(Date.parse(raw.exportedAtISO)) ? raw.exportedAtISO : "";
  const backup: Backup = {
    app: BACKUP_APP,
    format: format as number,
    exportedAtISO,
    found: cleanFound(raw.found),
    achievements: cleanAchievements(raw.achievements),
  };
  const settings = cleanSettings(raw.settings);
  if (settings) backup.settings = settings;
  if (isRecord(raw.reports)) backup.reports = cleanReports(raw.reports);
  return { ok: true, backup };
}

export type BackupSummary = {
  finds: number;
  badges: number;
  /** Finds in the backup this device hasn't marked. */
  newFinds: number;
  /** Finds for entry ids this version of the app doesn't have. */
  unknownFinds: number;
  hasSettings: boolean;
  reports: number;
  exportedAtISO: string;
};

export function summarizeBackup(backup: Backup, currentFound: Record<string, number>, knownIds: Set<string>): BackupSummary {
  const ids = Object.keys(backup.found);
  return {
    finds: ids.length,
    badges: backup.achievements.unlocked.length,
    newFinds: ids.filter((id) => !(id in currentFound)).length,
    unknownFinds: ids.filter((id) => !knownIds.has(id)).length,
    hasSettings: backup.settings !== undefined,
    reports: Object.keys(backup.reports ?? {}).length,
    exportedAtISO: backup.exportedAtISO,
  };
}

const earliest = (a: Record<string, number>, b: Record<string, number>): Record<string, number> => {
  const out = { ...a };
  for (const [id, at] of Object.entries(b)) out[id] = id in out ? Math.min(out[id], at) : at;
  return out;
};

const union = (a: string[], b: string[]): string[] => Array.from(new Set([...a, ...b]));

/**
 * Merge: everything the backup found, this device found too, keeping the
 * earlier date for each. Badges and reports union the same way. Settings
 * stay as they are on this device.
 */
export function mergeBackup(current: BackupData, backup: Backup): BackupData {
  const reports: BackupReports = { ...current.reports };
  for (const [id, report] of Object.entries(backup.reports ?? {})) {
    if (!(id in reports) || report.at > reports[id].at) reports[id] = report;
  }
  return {
    found: earliest(current.found, backup.found),
    achievements: {
      unlocked: union(current.achievements.unlocked, backup.achievements.unlocked),
      earnedAt: earliest(current.achievements.earnedAt, backup.achievements.earnedAt),
      seen: union(current.achievements.seen, backup.achievements.seen),
    },
    settings: current.settings,
    reports,
  };
}

/** Replace: this device ends up matching the backup. Settings too, when the backup has them. */
export function replaceWithBackup(current: BackupData, backup: Backup): BackupData {
  return {
    found: { ...backup.found },
    achievements: {
      unlocked: [...backup.achievements.unlocked],
      earnedAt: { ...backup.achievements.earnedAt },
      seen: [...backup.achievements.seen],
    },
    settings: backup.settings ?? current.settings,
    reports: { ...(backup.reports ?? {}) },
  };
}
