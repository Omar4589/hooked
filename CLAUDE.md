# Hooked — a crochet match-3, a tribute that ships

## What this is
A React Native (Expo) match-3 modeled on Fishdom, themed around crochet, built
as a commercial release with in-app purchases. The full design is in `docs/DESIGN.md`. Before planning any work, read the
sections relevant to the current phase; §11 has the architecture, the
monorepo layout, and the build order with a "done when" for each phase.
Open questions for the owner live in `docs/QUESTIONS.md`; the per-phase prompts in `docs/PROMPTS.md`.

## Monorepo
- Same tooling and conventions as `~/Desktop/canvass-app`: npm, Node 22.x (`.nvmrc` and a Volta pin), Expo +
  EAS Build, the same `eas.json` profiles and EAS Update channel scheme
  (`development` / `preview` / `staging` / `production`), the same fingerprint
  runtime policy and `ota:*` scripts, and an Express + Mongoose API deployed to
  Heroku from the repo root (`Procfile`). One deliberate departure: this repo
  uses **npm workspaces** (`apps/*`, `packages/*`, one root lockfile) because
  `@hooked/engine` and `@hooked/levels` must be shared by the mobile app and the
  playground; canvass-app links its three apps with `npm --prefix` instead.
  Mirror the tooling, never the identity: Hooked has its own EAS project,
  bundle identifier and package name, and no credentials, env files or
  secrets copied from canvass-app. Never copy app code from canvass-app.
- Layout: `apps/mobile` (Expo app), `apps/playground` (Vite web harness for
  the engine), `apps/api` (Node/Express API with MongoDB, deployed to Heroku
  the way canvass-app is; routes arrive in phase 7), `apps/admin` (small React
  page over the admin routes; phase 7), `packages/engine` (`@hooked/engine`),
  `packages/levels` (`@hooked/levels`), `docs/DESIGN.md`.

## Rules
- Plain JavaScript with JSDoc comments. No TypeScript, no `.ts`/`.tsx` files.
- `packages/engine` is pure: no imports from `react`, `react-native` or
  `expo`, and no dependency on the apps. It takes a level + seed and returns
  steps. The engine never knows about animation; animation lives in the step
  player in `apps/mobile/src/game`.
- Every change to `packages/engine` ships with a Jest test. Run the engine
  tests before calling a task done.
- Levels are JSON in `packages/levels` and follow `docs/DESIGN.md §10`.
  Never hardcode a level in code.
- Names are fixed: colors `olive, mustard, blush, rust, lavender, cocoa`;
  specials `puff, bobble, popcorn, yarnbomb, hook`; piece kinds `yarn, frog, bead`; goals
  `stitch, collect, beads, clear, buried`; blockers `tangle, knot, moth`.
  They live once, in `packages/engine/src/constants.js`.
- Placeholder art (colored circles) until phase 5. Don't add or generate
  images before then.
- One phase at a time, in the §11 order. Plan first, tests second, code
  third. Stop at the phase's "done when" and report; don't start the next
  phase unasked.
- Money and identity are server-side (DESIGN.md §11 Backend). The client never
  credits stitch markers; purchases go through RevenueCat and its webhook.
  Play works offline; the wallet reconciles on reconnect with idempotent
  ledger entries. `apps/api` mirrors canvass-app's Express, MongoDB, env and
  Heroku conventions; secrets only in env, never in the repo.
- Never copy Fishdom's names, art or text into the app. Reference only.
- Her first name appears in exactly two places, the credits line and the hidden
  level's note (DESIGN.md §13), and nowhere else. Never her surname, never her
  photos: the photos in `docs/reference/photos/` are references for the artist
  and never ship.
- Navigation goes through `apps/mobile/src/nav.js`; persistence through
  `apps/mobile/src/meta/storage.js`. Screens never import the navigator or the
  storage library directly.
- If something in the spec is ambiguous, ask rather than guess. Mechanics marked
  **Decided** in DESIGN.md §3–§6 and §8 are ours, not Fishdom's; keep them easy
  to change and don't re-open them without the owner.

## Commands
All from the repo root unless noted:
- all tests (engine, levels, api): `npm test`
- engine tests only: `npm test -w packages/engine`
- run the app: `npx expo start` inside `apps/mobile` (or `npm run mobile`)
- web playground: `npm run dev:playground` (http://localhost:5174)
- API: `npm run dev:api` (needs `apps/api/.env`, see `apps/api/.env.example`)
- text playthrough of a level: `node packages/engine/scripts/play.js <level.json>` (phase 1)
- ship a JS/asset update: `npm run ota:production` (or `ota:staging`) inside
  `apps/mobile`; both run the fingerprint check first.

## Style
- Small modules with one responsibility each. Plain functions over classes;
  arrow functions for new code.
- Prettier, config in `.prettierrc` (single quotes, 100 columns): `npm run format`.
- Commit after each phase: `phase 0: monorepo`, `phase 1: engine`, etc.
