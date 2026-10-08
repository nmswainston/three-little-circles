// Runs on EAS builders after dependencies install (the eas-build-post-install
// hook in package.json). It writes the short git commit the build was made
// from into src/lib/buildCommit.ts, which the Profile screen shows so a phone
// can say which build it is running.
//
// The commit lives in a source file, not the app config, on purpose: the
// runtime version is a fingerprint of the native project and app config, so a
// value that changed with every commit there would give every commit its own
// runtime version.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const commit = process.env.EAS_BUILD_GIT_COMMIT_HASH?.slice(0, 7);
if (!commit) {
  console.log('No EAS_BUILD_GIT_COMMIT_HASH, leaving src/lib/buildCommit.ts as it is.');
  process.exit(0);
}

const target = fileURLToPath(new URL('../src/lib/buildCommit.ts', import.meta.url));
writeFileSync(
  target,
  `// Rewritten on EAS builders by scripts/write-build-commit.mjs. Undefined everywhere else.\nexport const BUILD_COMMIT: string | undefined = ${JSON.stringify(commit)};\n`
);
console.log(`Wrote build commit ${commit} to src/lib/buildCommit.ts.`);
