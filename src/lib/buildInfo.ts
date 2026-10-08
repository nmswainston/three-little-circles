import Constants from "expo-constants";
import { BUILD_COMMIT } from "./buildCommit";

export type BuildInfo = {
  /** The app's marketing version, for example 1.0.0. */
  version?: string;
  /** The store build number: Android versionCode or iOS buildNumber. */
  build?: string;
  /** The short git commit the build was made from. */
  commit?: string;
  /** The short id of the over-the-air update running on top of the build, if any. */
  updateId?: string;
};

/** One line saying which build a guest is on, or an empty string when nothing is known. */
export function formatBuildInfo({ version, build, commit, updateId }: BuildInfo): string {
  const parts = [
    version ? `Version ${version}` : undefined,
    build ? `build ${build}` : undefined,
    commit,
    updateId ? `update ${updateId}` : undefined,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Reads what this build knows about itself. Every part is optional. */
export function readBuildInfo(): BuildInfo {
  const config = Constants.expoConfig;
  const build = config?.android?.versionCode ?? config?.ios?.buildNumber;

  let updateId: string | undefined;
  try {
    // Loaded on demand so a screen that shows this still renders where the
    // updates module is not available, such as the web build.
    const Updates: typeof import("expo-updates") = require("expo-updates");
    if (Updates.isEmbeddedLaunch === false && Updates.updateId) updateId = Updates.updateId.slice(0, 7);
  } catch {
    updateId = undefined;
  }

  return {
    version: config?.version,
    build: build === undefined ? undefined : String(build),
    commit: BUILD_COMMIT,
    updateId,
  };
}
