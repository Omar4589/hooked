# Hooked — Claude Code prompts

One prompt per phase (0–9). Each points Claude Code at the spec sections it needs and ends at that phase's "done when." Use plan mode for every one, read the plan before approving, `/clear` between phases, commit at each done-when.

## Launch

For the setup prompt and phase 7 (both read the reference repo):

```
cd hooked && claude --add-dir ~/Desktop/canvass-app
```

Every later session:

```
cd hooked && claude
```

## 0. Project setup (monorepo)

```
Read CLAUDE.md and docs/DESIGN.md §11. Then read ~/Desktop/canvass-app:
the root package.json and workspace config, the app's package.json,
app.json or app.config, eas.json, metro and babel config, and how EAS
Update channels are set up. List what you'll mirror before doing
anything. Then set up Hooked as a monorepo with the same tooling:
apps/mobile (Expo, plain JS, EAS Build + Update with the same channel
scheme, a new EAS project and bundle identifier, no copied credentials
or secrets), packages/engine (pure JS + Jest), packages/levels, and
apps/playground (a minimal Vite web page that imports @hooked/engine).
Don't copy any app code from canvass-app, only setup. Finish with a
hello-world screen running on my phone. Plan first.
```

## 1. Engine, no screen

```
Read docs/DESIGN.md §3, §4, §10 and §11. Plan phase 1: packages/engine
as a pure JS package with Jest tests: board generation with no starting
matches, match detection by size, swap legality, gravity and refill,
cascades, scoring, seeded RNG. Add packages/engine/scripts/play.js that
plays random moves and prints the board as text. Write the tests first.
Stop at phase 1's "done when" and don't start phase 2.
```

## 2. Bare board on your phone

```
Read docs/DESIGN.md §3, the Rendering and step list in §11, and the
step-to-animation table in §16. Plan phase 2: in apps/mobile, render a
9x9 board from @hooked/engine with placeholder pieces (colored circles
in the six palette colors, no images), swipe-to-swap with
react-native-gesture-handler, and a step player that animates swap,
clear, fall and spawn with react-native-reanimated using the §16
durations. No HUD, no backgrounds, no specials yet. Done when I can play
a bare board on my phone and it feels smooth. Stop there.
```

## 3. Specials and the meter

The [verify] items are settled by decision in DESIGN.md §3–§6 (2026-09-10); no Fishdom homework is needed.

```
Read docs/DESIGN.md §4 and the decided rules there (blast shapes,
meter, combos, firing; settled 2026-09-10). Plan phase 3: in
packages/engine add specials by match size (puff, bobble, popcorn,
yarnbomb), the frog meter and the hook meter, firing by swap,
double-tap (game.tap), chain and match, and combos, with tests for every
blast shape and the meter. Then in apps/mobile add the blast, frogRip,
meter and meterDrop animations per §16, still with placeholder art.
Done when every row of the §4 table works on my phone and reads
clearly. Stop there.
```

## 4. Level rules

```
Read docs/DESIGN.md §5, §6, §10 and §11. Plan phase 4: level JSON
loader and schema validation in packages/levels; in packages/engine the
five goal types, three blockers, bead spawning and exits, move counter,
win/lose and Yarn Over with coins, all with tests; in apps/mobile the
goals bar, move counter and simple win/lose screens with placeholder
art. Write three test levels in packages/levels: one stitch, one
collect plus beads, one clear with moths. Done when I can load each,
win it and lose it, and watch stitch squares fill in. Stop there.
```

## 5. Vertical slice: level 1 finished

```
Read docs/DESIGN.md §12, §15 and §16, and docs/design/ (the style
sheet and concept art). Plan phase 5: replace placeholder pieces with
react-native-svg components in the palette for the six yarn balls, the
four special overlays, frog, hook, bead, tangle, knot, moth and the
tiles; build the level card with goals and booster picker, the HUD, and
a win screen that shows the coaster illustration; add sounds
with expo-audio and haptics with expo-haptics. Level 1 only. Done when
level 1 feels like a finished game. Stop there.
```

## 6. Book 1 and the Craft Nook

```
Read docs/DESIGN.md §7, §8, §9 and §11. Plan phase 6: the Room as home
screen (Craft Nook) with a Play button, the shop, placing and moving
decor, beauty stars, three creatures with idle animations, projects
placing themselves, save/load with expo-sqlite/kv-store behind src/meta/storage.js, lives, boosters, win streak,
daily yarn basket, the Pattern Book, and a local telemetry log of every
attempt. Then author levels 1–15 per §9 with Twelve Coasters as level
15, run the bot sim on each, report pass rates against the §11 targets
and adjust. Done when Book 1 plays start to finish, the Nook can reach
3 stars, and everything survives an app restart. Stop there.
```

## 7. Backend, wallet, grants and purchases

```
Read docs/DESIGN.md §8 and the Backend section of §11. Then read how
~/Desktop/canvass-app structures its Express server, MongoDB models,
env handling, auth, and its Heroku deployment from the monorepo
(Procfile, buildpacks, scripts), and mirror those conventions. Plan
phase 7: apps/api as an Express + MongoDB service with the routes and
collections from §11; anonymous auth with a JWT and Sign in with Apple
and Google linking; the wallet ledger with idempotent clientId entries,
a cached balance, queued offline changes and POST /wallet/sync;
players.vip; a progress document per player (PUT /progress,
last-write-wins by version) for cloud save; grants and codes collections with admin routes behind an
admin key; apps/admin as a minimal React page to find a player and
grant markers, coins, lives, unlimited-lives time or VIP;
Redeem Code and Delete Account in Settings; RevenueCat with marker
packs, the Starter Bundle and the Yarn Bank, credited only through its
webhook; the gift popup from Skein when a grant or code lands; the
attempt log posting to the server; a Heroku deployment of apps/api
next to canvass-app's. Sandbox purchases only. Done when I can grant
myself 50 markers from the admin page and watch them arrive on my
phone, redeem a code, buy a pack in sandbox, and see every event in
the ledger on the deployed API. Stop there.
```

## 8. Art and content pass

```
Read docs/DESIGN.md §9, §15 and §16. Plan phase 8: integrate the
finished art in apps/mobile/src/art, from docs/design/ (rooms 2–3, decor sets, creatures, project
illustrations, economy UI), author books 2–3 (levels 16–45) with bot
sims and pass rates, and wire the project illustrations into the Pattern Book and
win screens. Done when 45 levels and 3 rooms have their art. Stop there.
```

## 9. Release

```
Read the Shipping notes in docs/DESIGN.md §11 and the tribute touches
in §13. Plan phase 9: a performance pass on iPad, the tribute touches,
privacy policy and the account-deletion check, age rating and IAP
products in App Store Connect and Play Console, store listing text and
screenshots, EAS Build to TestFlight and an internal Play track, an
`eas update` check on the installed build, then submission. Done when
the app is approved on both stores.
```

## Mid-phase prompts

- `Run the engine tests and fix failures without changing behavior.`
- `Run the bot sim on level 12 and report pass rates before changing anything.`
- `You're drifting into TypeScript / adding images early. Re-read CLAUDE.md and correct it.`
- `Summarize what's done against phase N's "done when" and what's left.`
- `Update docs/DESIGN.md to reflect what we actually built in this phase.`
