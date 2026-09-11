// Keeps inert edits from moving the fingerprint. app.json sets runtimeVersion policy
// "fingerprint", so a phone only accepts an OTA whose fingerprint matches the binary it
// runs; if a harmless edit re-stamps the tree, `eas update` still says "success" and the
// bundle reaches nobody. canvass-app was bitten three times, by three classes of edit:
//   · app.json "version" — inert here, eas.json sets appVersionSource "remote";
//   · eas.json's `submit` block — read only by `eas submit`, never compiled in;
//   · npm scripts — build-time tooling, never in the binary.
// Everything that DOES reach the binary (plugins, native deps, permissions, icons, build
// profiles) still hashes. scripts/ota-check.mjs is the backstop that refuses a mismatched
// publish loudly.
//
// WARNING: editing THIS file changes every fingerprint. Only touch it in a commit that
// also ships a new native build, never in an OTA-only change.

module.exports = {
  // NOTE: this REPLACES @expo/fingerprint's default skip set, so the stock default is
  // re-listed explicitly.
  sourceSkips: [
    'PackageJsonScriptsAll', // no npm script reaches the binary
    'PackageJsonAndroidAndIosScriptsIfNotContainRun', // the stock default, kept on purpose
    'ExpoConfigVersions', // app.json version / android.versionCode / ios.buildNumber
  ],

  // eas.json is hashed whole-file, so strip the submit-only section before hashing. Called
  // once per streamed chunk of each hashed file; `this` is the per-file transform stream.
  // Every path returns deterministic bytes: on a parse surprise we hash the raw file.
  fileHookTransform(source, chunk, isEndOfFile) {
    if (source.type !== 'file' || source.filePath !== 'eas.json') return chunk;
    this._easBuf ??= [];
    if (chunk != null) this._easBuf.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (!isEndOfFile) return null;
    const whole = Buffer.concat(this._easBuf).toString('utf8');
    this._easBuf = null;
    try {
      const json = JSON.parse(whole);
      delete json.submit;
      return JSON.stringify(json);
    } catch {
      return whole;
    }
  },
};
