# Owner questions and answers

Asked at the end of phase 0 and answered by the owner on 2026-09-10. Each item keeps the
original question, the owner's answer in short, the decision it produced and where that
decision now lives. Decisions live in DESIGN.md; this file is the record.

## Second round (2026-09-10, later the same day)

- Credits keep her first name and the level 7000 line: "For Faith, who is at level 7000."
  The hidden level stays, its note now "Fastened off. For Faith, who is at level 7000. Thank
  you for every stitch." Her name appears in those two places only. Items 9 and 25.
- Store name: the public one shoppers see is the one that must be unique; the bundle id is
  what Apple sees internally and is already set. Candidate then: Yarniverse, dropped the same day
  (already a yarn-space brand); the third round settled on **Yarn Over**. Item 22.
- Google Play: the account canvass-app ships under. Item 23.
- Age rating: the same as Fishdom, 4+ / Everyone, with a 13+ declared audience. Item 24.

## Still open

- Nothing at the moment. The store name (Yarn Over) gets its final check when the App Store
  Connect record is created.

## Answer before phase 1 (engine)

### 1. Is the Frog a colorless piece of its own (kind 'frog', as §11's typedef has it) or a special riding on a colored ball (as CLAUDE.md's specials list and constants.js SPECIALS read), and when Fishdom's Lightning fires without a swap partner (tapped in place, or set off by a Bomb's blast) which color does it clear?

**Owner.** Make the best call; the game only has to feel like Fishdom.

**Decision.** The frog is its own colorless piece (`kind: 'frog'`); `SPECIALS` no longer lists it; fired with no swap partner it rips the most common color.

**Recorded in.** DESIGN §4; CLAUDE.md names; packages/engine/src/constants.js

<details><summary>Why it was asked</summary>

Phase 1 fixes the Piece shape and the SPECIALS constant every later package uses; phase 3 then needs a color for frogRip on three paths that have no swap partner (game.tap, a blast chain 'a Puff that hits a Bobble that hits the Frog', Frog + special combos) and §4 only names 'most common color' for the combo case. The §11 typedef and CLAUDE.md disagree today, so a phase-1 session would have to guess the data model.

**Default offered.** Colorless piece: kind 'frog' per §11, taken out of SPECIALS and kept with 'hook' in a METER_PIECES constant so the fixed names survive; with no swap partner it rips the most common color on the board (Frog + Frog: the two most common); any blast whose area covers it sets it off.

</details>

## Answer before phase 2–3 (board on the phone, specials)

### 2. Count the cells Fishdom's power-ups clear: Firecracker (a plus of 5, or a 3x3 of 9?), Bomb (13-cell diamond, 21-cell 5x5-minus-corners, or a full 5x5?), Dynamite and Warhead likewise, and do blasts pass over holes and crates or stop at them?

**Owner.** Our own rules; counting Fishdom cells is impractical.

**Decision.** Rounded squares: Puff 5, Bobble 21, Popcorn 45, Yarn Bomb 77; blasts pass over holes, damage tangles/moths/knots inside, leave beads; a cascade special spawns at the run's middle cell.

**Recorded in.** DESIGN §3, §4

<details><summary>Why it was asked</summary>

Phase 3 encodes every blast shape as a Jest test and sizes the blast-ring animation from it. The spec contradicts itself in one sentence: 'every cell whose center lies within r cell-widths' gives 13 cells for r=2 (cell (2,1) is 2.24 away), but the parenthetical '(for r = 2, a 5x5 minus its corners)' is 21 cells. One has to be picked before tests are written, and only Fishdom can say which. A cascade-made special also has no spawn-position rule (§3 only covers the swapped piece).

**Default offered.** Rounded squares: (2r+1)^2 minus the four corner cells, so Bobble 21, Popcorn 45, Yarn Bomb 77; Puff is a plus of 5. Holes and tangles inside the area are simply not cleared (the blast does not stop). Special spawns at the swapped piece; for a cascade-made run, at the middle cell of the run (corner for L/T).

</details>

### 3. On one Fishdom level, how many Firecrackers alone fill the Lightning meter (and how many Bombs), and if you win with the meter half full, is it still half full when the next level starts?

**Owner.** Our own rules.

**Decision.** Spec charge rates stand; meter resets every attempt; a full meter drops a frog even with one on the board; rips and the Hook do not charge it.

**Recorded in.** DESIGN §4

<details><summary>Why it was asked</summary>

The charge table (+1/+2/+3/+4, +2 multi-fire bonus, full at 10) is a guess the phase 3 meter tests will hard-code. Carry-over changes the engine API (createGame would need an initial charge) and what phase 6's progress store persists; the same observation settles whether a second frog can drop while one is still on the board and whether the Hook or the frog's own rip charges the meter.

**Default offered.** Spec values (Puff +1, Bobble +2, Popcorn +3, Yarn Bomb +4, +2 when several fire in one step, full at 10); the meter starts at 0 every attempt (only the Frog Ready booster fills it); a full meter drops a frog even if one is already on the board; the frog's rip and the Hook do not charge it.

</details>

### 4. When you swap two power-ups in Fishdom (Bomb+Bomb, Firecracker+Warhead, Energy Blast+Bomb, Energy Blast+Energy Blast), does it fire one bigger blast, both blasts, or a special combined pattern, and how big?

