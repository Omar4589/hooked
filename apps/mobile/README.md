# Hooked mobile

Expo SDK 57 app, plain JavaScript, React Navigation native-stack. Runs in **Expo Go** for now
(nothing here needs a custom native module yet), so day one is `npx expo start` and a QR code.

## Four build flavors

Same scheme as canvass-app. The **channel** baked into each binary is what separates the
lanes, never the store or the track.

| Profile | Channel | What it is | Goes to |
|---|---|---|---|
| `development` | `development` | Dev Client + dev server | Day-to-day coding once a native module needs it (phase 7 at the latest); run `npx expo install expo-dev-client` first, a native change that moves the fingerprint |
| `preview` | `preview` | Signed, internal distribution | Ad-hoc installs; iOS needs registered device UDIDs |
| `staging` | `staging` | Signed for stores | **TestFlight** + **Play internal track**: her phone, testers |
| `production` | `production` | Signed for stores | **App Store** + **Play production track**: everyone |

`staging` is `extends: production`, so the two are byte-identical apart from the channel and
share a **fingerprint**: one JS-only commit can feed both lanes without a rebuild.

## Setup state

Done on 2026-09-10:

- **EAS project** `@omar4589/hooked` (id `fb9c9a73-47a6-4c90-a0c6-9178127717d2`); app.json
  carries `extra.eas.projectId` and `updates.url`.
- **Identifiers**, final: `ios.bundleIdentifier` and `android.package` are both
  `com.omarzumaya.hooked`; slug and scheme `hooked`. The on-device name and the store name are
  "Yarn Over"; "Hooked" is the codename (slug, scheme, bundle id).

Still placeholders, fill before the first `eas build`:

- **API URLs** in `eas.json` (`development` = your Mac's LAN IP from `ipconfig getifaddr en0`;
  `preview` / `production` = the Heroku API host, phase 7).
- **Submit identity** in `eas.json` `submit.*`: your Apple ID, team id, the new App Store
  Connect app id, and later a Play service-account key path (gitignored). Nothing was copied
  from canvass-app on purpose: Hooked is its own app with its own credentials.

The `ota:*` scripts and `scripts/ota-check.mjs` run `eas-cli` through `npx` pinned to major 24, so
they depend on neither the global `eas-cli` (18.x on this Mac) nor the active Node version. For
one-off commands use `npx eas-cli@24 <command>` from `apps/mobile`.

## Day to day

```bash
npx expo start                  # Metro + QR; open in Expo Go on the phone (same Wi-Fi)
npm test                        # node --test over src/game/*.test.js (the pure modules)
npm run ota:staging             # JS/assets to TestFlight + Play internal (fingerprint-checked)
npm run ota:production          # JS/assets to real users (fingerprint-checked)
npm run ota:check               # compare the tree's fingerprint to the fielded builds, publish nothing
```

`ota:staging` and `ota:production` run `scripts/ota-check.mjs` first (`ota:preview` does not):
under `runtimeVersion: { policy: "fingerprint" }` a phone only installs an update whose
fingerprint matches its binary, and a mismatched publish "succeeds" while reaching nobody.
`fingerprint.config.js` keeps three inert inputs (app.json `version`, the `submit` block, npm
scripts) out of the hash; editing that file itself changes every fingerprint, so it only
changes alongside a new native build.

Native inputs (a new native dependency, a plugin, an icon, a permission) need fresh binaries:
`eas build --profile <staging|production> --platform <ios|android>`, four builds from one
commit, then `eas submit` with each build id. Expo Go tracks the newest SDK only, so expect
one SDK bump (`npx expo install expo@latest --fix`, then bump the `react` / `react-dom`
overrides in the root package.json to match) when Expo Go moves to SDK 58, and switch to a
development build at phase 7 when RevenueCat arrives.

## Layout

- `index.js` registers `App.jsx`: gesture root, safe-area provider, one native stack.
- `src/` — see `src/README.md` for the §11 folders; `src/nav.js` is the only way to navigate.
- `assets/` — icon and splash placeholders from the Expo template until phase 5.
