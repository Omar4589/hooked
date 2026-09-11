// Refuses to publish an OTA that no phone can download.
//
//   node scripts/ota-check.mjs [--platform=android,ios] [--build-profile=<name>]   (from apps/mobile)
//
// app.json uses runtimeVersion { policy: "fingerprint" }: a phone only installs an update
// whose fingerprint EXACTLY matches the one baked into its binary. The fingerprint hashes
// app.json / eas.json / package.json / autolinked native modules, never app JS, so a native
// input that moved since the last build means this tree's update would reach nobody, and
// `eas update` would still print "success". This compares the working tree's fingerprint
// against the newest finished build of the given profile and exits non-zero on a mismatch,
// BEFORE anything is published. See fingerprint.config.js for the inputs deliberately kept
// out of the hash.

import { execFileSync } from 'node:child_process';

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;

const PLATFORMS = arg('platform', 'android,ios')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
// 'production' is the fielded fleet; ota:staging passes --build-profile=staging.
const BUILD_PROFILE = arg('build-profile', 'production');

// eas-cli runs through npx pinned to its major, so neither the global install nor the active
// Node version matters (Expo's doctor rejects eas-cli as a project dependency).
const run = (args) =>
  execFileSync('npx', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

// The tree's fingerprint from the same resolver EAS uses (so fingerprint.config.js applies).
const localFingerprint = (platform) => {
  const out = run(['expo-updates', 'fingerprint:generate', '--platform', platform]);
  return JSON.parse(out).hash;
};

// The newest finished build's runtimeVersion IS its fingerprint under this policy.
const latestBuild = (platform) => {
  const out = run([
    '--yes',
    'eas-cli@24',
    'build:list',
    '--platform',
    platform,
    '--build-profile',
    BUILD_PROFILE,
    '--status',
    'finished',
    '--limit',
    '1',
    '--json',
    '--non-interactive',
  ]);
  const [build] = JSON.parse(out);
  return build ?? null;
};

let failed = false;

for (const platform of PLATFORMS) {
  const local = localFingerprint(platform);
  const build = latestBuild(platform);

  if (!build) {
    console.error(
      `✖ ${platform}: no finished ${BUILD_PROFILE} build found — nothing to publish to.`,
    );
    failed = true;
    continue;
  }

  if (build.runtimeVersion === local) {
    console.log(
      `✓ ${platform}: ${local.slice(0, 10)}… matches build ${build.appBuildVersion} — the OTA will land.`,
    );
    continue;
  }

  failed = true;
  console.error(
    `\n✖ ${platform}: FINGERPRINT MISMATCH — this update would reach NOBODY.\n` +
      `    tree:  ${local}\n` +
      `    build: ${build.runtimeVersion}  (${build.appBuildVersion}, ${build.appVersion})\n\n` +
      `  A native input changed, so no installed ${platform} build will accept this bundle.\n` +
      `  See which sources moved:  npx eas fingerprint:compare --build-id ${build.id}\n` +
      `  Then either revert that change, or cut a new build and submit it.\n`,
  );
}

// The one legitimate override: you just cut a build and are publishing its first update
// before EAS lists it as finished. It stays loud on purpose.
if (failed && process.env.OTA_ALLOW_MISMATCH === '1') {
  console.warn(
    '\n⚠️  OTA_ALLOW_MISMATCH=1 — publishing anyway. This update may reach no devices.\n',
  );
  process.exit(0);
}

process.exit(failed ? 1 : 0);