**Owner.** "It says Combo ×3, Combo ×4." (My reading: that is Fishdom's cascade banner, now in §3; the owner did not address swapping two specials.)

**Decision.** Cascade banner added to §3 (*Combo ×N*). Special + special (my default, not an owner call): one blast of radius max(r₁, r₂) + 1; Hook + Hook a cross; Hook + blast both; Frog + Frog two colors; Frog + Hook hook plus most common color.

**Recorded in.** DESIGN §3, §4

<details><summary>Why it was asked</summary>

§4 gives a single data point ('two Bobbles ≈ one Popcorn-sized blast, and so on') and no rule for mixed sizes or anything involving the Hook. Phase 3 must implement and test a formula for every pair, and the combo animation size follows it.

**Default offered.** Combined radius = max(r1, r2) + 1 with Puff counting as r=1, capped one step above Yarn Bomb; Hook + Hook = 3 rows and 3 columns (a cross); Hook + blast = both fire from the swap cell; Frog + Hook = hook fires and the frog rips the most common color.

</details>

### 5. In Fishdom, when a single 3-match lies alongside a 2-layer crate, does the crate lose one layer or two, and does a Bomb whose area covers a crate (or an ice-locked piece) damage it directly even when none of its neighbours cleared?

**Owner.** Our own rules.

**Decision.** One layer per match touching a tangle, one per blast covering or touching it; knotted balls in a blast clear; a stitch counts by match or blast.

**Recorded in.** DESIGN §5

<details><summary>Why it was asked</summary>

§5 says 'each adjacent match or blast removes one layer' but the §11 resolution loop damages only 'tangles/moths adjacent to cleared cells', so as written a blast covering the middle of a three-thick tangle wall does nothing, and a match with two balls touching one tangle might strip two layers. Phase 4's blocker tests and the bot-sim difficulty of every Clear and Buried level in Book 1 depend on this.

**Default offered.** One layer per match that touches the tangle (not per ball), plus one layer per blast whose area includes the cell (direct hit) or touches it; a knotted ball inside a blast area loses its knot and clears; a stitch square counts when the piece on it clears by match or blast.

</details>

### 6. Can a Fishdom drop item (the thing you bring to the bottom) be destroyed by a Bomb, and do new ones appear in any column or only where the level dictates?

**Owner.** Unsure what the item is; make our own rules. (Also reported: Fishdom's lives regenerate every 30 minutes.)

**Decision.** Lives stay at one per 20 minutes (§8) despite Fishdom's 30. Beads/buttons are indestructible; random spawner every `spawnEvery` moves; exits = lowest open cell per column; `sprite: "button"` on the goal.

**Recorded in.** DESIGN §6, §10

<details><summary>Why it was asked</summary>

§6 says beads 'can be swapped but not matched' and nothing about blasts; §10's exits default ('bottom open cell of every column') is undefined when a column's bottom cell is a tangle; and §6 says buttons are 'the same mechanic, different sprite' but §10 has no field to say so. Phase 4 builds bead spawning, exits and the collect-plus-beads test level, and Book 3's bead levels inherit the choice.

**Default offered.** Beads are indestructible (blasts and frog rips pass over them); a new bead drops from a random spawner every beads.spawnEvery moves until total is reached; exit = the lowest open cell of each column at level start, and a bead resting on a tangle waits; a goal-level 'sprite': 'button' picks the button art.

</details>

## Answer before phase 5–6 (art, Book 1, the room)

### 7. Which project does each of levels 1–15 make, and does every level put something in the Craft Nook or only the named projects?

**Owner.** Decide, or explain in plain English.

**Decision.** Book 1 is planned level by level with six Nook places.

**Recorded in.** docs/LEVELS-BOOK1.md; DESIGN §8 Nook catalogue

<details><summary>Why it was asked</summary>

§9 names four Book 1 projects and §15 adds Puff Flower and Twelve Coasters: six projects for fifteen levels (§11 phase 6 even calls them 'the 15 coaster levels'), while §2 and §8 say every won level places its project in the room. The v0.6 note says Book 1 is planned level by level in docs/LEVELS-BOOK1.md, which is not in the repo. Phase 6 authors all fifteen level JSONs (their project ids), the Nook's placement slots and the Pattern Book pages from this answer.

**Default offered.** 1–3 single coasters (meter none, Stitch), 4 dishcloth (tangles, Clear), 5 mug cozy (Collect, meter intro), 6–7 potholder (Stitch + tangles), 8 'untangle the stash' (knots, Clear, boosters), 9 Puff Flower (Collect), 10 dishcloth (Yarn Bomb), 11 buried buttons (Buried), 12 mug cozy wall (Tricky), 13–14 coasters, 15 Twelve Coasters. Five Nook slots (coaster stack on the side table, potholder hook, dishcloth, mug with cozy, Puff Flower); repeat projects add to their stack; every level gets a Pattern Book page.

</details>

### 8. Which persistence layer for progress, coins, room layout and lives: expo-sqlite/kv-store, AsyncStorage, or MMKV (which forces a development build at phase 6)?

**Owner.** The pro way, whatever fits the setup.

**Decision.** `expo-sqlite/kv-store` behind one `src/meta/storage.js` module: synchronous, ships with the SDK, runs in Expo Go; MMKV stays a one-file swap.

**Recorded in.** DESIGN §11 Persistence; PROMPTS phase 6; CLAUDE.md rule

<details><summary>Why it was asked</summary>

DESIGN §11 says 'MMKV (or AsyncStorage)' and PROMPTS phase 6 says MMKV. react-native-mmkv is absent from SDK 57's bundled module list and is a Nitro module that does not run in Expo Go, so choosing it moves the first native build from phase 7 (where react-native-purchases forces one anyway) to phase 6. SDK 57 bundles @react-native-async-storage/async-storage 2.2.0 (what canvass-app persists with; async-only) and expo-sqlite ~57.0.2, whose expo-sqlite/kv-store is documented as an AsyncStorage drop-in with synchronous getItemSync/setItemSync, so the room can render from saved state at boot with no empty flash. Cost of changing later: low if every access goes through one src/meta/storage.js, since all three share the AsyncStorage method shape.

**Default offered.** expo-sqlite/kv-store behind one storage module (sync API, Expo Go stays viable through phase 6, MMKV remains a one-file swap); update PROMPTS.md phase 6 and DESIGN §11 Persistence to say so.

</details>

### 9. Does she know Hooked exists, and what may appear in a build before she has okayed it: her name in the splash/credits, and any of the five photos (phase 5's win screen expects assets/photos/coasters_puff_set.jpg, which is not in the repo, nor is her-work-photos.zip)?

**Owner.** She knows a game is being made, not which. No name, no photos in the app; photos are references. Everything else is okayed; photos will be added to the repo folder.

**Decision.** No photos ship; they live in `docs/reference/photos/` (gitignored) for the artist, illustrations everywhere in the app. Second round: her first name does appear, in the credits line and the hidden level's note only.

**Recorded in.** DESIGN §12, §13, §15, §16; CLAUDE.md rule; docs/reference/README.md

<details><summary>Why it was asked</summary>

§13 conditions her name and photos on 'her okay before release', but phase 5 ships the coaster photo on the win screen, phase 8 wires all five, and phase 9 writes credits and store screenshots, none of which has a natural moment to ask unless she sees a build first. This changes what the product publishes about a private person (her name, images of her work, her hobby), and a store listing is indexed and hard to pull back. Neither the photos nor the zip is in the repo, so phase 5 needs a fallback either way.

**Default offered.** Build phase 5 with an SVG project illustration in the photo slot behind a one-line expo-image swap-in; keep photos out of the repo and out of any build she hasn't seen; make the credits string a config value defaulting to first name only; ask for her okay after she plays the first build and before any public listing; crop out the plush toys and tumbler brand when the photos do land (§15).

</details>

### 10. What will she play on (iPhone model, iPad, Android?), is installing through the TestFlight app from a link acceptable to her, and should each phase's 'done when' also be checked on an Android device or emulator (do you have one)?

**Owner.** iPhone and/or iPad; TestFlight for her; owner tests iPhone and Android (Play internal).

**Decision.** iPad stays in scope and landscape-locked; iPad layout is phase 6 work; Android spot checks with Expo Go through phases 2–5.

**Recorded in.** DESIGN §11 Rendering; apps/mobile/README.md

<details><summary>Why it was asked</summary>

It fixes the 'her phone first' path. Expo Go only works with your Mac running Metro on the same Wi-Fi, so it covers demos, not a gift. iPhone via TestFlight needs an App Store Connect record (which fixes the name and bundle id) plus one Beta App Review for an external link; an ad-hoc 'preview' build needs her UDID and no review but expires yearly; an Android 'preview' APK installs from the EAS link with no accounts at all. iPad decides whether §11's 'more air' layout is phase-6 or phase-9 work. Android runs SDK 57 Expo Go too, so spot checks cost no build, and the things that surface late are Android-only: hardware back mid-level, edge-to-edge insets in landscape, elevation vs iOS shadows, step-player frame rates on lower-end phones against §16's 120–450 ms timings.

**Default offered.** iPhone via the staging profile to TestFlight with an external group and a public link (one Beta App Review, then every OTA reaches her without review); iOS phone + iPad as the daily loop; the same Expo Go build on one Android device or emulator at the end of phases 2, 3 and 5; if she also plays on iPad, the iPad layout becomes phase-6 work.

</details>

### 11. Which three amigurumi creatures live in the Craft Nook (and is the shop's 'sheep' Skein or a different sheep), and roughly how many decor items should the Nook shop hold to reach 3 stars?

**Owner.** Decide.

**Decision.** Cat, frog, bee; twelve decor items in two sets; stars at 30 / 60 / 100 % of catalogue beauty; no sheep for sale (Skein).

**Recorded in.** DESIGN §8

<details><summary>Why it was asked</summary>

Phase 6's done-when is 'the Nook reaches 3 stars' with three creatures, but §8 lists eight creatures, nine furniture and seven small items with no per-room assignment, prices or beauty points, and Skein the Sheep (§13) is the guide, so a purchasable sheep is either her or a clash. The answer becomes the shop catalogue JSON, the placement spots in the room art and the star thresholds.

**Default offered.** Cat, frog and bee for the Nook (sheep reserved for Skein); 12 decor items in two sets (Corner: chair, lamp, shelf, rug, curtains, yarn cabinet; Little things: plant, candle, mug, framed pattern, fairy lights, record player) plus the three creatures; stars at 30 / 60 / 100% of the catalogue's total beauty; prices tuned so 3 stars is reachable with the coins from beating Book 1 once.

</details>

### 12. Should the book finale (level 15) be flagged hard on the Play button like level 12, and do you want one hard label or the three tiers (Tricky / Tangled / Nightmare Skein)?

**Owner.** Decide; we can test.

**Decision.** `hard` is `false` | `"tricky"` | `"tangled"` | `"nightmare"`; level 12 is Tricky; level 15 is tuned as a wall but unflagged.

**Recorded in.** DESIGN §8, §10

<details><summary>Why it was asked</summary>

§8 tunes levels 12 and 15 of every book as walls, §9 says only one level in 10–14 is flagged hard and 15 is 'the book's big project', and §10's schema has 'hard': false (a boolean) while §8 names three labels. The phase 4 schema validator has to pick a type, and phase 6's bot-sim targets for level 15 depend on whether it is a wall.

**Default offered.** hard becomes false | 'tricky' | 'tangled' | 'nightmare'; level 12 is 'tricky'; level 15 is tuned to wall pass rates (15–25%) but left unflagged so the finale reads as a project, not a warning.

</details>

### 13. What are the six yarns (brand and colourway) behind olive, mustard, blush, rust, lavender and cocoa, should those names show anywhere in the app, and who produces docs/design/ (the style sheet and concept art the phase 5 prompt reads): you in Canva before phase 5, or the phase 5 session with §11's three-image style test?

**Owner.** Make the names up; an AI designer will make the style sheet and concept art.

**Decision.** Keys fixed; invented display names (Olive Grove, Mustard Seed, Blush Petal, Rust Clay, Lavender Dusk, Cocoa Bean) for the Pattern Book; the designer works from the brief.

**Recorded in.** DESIGN §15; docs/design/BRIEF.md

<details><summary>Why it was asked</summary>

§15 says rename the palette keys after her yarn names and §13 promises a palette 'named after the yarns in her stash', but CLAUDE.md fixes the six keys and constants.js already ships them, so names can only be display labels. Phase 5 also replaces the placeholder hexes in palette.js and opens by reading docs/design/, which does not exist and which no phase produces; CLAUDE.md forbids generating images before phase 5 while §11 calls an early style test one of two exceptions worth doing early.

**Default offered.** Keys stay fixed; add a display label per color in palette.js shown in the Pattern Book and credits only (invented crochet-flavoured names if she doesn't know them); sample the six hexes from her photos in phase 5 (cream stays the background, not a piece color); you drop a style sheet and any concept art into docs/design/ before phase 5, otherwise the session opens with the three-image style test and one style phrase.

</details>

## Answer before phase 7 (backend, money)

### 14. Does she get a build before the backend exists (gift-first: phases 1–6, TestFlight to her with the hidden 'endless yarn' toggle standing in for VIP, then decide phases 7 and 9), or do phases 7 and 9 run in the spec's order so her first build arrives after phase 7 with the server VIP flag?

**Owner.** Commercial first, inspired by her. She can get a build before the money; finish phases in order.

**Decision.** Phases 1–6, then her TestFlight build (internal testers, hidden endless-yarn toggle on), then 7 and 9 as written.

**Recorded in.** DESIGN §8 Lives, §11 Money and accounts

<details><summary>Why it was asked</summary>

DESIGN v0.8 and CLAUDE.md say commercial release; your words today were 'a custom game for her'. Phases 1–6 are identical either way (all offline), so no code changes, but the order decides whether RevenueCat, accounts, the admin page, Heroku and Atlas, plus phase 9's store name, agreements, privacy policy and reviews, happen before or after she first plays; those carry external lead times and a monthly bill. Phase 6 ships lives, the Continue prompt and the marker shop locally while the VIP flag that spares her the paywall is server-side in phase 7, so a pre-phase-7 build needs the §8 toggle or she sees a shop with nothing to buy. Two no-regret moves either way: phase 6's local wallet writes ledger-shaped entries ({currency, delta, source, clientId}) so POST /wallet/sync can replay them, and the toggle lives in the phase-6 meta store and maps to players.vip in phase 7.

**Default offered.** Gift-first sequencing, commercial-ready architecture: build phases 1–6 as specified, put the phase-6 build on her phone via TestFlight with the hidden toggle on (a Settings long-press, so §13's seven frog taps stay reserved for the hidden level) and the marker shop hidden while it is on, then decide phases 7 and 9 with her reaction in hand.

</details>

### 15. Is there a date (her birthday, an anniversary, Christmas) by which something must be on her phone, and what must it be by then: level 1 playable, Book 1 finished, or live on the App Store?

**Owner.** No date.

**Decision.** None.

**Recorded in.** n/a

<details><summary>Why it was asked</summary>

Today is 2026-09-10. The spec mentions birthdays and an October seasonal drop but never a date. Which milestone the date attaches to decides the ordering of everything after phase 4: a TestFlight build is within your control, while a store release adds Apple review, IAP review and Play review with days-to-weeks of variance you cannot schedule. Book 5's October content is v2 by the spec's own v1 scope (books 1–3), so an October 2026 seasonal launch is not a realistic target.

**Default offered.** Pick the date and pin it to the phase-6 TestFlight build (Book 1 plus the Craft Nook, endless yarn on), never to store approval; treat the store as a later milestone with its own date.

</details>

### 16. Does v1 need her progress (rooms, levels, decor) to follow her across devices or reinstalls, or is one device per player fine so that v1 uses anonymous accounts only, with no Sign in with Apple or Google?

**Owner.** Better if progress follows her; asked how Game Center works.

**Decision.** Sign in with Apple + Google in v1 plus a `progress` document synced with last-write-wins (PUT/GET /progress). Game Center does leaderboards/achievements, not saves: v2.

**Recorded in.** DESIGN §11 Backend; PROMPTS phase 7

<details><summary>Why it was asked</summary>

As specified, the server owns money and identity only; progress lives on the phone and no progress collection exists in §11, so Sign in with Apple and Google in v1 buy wallet and VIP continuity, not the 'cloud save' §11 promises. Dropping both removes the Google Cloud OAuth setup, the APPLE_BUNDLE_ID and GOOGLE_CLIENT_IDS env, two auth routes and their token verification, and sidesteps Apple guideline 4.8 (Sign in with Apple is only mandatory when a third-party login is offered). Purchases still restore through the store account via RevenueCat. Keep DELETE /me and the Delete Account button regardless: cheap, and Apple 5.1.1(v) requires deletion wherever accounts exist. If cross-device progress is a v1 requirement, that is new server work (a progress document and sync) the spec does not have.

**Default offered.** Anonymous JWT only in v1, Delete Account button kept, Sign in with Apple as a v2 item; if she plays on both an iPhone and an iPad, add a progress-sync document to phase 7's scope explicitly rather than assuming SIWA delivers it.

</details>

### 17. If it sells: which legal entity and bank account receive the revenue, is the Apple Paid Apps agreement (banking and tax) and a Google Payments merchant profile already completed on those accounts, and is the upside yours, hers or shared?

**Owner.** "I have my own LLC so technically that could receive. Or my personal, no?" (a question, answered in chat).

**Decision.** Third round: revenue goes to the owner personally; the arrangement with her is his to handle and is not tracked here. Confirm the Apple paid-apps agreement and a Play merchant profile before phase 7.

**Recorded in.** DESIGN §11 Money and accounts

<details><summary>Why it was asked</summary>

In-app purchase products do not appear even in the sandbox until the Paid Applications agreement is active, and Play IAP needs a merchant profile, so phase 7's 'buy a pack in sandbox' done-when depends on paperwork with review lead time. The spec puts her name, palette and photographed works in a paid product and says 'the tribute is the game itself and its upside', which is an agreement with her, not a code decision. canvass-app is a B2B app that may never have needed these agreements, so do not assume they exist.

**Default offered.** Decide the entity the day commercial-first is confirmed and start the Apple and Google financial paperwork then, ahead of phase 7; write down the revenue arrangement with her before phase 9. If gift-first, defer entirely.

</details>

### 18. For v1's shop, do you want the full product set (six marker packs, the Starter Bundle and the Yarn Bank) or a smaller set, and is $2.99 for the Yarn Bank a placeholder or a decision?

**Owner.** Full product set; prices adjustable.

**Decision.** All six packs, the Starter Bundle and the Yarn Bank in v1; prices live in the stores and RevenueCat.

**Recorded in.** DESIGN §8 (unchanged), §11

<details><summary>Why it was asked</summary>

Every product is a row in App Store Connect, a row in Play Console, an offering in RevenueCat, a review screenshot and a test case for phase 7's 'buy a pack in sandbox'. The Yarn Bank is the most complex surface: server-side fill state, a 7-day timer and an unlock threshold, none of which the other products need. Marker packs plus the Starter Bundle already give a paying player every path the Continue loop needs. Prices are configured in the stores and RevenueCat, not in code, so the price is a store question, not a code one.

**Default offered.** Three marker tiers plus the Starter Bundle in v1; ship the Yarn Bank in the first post-launch update once the ledger and webhook are proven in production. All prices placeholders until the listing is written.

</details>

### 19. Should apps/admin be a local-only Vite app you run on your Mac against the production API, or be built on Heroku and served by the API like canvass-app serves client/dist (which also decides how Heroku installs the workspace)?

**Owner.** Same as canvass-app.

**Decision.** `apps/admin` is built on Heroku and served by the API; single-workspace install via `NPM_CONFIG_WORKSPACE=apps/api` with `@hooked/admin` as an api devDependency; rehearsed locally.

**Recorded in.** DESIGN §11 Backend; apps/api/README.md

<details><summary>Why it was asked</summary>

canvass-app builds client/ in heroku-postbuild and serves client/dist from Express on the same dyno. Hooked's scaffold assumes a separate origin (apps/api/.env.example sets CLIENT_ORIGIN=http://localhost:5175) and a Heroku build that installs only apps/api via the NPM_CONFIG_WORKSPACE=apps/api config var (verified locally with npm ci -w apps/api, not yet on Heroku). Serving the admin page from the API means Heroku must also install and build a second workspace, which turns that config var into an explicit root heroku-postbuild script (canvass-app's pattern). The page is for one person with an admin key, and §11 says MongoDB Compass works on day one. Cost of changing later: minutes; the Vite app is identical either way.

**Default offered.** Local-only: npm run dev:admin on your Mac pointed at the production API with the admin key, never deployed, CORS limited to localhost; Heroku stays on NPM_CONFIG_WORKSPACE=apps/api, confirmed by reading the first deploy's build log, with a root heroku-postbuild running npm ci -w apps/api as the fallback if the var isn't honored.

</details>

### 20. For the API, is a monthly bill of roughly $7 (Heroku Basic, never sleeps) plus Atlas (free M0 with no backups, or a paid tier with backups) acceptable indefinitely, in its own Heroku app and its own Atlas project rather than anything shared with canvass-app?

**Owner.** Own Heroku app and own Atlas project; tiers adjustable later.

**Decision.** Basic dyno, Atlas M0 during sandbox, backed-up tier when real purchases go live.

**Recorded in.** apps/api/README.md

<details><summary>Why it was asked</summary>

The spec requires a dyno that does not sleep (Continue prompts and gift popups must not wait on a cold start), which rules out Eco; canvass-app runs Basic. Its Atlas history is the warning: it started on M0, which its runbook calls 'physically incapable of being backed up', and a wallet ledger holding real purchases on an unbackupable tier is a support problem waiting to happen. Sharing canvass-app's Heroku app or cluster is off the table: that cluster is described by canvass-app's DPA and privacy verification, and mixing a game's data into it would make those documents false. The scaffold already assumes a separate app (Procfile, NPM_CONFIG_WORKSPACE=apps/api, dashboard-only ops).

**Default offered.** Own Heroku app on Basic plus own Atlas project on M0 while purchases are sandbox-only; move Atlas to a backed-up paid tier (Flex at the low end; confirm its backup coverage) the day real purchases go live. Gift-first means $0 until phase 7.

</details>

### 21. Crash reporting and analytics in v1: none (as canvass-app), Sentry only, or Sentry + PostHog as §11 says, and in which build?

**Owner.** None for now, then whatever the pros use.

**Decision.** Nothing for now. My default for "whatever the pros use": Sentry, added with the phase 7 development build; no product analytics in v1.

**Recorded in.** DESIGN §11 Telemetry

<details><summary>Why it was asked</summary>

§11 says 'Sentry for crashes; PostHog (or whatever canvass-app uses)', but canvass-app uses neither (no sentry/posthog/amplitude/mixpanel in any of its package.json files), so the parenthetical resolves to nothing. @sentry/react-native ~7.11.0 is in SDK 57's bundled list but adds a config plugin, a native input that moves the fingerprint and needs a real build, so it belongs in the same native build as RevenueCat rather than the Expo Go phases; it also adds a 'Crash Data' privacy disclosure. The spec's own POST /attempts log already records the funnel it cares about (level, won/lost, moves left, Continues, markers), so PostHog is redundant in v1. For her phone alone you hear about crashes directly.

**Default offered.** Sentry only (free tier), added with the first native build in phase 7; attempts to the API for funnels; no PostHog. Gift-first: nothing until phase 7.

</details>

## Answer before phase 9 (release)

### 22. What is the store name, given that 'Hooked' is already a well-known app name and App Store Connect rejects a duplicate the moment the record is created (and that record is a prerequisite for TestFlight)?

**Owner.** Undecided; ideas: Yarn Farm, Yarn House, Yarn Bank.

**Decision.** **Yarn Over** (chosen by the owner, third round). "Hooked" stays the codename, repo and EAS slug; `expo.name` is now "Yarn Over". Fallbacks if App Store Connect or a trademark search rejects it: Fastened Off, Yarn Nook, Puff Stitch (none found on the App Store on 2026-09-10). Taken: Skein, Cozy Stitch, Yarniverse.

**Recorded in.** Still open, see the top of this file

<details><summary>Why it was asked</summary>

Store name and on-device name may differ, so expo.name can stay 'Hooked' on the home screen while the store name carries a distinguishing word; the name is needed the day the ASC record is created, which is on the TestFlight path, not only at phase 9. The bundle id and slug are a separate, cheaper question (group 6) and do not depend on it.

**Default offered.** Keep 'Hooked' on device; pick the store name now from the spec's own vocabulary with a distinguishing word (e.g. 'Hooked: Crochet Match'), test availability by creating the ASC record, and run the trademark and store search before the first TestFlight build rather than at phase 9.

</details>

### 23. Do you reuse your existing Apple Developer team and Google Play developer account (the ones canvass-app ships under) for Hooked, accepting that both listings then show the same seller name?

**Owner.** Reuse the Apple team and Google Play; two Google accounts exist (personal, and one canvass-app uses).

**Decision.** Reuse Apple, and the Google Play account canvass-app ships under (second round).

**Recorded in.** DESIGN §11 Money and accounts; still open

<details><summary>Why it was asked</summary>

One Apple membership holds many apps, so reuse costs nothing and skips a days-long enrollment; a new individual account is $99/yr and a new Play account is $25 plus Google's rule that personal accounts created after Nov 2023 run a 14-day closed test with 12 testers before production access, which your existing account has already cleared. The only visible consequence is the seller name on both listings. What is never reused: canvass-app's ASC app record, EAS project or bundle ids; Hooked gets a fresh ASC record, a fresh Play app and a fresh Play service-account key (already gitignored).

**Default offered.** Reuse both. Fill eas.json submit.* with your Apple ID and team id, a new ascAppId and a new Play service-account JSON path; nothing else from canvass-app's eas.json.

</details>

### 24. Where does the public privacy policy live (a static HTML page served by apps/api at /privacy like canvass-app's, or a page on a site you already own), and do you accept a 4+/Everyone content rating with a declared target audience of 13+ so Play's Families/COPPA rules do not apply?

**Owner.** Like canvass-app; write it up quickly.

**Decision.** Static HTML served by the API. Her phase 6 build goes out through TestFlight's internal testers, which need no privacy URL and no Beta App Review; the pages are live before phase 9's external build. Age rating 4+ / Everyone like Fishdom, target audience 13+, not Made for Kids (second round).

**Recorded in.** DESIGN §11 Money and accounts

<details><summary>Why it was asked</summary>

App Store Connect asks for the privacy policy URL before external TestFlight review, not just at submission, so it is on the gift path too. Apple's questionnaire will rate a match-3 4+, but 'Made for Kids' and Play's under-13 target audience each pull in restrictions on identifiers, SDKs and data; declaring 13+ keeps the anonymous id, purchases, attempt telemetry and any crash SDK inside the normal disclosure rules. What the app collects is a published promise: identifiers (install id), purchase history, product interaction (attempts), plus crash data if Sentry is added.

**Default offered.** Serve committed static HTML from apps/api (express.static on a public/ folder, the convention canvass-app already uses for /privacy, /terms and /delete-account), rate 4+/Everyone, target audience 13+, not Made for Kids, and write the App Privacy declaration from the §11 collections list.

</details>

### 25. Two strings only you have: her name as it should read in 'For [her name], who is at level 7000', and what the hidden level is (its project) and the note that ends it?

**Owner.** Gave her first name; asked what the hidden level and note are. Second round: keep the name in the credits, keep the hidden level.

**Decision.** Second round: credits read "For Faith, who is at level 7000." and the hidden level (id 7000) ends on "Fastened off. For Faith, who is at level 7000. Thank you for every stitch." (wording adjustable). Those are the only two places her name appears.

**Recorded in.** DESIGN §13, §10; still open (wording)

<details><summary>Why it was asked</summary>

The credits line and the seven-frog-taps hidden level are the tribute itself (§13). The hidden level must be a level JSON, but §10's id/book scheme is sequential, so phase 4's schema should reserve a hidden slot now rather than retrofitting in phase 9; the note text and her name are content only you can supply, and placeholder strings will otherwise leak into every screenshot and build.

**Default offered.** Reserve 'id': 7000, 'book': 0, 'hidden': true in the phase 4 schema and exclude hidden levels from the Play sequence and bot-sim reports; the level is a heart-shaped Stitch board, no wall tuning; the note is a plain text screen after Fastened off!; name and note come from you before phase 9, with clearly marked placeholders until then.

</details>

## Tooling decisions I made today that you can reverse cheaply

### 26. Stay on Expo SDK 57 (the store Expo Go's SDK) and accept tracking 'latest' through phases 2–6, or cut a development build early so the SDK can be pinned?

**Owner.** Choose.

**Decision.** SDK 57 with Expo Go through phase 6; bump when Expo Go moves to 58; development build at phase 7.

**Recorded in.** apps/mobile/README.md

<details><summary>Why it was asked</summary>

The scaffold is on expo 57.0.21 / RN 0.86.3 with no dev client. Store Expo Go runs only the current SDK, and SDK 58 is imminent: npm already carries expo 'next' 58.0.0-preview.0 and a 58 canary dated 2026-09-09. So 'Expo Go only' means at least one forced SDK bump during phases 2–3, and every later one until a dev build exists. RevenueCat (phase 7) forces a development build regardless (react-native-purchases is not in the bundled list and only mocks its API in Expo Go). Matching canvass-app's SDK 54 would need a dev build on day one, since store Expo Go won't run it. Cost of changing later: an SDK bump is npx expo install --fix plus changelog reading, roughly half a day; a dev build is one eas build --profile development once eas init has run (expo-dev-client ~57.0.18 is bundled).

**Default offered.** Keep SDK 57 and Expo Go now; plan on one bump to SDK 58 when the store Expo Go moves; switch to a development build at whichever comes first: phase 7 (RevenueCat), the first native library the game needs (MMKV or Sentry if chosen), or the first SDK bump that breaks something.

</details>

### 27. Move the Node engine to 22.x (or 24.x) now, or keep 20.x to match canvass-app?

**Owner.** Move it if beneficial and safe.

**Decision.** Node 22.x: `engines`, `.nvmrc`, Volta pin (22.23.2). Verified: tests, playground build and the Metro export all pass under 22. The owner runs `nvm install 22` once (his shell uses nvm ahead of Volta).

**Recorded in.** package.json, apps/api/package.json, .nvmrc, README.md

<details><summary>Why it was asked</summary>

Root package.json, apps/api/package.json, CLAUDE.md and apps/api/README.md pin Node 20.x, which reached end-of-life on 2026-04-30. Heroku's Node docs list 22.x/24.x/26.x as supported and default to 24.x when engines is unset, and EAS Build's SDK 57 images run Node 22 unless eas.json's node field pins one, so the mobile build is already on 22 while local (v20.19.5) and the future dyno would be on 20. Everything in the tree accepts 22: react-native 0.86 engines ^20.19.4 || ^22.13.0 || ^24.3.0, vite 8 ^20.19.0 || >=22.12.0, jest 30, mongoose >=20.19.0. Cost of changing later: minutes (engines fields, an .nvmrc, nvm install 22; the lockfile does not encode Node), but Heroku reads engines at deploy, so settle it before the phase-7 app is created.

**Default offered.** 22.x (Maintenance LTS until 2027-04-30, matches EAS's default image): set engines in package.json and apps/api/package.json, add a root .nvmrc, update the Node line in CLAUDE.md and the READMEs, and run 22 locally via nvm alongside 20 for canvass-app.

</details>

### 28. Confirm the permanent identifiers (iOS bundleIdentifier and Android package as the same string on both, EAS slug 'hooked', URL scheme 'hooked') and let me run `eas init` and `eas update:configure` now rather than at the first native build?

**Owner.** Fine.

**Decision.** `com.omarzumaya.hooked` on both platforms; `eas init` created `@omar4589/hooked` (id fb9c9a73-47a6-4c90-a0c6-9178127717d2) and `eas update:configure` wrote `updates.url`.

**Recorded in.** apps/mobile/app.json; apps/mobile/README.md

<details><summary>Why it was asked</summary>

Both ids are placeholders (com.omarzumaya.hooked); the bundle id is permanent once an ASC record exists and the package once anything is uploaded to Play; canvass-app ended up with different ids per platform, worth not repeating. eas init and update:configure write only extra.eas.projectId and updates.url (the ids bind later, at the first eas build / credentials step); nothing in Expo Go reads them, but the first eas build, every eas update and npm run ota:check (scripts/ota-check.mjs calls eas build:list) all need them. The store display name is a separate phase-9 decision and constrains none of these. Cost of changing later: free before the first eas build; a new EAS project after eas init (channel and fingerprint history restart); impossible after store submission.

**Default offered.** Reverse-DNS of a domain you control, identical on iOS and Android (com.<yourdomain>.hooked), slug 'hooked', scheme 'hooked'; run eas init and eas update:configure now under the omar4589 account (a project on expo.dev is free and the store name can differ).

</details>

### 29. Keep Express ^4 + Mongoose ^8 (canvass-app's majors, as I scaffolded) or start apps/api on Express 5 + Mongoose 9 while it is still a health route?

**Owner.** Decide for the long run.

**Decision.** Express 5.2 + Mongoose 9.10, done; tests pass.

**Recorded in.** apps/api/package.json; apps/api/README.md

<details><summary>Why it was asked</summary>

I mirrored the majors deliberately, but the evidence leans the other way: npm latest is express 5.2.1 (4.22.2 is tagged latest-4) and mongoose 9.10.0 (8.24.4 is 8x); Express 5 propagates rejected promises from async handlers, which every phase-7 wallet route (all async Mongo) would otherwise need a wrapper for, and canvass-app has no asyncHandler helper to copy; Mongoose 9's breaking list is legacy cleanup a greenfield API never touches. CLAUDE.md already forbids copying canvass-app's app code, and its structure (app.js/server.js/db.js/env/Procfile) is major-agnostic. Cost of changing later: Express 4→5 touches every route pattern (path-to-regexp v8) and a few removed APIs, an afternoon at ~15 routes and growing per route; Mongoose 8→9 is small.

**Default offered.** Express 5 + Mongoose 9 now (^5.2.0, ^9.10.0 in apps/api/package.json; both accept Node 20+); keep 4/8 only if one mental model across both repos matters more to you.

</details>

### 30. OK to change the spec's sound library from expo-av to expo-audio now (DESIGN §16 and PROMPTS phase 5 both name expo-av)?

**Owner.** Whatever is best.

**Decision.** `expo-audio`, done.

**Recorded in.** DESIGN §16; PROMPTS phase 5

<details><summary>Why it was asked</summary>

expo-av is gone in SDK 57: it is absent from SDK 57's bundledNativeModules, its npm latest is 16.0.8 (SDK 54-era), and Expo announced its removal after SDK 54. expo-audio ~57.0.4 is the bundled replacement and runs in Expo Go. A phase-5 session following the prompt literally would try to install a dead package. Cost of deferring: none in code today, but the spec is wrong until edited.

**Default offered.** Yes: edit DESIGN.md §16 Libraries and PROMPTS.md phase 5 to expo-audio (no expo-video needed; there is no video in the design) as part of the phase-0 commit.

</details>

### 31. For iPad, keep landscape-only with ios.requireFullScreen (which Apple now marks deprecated) for v1, or support all orientations/resizable windows from the start?

**Owner.** Whatever is most professional for a game.

**Decision.** Landscape lock with `requireFullScreen` for v1; board and HUD lay out against a measured arena view.

**Recorded in.** DESIGN §11 Rendering; app.json

<details><summary>Why it was asked</summary>

app.json has orientation landscape, supportsTablet true, requireFullScreen true, the historical way to ship an orientation-locked iPad app (it opts out of Slide Over and Split View). Apple's UIRequiresFullScreen doc now says opting out of iPad multitasking and dynamic resizing is deprecated, and on iPadOS 26 with windowed apps the system scales a locked app's presentation when the user resizes it rather than rotating it. So the lock still works today as a scaled compatibility window, but the replacement (scene size restrictions plus an orientation-lock preference, via a config plugin) implies a layout that survives resizing. This decides what the phase-2 board layout measures against. Cost of changing later: a layout refactor if the board/HUD were written against window dimensions; near zero if they were written against a measured arena rect.

**Default offered.** Keep landscape + requireFullScreen for v1 (works on iPadOS 26 as a scaled window), but build the board and HUD against a measured arena View, never the window, so dropping requireFullScreen later is layout-only; re-check Apple's warnings at phase 9.

</details>

### 32. Keep expo-router for the game's ~9 screens, or use a plain navigator (React Navigation native-stack, or a small screen state machine) behind one nav helper?

**Owner.** Asked for the pro way; suggested React Navigation native-stack.

**Decision.** React Navigation native-stack, done: `App.jsx` + `src/nav.js`; expo-router removed (bundle 1553 → 1283 modules).

**Recorded in.** DESIGN §11 Rendering; CLAUDE.md rule; apps/mobile

<details><summary>Why it was asked</summary>

The scaffold uses expo-router ~57.0.20 (main: expo-router/entry, app/_layout.jsx Stack with headers hidden, scheme hooked), mirroring canvass-app. In SDK 57 expo-router no longer depends on @react-navigation/* (it vendors 'standard-navigation' and pulls @expo/ui, expo-glass-effect, expo-symbols, expo-server, radix and vaul), so 'plain React Navigation' would be an added dependency, not something already present. The game's screens (§11: Room, Shop, Level card, Board, Continue, Result, Yarn Bank, Pattern Book, Settings) are full-screen scenes and modal overlays with no deep links or web URLs; file-based routes buy little here, but they are already working and match canvass-app. Cost of changing later: every screen's navigation calls, cheap while only index.jsx exists, moderate after phase 4 adds win/lose/level-card flows.

**Default offered.** Keep expo-router (already wired, mirrors canvass-app; Stack modal presentation covers the level card / Continue / Result overlays), but route all navigation through one apps/mobile/src/nav.js helper so a later swap is a one-file change.

</details>

### 33. Commit phase 0 as `phase 0: monorepo` now, and create the private GitHub repo now?

**Owner.** Yes; the GitHub repo is git@github.com:Omar4589/hooked.git.

**Decision.** Committed as `phase 0: monorepo`; remote `origin` set.

**Recorded in.** git log

<details><summary>Why it was asked</summary>

The repo is git-inited on main with zero commits and everything untracked. The tree is clean to commit: no .env anywhere (only apps/api/.env.example), .expo/, dist/ and node_modules ignored, eas.json holds only REPLACE_WITH_ placeholders. CLAUDE.md asks for a commit per phase. One gap: CLAUDE.md and docs/README.md reference docs/QUESTIONS.md, which does not exist; this list is its first content. canvass-app lives on GitHub with Heroku's GitHub integration for dashboard deploys, so phase 7 needs a GitHub repo to connect. Cost of waiting: phase 1 starts on an uncommitted tree, and the Node/Express/expo-audio edits above have no baseline diff.

**Default offered.** Yes: apply the one-line follow-ups you accept from this group (engines, express/mongoose, expo-audio in the docs), add docs/QUESTIONS.md with this list, commit `phase 0: monorepo`, and push to a new private GitHub repo so phase 7's dashboard deploy has a source.

</details>

## Where the spec disagreed with itself

All of these were found while reading and are now resolved in DESIGN.md v0.9.1 and v0.9.2
(the entries below record what the contradictions were).

- Blast radius: DESIGN §4 'Blast shape' defines radius r as 'every cell whose center lies within r cell-widths of the special's center' (13 cells for r=2, since cell (2,1) is √5 ≈ 2.24 away) and in the same sentence gives the example '(for r = 2, a 5×5 minus its corners)', which is 21 cells; §11 'Still to verify' item 1 lists only 'plus vs rounded square vs full square'.
- Goal count: DESIGN §11 build order phase 4 ('the four goal types') and PROMPTS.md phase 4 ('the four goal types') vs DESIGN §6 (five goals: Stitch, Collect, Beads, Clear, Buried, added in v0.7) and CLAUDE.md Rules ('goals stitch, collect, beads, clear, buried').
- Frog as special vs piece: CLAUDE.md Rules ('specials puff, bobble, popcorn, yarnbomb, hook, frog') and DESIGN §10 presets list (frog placeable like a special) vs DESIGN §11 typedef, where Special is 'puff'|'bobble'|'popcorn'|'yarnbomb'|'hook' and the frog is a Piece kind ('yarn'|'frog'|'bead'); packages/engine/src/constants.js follows CLAUDE.md.
- Persistence: DESIGN §11 Rendering ('Persistence: MMKV (or AsyncStorage)') vs PROMPTS.md phase 6 ('save/load with MMKV', no alternative); MMKV also forces a development build at phase 6, which neither doc notes.
- Workspaces: DESIGN §11 Monorepo ('the same package manager and workspaces setup' as canvass-app) and PROMPTS.md phase 0 ('the root package.json and workspace config') vs CLAUDE.md Monorepo ('One deliberate departure: this repo uses npm workspaces ... canvass-app links its three apps with npm --prefix instead'); canvass-app's root package.json confirms npm --prefix, no workspaces.
- Hard levels: DESIGN §8 'Walls' ('Levels 12 and 15 of every book are tuned as walls') vs §9 'Within a book' ('10–14 include one flagged hard level, 15 is the book's big project'); and §8 'Levels' names three labels (Tricky, Tangled, Nightmare Skein) while §10's worked example has a boolean ('hard': false).
- Photo and asset paths: PROMPTS.md phase 5 ('assets/photos/coasters_puff_set.jpg') and phase 8 ('assets/art') vs DESIGN §16 source 4 ('ready for src/art/photos/') and §11 tree ('apps/mobile/src/art/ ... her photos'); none of these paths exists in the repo.
- Early images: CLAUDE.md Rules ('Placeholder art (colored circles) until phase 5. Don't add or generate images before then.') vs DESIGN §11 'Why art is last' ('The two exceptions worth doing early are the palette (done) and a style test for generated illustrations: three test images') and PROMPTS.md phase 5, which reads 'docs/design/ (the style sheet and concept art)' that no phase produces and that does not exist.
- Palette: DESIGN §15 'Palette' ('rename the keys after her actual yarn names') and §13 ('named after the yarns in her stash') vs CLAUDE.md Rules ('Names are fixed: colors olive, mustard, blush, rust, lavender, cocoa ... live once, in packages/engine/src/constants.js'); DESIGN §11 also calls the palette '(done)' while apps/mobile/src/art/palette.js holds placeholder hexes.
- Cloud save: DESIGN §11 Backend 'Identity' ('Sign in with Apple or Google ... links the same player record for cloud save') vs §11 Rendering 'Persistence' (progress, coins, room layout on the device) and §11 'Collections' (players, ledger, purchases, grants, codes, attempts, config; no progress document), so nothing server-side can be 'cloud saved' except the wallet and VIP.
- Her first build: DESIGN §11 build order phase 5 done-when ('you'd hand her the phone with only this level on it') vs phase 9 ('Her phone gets the TestFlight build first, with her VIP flag on'), where the VIP flag only exists after phase 7.
- Book 1 contents: DESIGN §11 build order phase 6 ('Author the 15 coaster levels') vs §9 Book 1 projects ('puff-stitch coasters ..., potholder, dishcloth, mug cozy') and §15 (Puff Flower, Twelve Coasters); the v0.6 changelog says Book 1 is planned in docs/LEVELS-BOOK1.md, which is not in the repo or docs/README.md's table.
- Missing referenced files: CLAUDE.md 'What this is' and docs/README.md point to docs/QUESTIONS.md; DESIGN v0.6 note points to docs/LEVELS-BOOK1.md; PROMPTS.md phase 5 points to docs/design/ and assets/photos/; DESIGN §16 says her-work-photos.zip is 'ready for src/art/photos/'. None of these exists under .
- Telemetry reference: DESIGN §11 Backend 'Telemetry' ('PostHog (or whatever canvass-app uses)') resolves to nothing, since canvass-app has no analytics or crash-reporting dependency in any of its package.json files.

## Dropped as already answered by the spec

- Do leftover moves pay coins, power-ups, or both (Yarn Over)? Answered: DESIGN §6 'Win' ('each remaining move turns a random ball into a Puff or Bobble that fires, and pays coins') and §7 'Coins' (+20 per remaining move); CLAUDE.md Rules say to use the spec's value for [verify] items, and the PROMPTS.md phase 3 prompt already collects the Fishdom finding ('leftover moves').
- What do Torpedo, Anchor and Diving Gloves do, and when do in-level boosters unlock and with how many free? Answered: DESIGN §8 booster table (Lint Roller = row, Darning Needle = column, Loosen = free swap, each [verify]) and 'Booster slots unlock at level 8, like Fishdom, with three free Scissors'; §9 Book 1 '(8)'; CLAUDE.md [verify] rule; the phase 3 prompt collects the Fishdom finding ('Torpedo and Diving Gloves').
- Jest vs node --test for packages/engine and packages/levels. Answered: DESIGN §11 monorepo tree ('@hooked/engine: plain JS engine + Jest tests') and CLAUDE.md Rules ('Every change to packages/engine ships with a Jest test'); apps/api on node --test mirrors canvass-app as CLAUDE.md asks.
- Is a hidden local 'endless yarn' toggle acceptable before phase 7? Answered: DESIGN §8 'Lives' already allows an 'optional hidden endless yarn toggle'; the remaining decision (using it as the pre-phase-7 VIP stand-in) is folded into the gift-first sequencing question.
- Landscape orientation / iPad support as such. Answered: DESIGN §11 Rendering ('Landscape ... lock it in app.json'; 'iPad uses the same layout with more air'); only the requireFullScreen mechanism remains, kept in group 6.
- Heroku install strategy (NPM_CONFIG_WORKSPACE vs root heroku-postbuild vs heroku-buildpack-monorepo) as a standalone question: not an owner decision, the first deploy's build log settles it and the fallback is one root script; the part that does depend on the owner (serving apps/admin from the API) is kept in group 4.
- Separate Heroku app / Atlas project rather than sharing canvass-app's. Answered: PROMPTS.md phase 7 ('a Heroku deployment of apps/api next to canvass-app's') and CLAUDE.md Monorepo ('no credentials, env files or secrets copied from canvass-app'); only the bill and Atlas backup tier are kept as a question.
- Android spot checks as a separate question: merged into the devices/install-path question in group 3.
- Sentry/PostHog (two drafts): merged into one question in group 4.
- eas init timing and the permanent identifiers (two drafts): merged into one question in group 6; the store name is kept separately in group 5 because it constrains none of the identifiers.
- Her okay for name/photos and 'does she know' (two drafts): merged into one question in group 3.
- Persistence (draft 1's AsyncStorage-vs-MMKV and draft 3's kv-store question): merged into one question in group 3 with the clearer cost argument (kv-store keeps Expo Go viable and has a sync API).
