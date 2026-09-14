# HOOKED — Game Design Spec (v0.9)

*Store name: **Yarn Over** (decided 2026-09-10). "Hooked" is the codename: the repo, the EAS slug, the bundle id.*

*A cozy match-3 where every level is a crochet project, and everything you make decorates your room. A tribute to one crocheter, built to ship to everyone.*

> **v0.9.10 (2026-09-13, phase 5 slice 1):** level 1 exists, and so does the card that covers its mount. `packages/levels/levels/book1/001.json` is Book 1 level 1, "Coaster (olive)" — `docs/LEVELS-BOOK1.md` row 1 verbatim, project `coaster_olive` — so `listLevels()` is no longer empty and a production build finally has a Play button; `packages/levels/test/book1.test.js` holds the file to that row and plays it out with the random bot, which wins on 13 of seeds 1–20 and loses on 7, so both endings are reachable with margin (liveness, **not** balance — the §11 win rates are the greedy bot and phase 6 sets them). `project` is now **required** by `packages/levels/src/schema.js`: §10's worked example carried it in the required block all along and its Optional list never listed it, so the schema caught up with the spec, and all 17 level files in the repo already had one. `apps/mobile/src/art` gains the project registry as two files, for the same reason `compose.js` and `sprites.js` are two: `projects.js` (`projectKeyOf(level)`, pure, node-tested) and `illustrations.js` (Metro-only `require()`s of PNGs, and the single place the list of projects with art exists). `apps/mobile/src/screens/LevelCard.jsx` is the card; `PlayScreen` defers the board's mount past a painted frame; `Board` gains an `onReady` prop that says when the expensive commit landed; `ResultScreen` draws the coaster and the drawn coin. §11 gains art conventions 15–17 and rewrites 14, its Screens and Navigation bullets say the card is not a route, its build order item 5 says what is left of the slice, and its phase-2 convention 13 splits Reduce Motion in two; §10 records the required `project`; §15's coaster row names the level; §16's `clear` and `blast` rows, v1 checklist and source 1 are marked. **Owner decisions (2026-09-13):** Book 1 level 1 is authored now rather than waiting for phase 6; **the level card is a step inside `PlayScreen`, not the modal route §11 specified**, because a route cannot defer a mount; the delivered coaster art ships as-is with a re-cut queued with the designer — the empty state is the finished piece desaturated rather than the line drawing `docs/design/BRIEF.md` ordered; the win screen says nothing about the room, which does not exist until phase 6; and the no-op `expo-font` plugin entry stays out of `app.json`, read off the plugin source rather than assumed (`withFonts` hands the config back untouched when there is no `fonts` array, so it did nothing; Fredoka loads through `useFonts` at runtime and `expo-font` is still a dependency). **Reduce Motion was a live defect and is fixed.** In reanimated 4.5.1 a reduced animation finishes on its first frame, so with the OS toggle on the board's move clock landed on its last instant and ran `finishMove` before anything drew, while the shuffle's wall-clock timers ran on regardless. The clocks and cross-fades now name `reduceMotion: ReduceMotion.Never` — the move clock, the two shuffle fades, the dial's arc and the frog's blink — and the frog's wiggle keeps the system default, because it is decorative motion and a player who asked for less should get less. The **feature** is still not built. **Measured on a device (2026-09-13, owner, iPhone 17 Pro, Expo Go, development bundle):** every board reports ready 172–298 ms under the card, which is the deferral doing what it is for. It is not the 1845 ms case: that was a Moto G Play 2023 release build, and the Moto has not been retested with the card. §16 source 1 has the readings. Phase 5 is still not finished: the drawn blast rings, the clear particles, the confetti and the coin pile, the sounds, the haptics, the ~5 s idle hint and the Reduce Motion feature.
>
> **v0.9.9 (2026-09-12, phase 5 built):** the board is drawn. `apps/mobile/src/art` gains `pieces.js` (every board SVG as a string factory — the designer's delivery), `compose.js` (pure string composition: a ball wearing its special and its knot, the floor as one tile sheet, the dial's fill arc), `sprites.js` (each composed string parsed into a react-native-svg AST once and shared) and `type.js` (Fredoka, loaded at runtime in `App.jsx`), and `palette.js` is rewritten around six luminance-tuned hexes with a greyscale guard. The placeholders are gone: the P/B/C/Y/F/H letters, the ring-and-knob knot, the M diamond, the numeral on a tangle, the plain coloured circles, the hairline grid and the pip row. §11 gains "Art conventions (phase 5)"; its phase-3 convention 14 is rewritten and its phase-2 conventions 9 and 13 are amended (the dial is built). §16's `meter`, `meterDrop`, `frogRip` and `blocker` rows have real behaviour, source 1 records that the delivery landed, and the v1 checklist marks what is in. **Owner decisions (2026-09-12, `docs/QUESTIONS.md` item 38):** `pieces.js` and `palette.js` *are* the designer delivery rather than an interim set; the Yarn Bomb **replaces** the ball instead of overlaying it, so its yarn colour is not readable in play (the owner's call, and a note back to the designer); the tangle numeral is dropped and the three drawn densities carry the layer count; the frog wiggles when the readout reads full, which the meter's move frames make reachable for the first time; and the dial is sized from the measured column, 56–100 pt, not fixed at 100. §13 and §15 now say the six hexes are authored rather than sampled — the photos set the hue family, not the value. **Measured on a device (2026-09-12, owner, iPhone 17 Pro, Expo Go, development bundle):** a 9×9 sandbox of roughly 2,100 SVG nodes in 81 roots holds 60 fps on the UI thread and 60 on the JS thread at rest, 1.2 ms layout, 559 MB RAM and an 84 MB Hermes heap; the lowest reading was a transient 43 fps during a frog rip. That is a floor and not the shipping number — one device, the newest one, and no production bundle has been measured — and it is recorded in §16 beside the PNG fallback it is the evidence for. Phase 5 is not finished: the coaster illustration, the level cards on Home, the blast rings, the clear particles, the confetti and coin pile, sounds and haptics are still to come.
>
> **v0.9.8 (2026-09-11, art hand-off):** the phase 5 art direction is settled (`docs/QUESTIONS.md` item 37) and `docs/design/BRIEF.md` is now the designer's work order. §12's yarn balls are **soft dimensional** rather than flat — a warm side light, a shaded underside and a contact shadow, still matte; §16's source 1 says the designer delivers production SVG and notes that the renderer can be swapped for PNG or Skia later without touching the game, because the step player only hands it numbers. The animated showpieces (confetti, coin burst, frog idle) are commissioned after level 1's static art is in.
>
> **v0.9.7 (2026-09-11, phase 4 built):** levels have rules. §11 gains "Level conventions (phase 4)": damage is per match and per blast rather than per cell, a knot is credited rather than stored, one `blocker` step per layer, a moth **multiplies** instead of crawling (owner, `docs/QUESTIONS.md` item 36), beads drop on a schedule and leave at the top of a cascade, goals are live or counted, and the end of a move runs drop → spread → won/lost/shuffle. Yarn Over places every unused move's special at once and fires them. The step list gains `points`, `buried` and `moves`; §16's `mothSpread` row follows the multiply rule; phase-2 conventions 2 and 13 are amended (a swipe from a knot, tangle or moth is ignored; win, lose and the placeholder HUD are no longer deferred). Levels now load through `@hooked/levels`.
>
> **v0.9.6 (2026-09-11, phase 3 built):** specials fire. The rules are recorded in §11 ("Specials conventions (phase 3)"): `blast` and `frogRip` steps take the pieces they name and carry `points`, a wave runs breadth-first after the clear, the meter charges per wave and drops one piece a move, and `game.tap` fires in place for a move. §4's blast-shape sentence and the Puff row are corrected to the decided plus-of-five and rounded square, and §16 notes that the drawn ring waits for the art in phase 5.
>
> **v0.9.5 (2026-09-11, phase 2 built):** the step player's rules are recorded in §11 ("Step player conventions (phase 2)"): one clock per move that every piece samples, input locked while it plays, the swipe decided at activation from the touch-down point, where spawned pieces enter, the shuffle fade, and what a ball carrying a special looks like before phase 3. §16's `clear` particles move to phase 5 and its `spawn` row follows the engine's entry rows. The board on the phone plays `packages/levels/levels/dev/sandbox-9x9.json`, a development level the loader never lists.
>
> **v0.9.4 (2026-09-11, phase 1 built):** the engine conventions are recorded in §11 ("Engine conventions (phase 1)"): runs are split by holes only and blockers are floors (§3, §10), the `clear` step carries `points`, `state()` carries `level` and the two `meter` shapes, and §16 gains a `shuffle` row. `packages/engine/fixtures/*.json` are engine test and CLI inputs, not shipped levels.
>
> **v0.9.3 (2026-09-10, second round):** her first name is in the credits line and the hidden level's note, and nowhere else (§13, reversing the blanket no-name rule; photos still never ship); the Google Play account canvass-app ships under is reused; age rating matches Fishdom (4+ / Everyone) with a 13+ declared audience; the store name is **Yarn Over** (§11 Shipping; "Yarniverse" was dropped because "Knit Stars and Yarniverse" exists).
>
> **v0.9.2 (2026-09-10, owner decisions):** the [verify] mechanics are decided rather than measured against Fishdom (§3–§6: blast shapes, meter, combos, blocker damage, beads; the frog is its own piece); no personal identity ships (§12, §13, §15, §16: no name, no photos; photos are artist references in `docs/reference/`); cloud save via a `progress` document (§11 Backend); persistence is `expo-sqlite/kv-store`, navigation is React Navigation native-stack (§11 Rendering); the Craft Nook catalogue, the `hard` labels and the hidden level are pinned (§8, §10, §13); Book 1 is planned in `docs/LEVELS-BOOK1.md`; the art brief for the designer is `docs/design/BRIEF.md`. Every answer is logged in `docs/QUESTIONS.md`.
>
> **v0.9.1 (phase 0, 2026-09-10):** `expo-av` → `expo-audio` in §16 (expo-av no longer ships with the Expo SDK); the phase 4 entry in §11 says five goal types (Buried, added in v0.7, makes five); the monorepo uses npm workspaces, the one departure from canvass-app's tooling (see CLAUDE.md). Open decisions are tracked in `docs/QUESTIONS.md`.
>
> **v0.9:** backend is an Express API in `apps/api` with MongoDB on Heroku, mirroring canvass-app; API and collection sketch in §11.
>
> **v0.8:** Hooked is a commercial release that is a tribute to her, not a private gift app. Real purchases (§8), a backend with wallet, grants, codes and a VIP flag (§11), a new phase 7, and a release phase 9. The back-rub Yarn Bank is gone.
>
> **v0.7:** after playing Fishdom to level 18: landscape orientation (§11), stitch markers / Continue / Yarn Bank / walls (§8), the Buried goal (§6), boosters unlock at level 8, verified layouts, and Book 1's teaching order aligned to Fishdom's.
>
> **v0.6:** `meter: none` and `tutorial` fields in §10; Book 1 is planned level by level in `docs/LEVELS-BOOK1.md`.
>
> **v0.5:** monorepo layout in §11, mirroring the tooling of the existing `canvass-app` repo (workspaces, EAS Build, EAS Update).
>
> **v0.4:** the reference game is **Fishdom (Playrix)**, not Candy Crush. That changes the specials (§4), the meta (§8) and the progression, and moves the room from v2 into v1. The engine architecture (§11) is unchanged. Items marked **[verify]** should be checked by playing Fishdom's first ~50 levels before phase 3.

---

## 1. The pitch

Swap yarn balls to make matches. Every level is a crochet project (a coaster, a granny square, a pumpkin) with a move limit. Complete the project's goals and it gets **fastened off**: it pays coins and appears in her room. Coins buy furniture and amigurumi creatures; a beautiful room unlocks the next one. The board mechanics are deliberately faithful to Fishdom, the game she's at level 7000 in; the crochet lives in the pieces, the specials, the projects and, most of all, the room she decorates with what she makes.

**Design pillars**

1. **Feels like Fishdom in the hands.** Match sizes, blasts, the charge meter and the way specials fire behave the way she expects. No surprises in the mechanics she's mastered.
2. **Every level makes something, and everything you make goes somewhere.** Objectives are projects; finished projects decorate the room.
3. **A tribute that ships.** Her real projects and palette are in the game, drawn as illustrations; her photos are not, and her first name appears only in the credits and the hidden level. The game is a real commercial release, and the tribute is the game itself and its upside.

---

## 2. The loops

- **Move loop:** swap → matches clear → specials fire and feed the frog meter → gravity → refill → cascades → blockers react → goal check.
- **Level loop:** tap Play in the room → project card with goals → play within N moves → win = *"Fastened off!"*, Yarn Over bonus, coins, the project appears in the room → lose = *"Ran out of yarn"*, −1 life.
- **Meta loop (Fishdom's):** coins buy decor and amigurumi for the room → beauty stars rise → 3 stars unlock the next room → repeat.

---

## 3. Board rules

- Grid up to **9×9**. Any cell can be masked off to make shaped boards (a coaster is round-ish, a scarf is 5 wide and 9 tall, a tote is a trapezoid, a butterfly has four wings).
- **5–6 yarn colors** per level (fewer colors = easier and makes 6- and 7-matches possible). Palette from her work (§15): `olive`, `mustard`, `blush`, `rust`, `lavender`, `cocoa`. Measured on a full 9×9 board (2,400 bot moves per setting, 2026-09-11): six colors cascade on 34% of moves and make a special every ~9 moves; five cascade on 46% and make one every ~5; four cascade on 60% and make one every ~2. Five is the lively default for Book 1; six is the dry, harder setting, and four is chaos. A level's color count is the first dial to reach for when it plays flat or frantic.
- **Swap** two orthogonally adjacent pieces. A swap is legal if it creates a match of 3+, or if either piece is a special (swapping a special fires it, Fishdom-style). Otherwise the pieces snap back and no move is spent.
- **Match** = 3+ same color in a straight line. Matches of 4, 5, 6 and 7+ pieces create specials (§4); an L or T counts by total pieces (an L of 5 is a 5-match). The special spawns at the swapped piece (or the corner of an L/T); a match made by a cascade spawns its special at the middle cell of the run (the corner for an L/T).
- **Gravity** pulls pieces straight down. Each vertical run of non-hole cells refills from a spawner at its top; a tangle, moth or knotted ball inside a run is a floor: nothing falls through it, and the cells below it stay empty until it clears, the way a Fishdom column only ever fills from its top. (Diagonal slide around holes is a v2 item.)
- **Cascades**: after refill, re-check for matches; each successive cascade raises the score multiplier (×1, ×2, ×3 … capped at ×5). The HUD shows it as *Combo ×2*, *Combo ×3* … the way Fishdom does.
- **No valid moves** → "Untangling…" and the board reshuffles (never into an immediate match).
- **Hint**: after ~5 s idle, wiggle a valid match.
- **Randomness** is per attempt (every retry is a fresh board), but the engine takes a seed so tests and bot simulations are reproducible.

---

## 4. Pieces and specials (Fishdom's system)

Fishdom's power-ups scale with match size and are all area blasts; the color-clear comes from a charge meter, and line clears from an alternative meter on some levels. Crochet has a ready-made ladder of textured stitches for the blasts: puff → bobble → popcorn → yarn bomb.

| Piece | Made by | When it fires | Fishdom equivalent |
|---|---|---|---|
| **Yarn ball** | default | clears when matched | tile |
| **Puff** | 4 in a match | clears a plus of five: its own cell and the four orthogonally adjacent ones | Firecracker |
| **Bobble** | 5 in a match | clears everything within a 2-cell radius | Bomb |
| **Popcorn** | 6 in a match | clears everything within a 3-cell radius | Dynamite |
| **Yarn Bomb** | 7+ in a match | clears everything within a 4-cell radius | Warhead |
| **The Frog** | the frog meter fills | hops onto a random open cell; swap it with any adjacent ball to rip out every ball of that color. Crocheters call undoing work "frogging" (rip it, rip it). **Decided:** the frog is its own colorless piece (`kind: 'frog'`), never a special on a ball; fired without a swap partner (double-tap, or caught in a blast) it rips the most common color on the board | Lightning |
| **The Hook** | replaces the frog meter on some levels | clears 3 rows or 3 columns through its cell; the swap direction picks the orientation, double-tap means rows | Energy Blast |

**Blast shape.** "Radius r" means a **rounded square**: the (2r+1)-square centred on the special minus its four extreme corners. Puff is the exception and is a plus. **Decided (2026-09-10):** rounded squares stand, so on an open board a Bobble clears 21 cells, a Popcorn 45, a Yarn Bomb 77; a Puff is a plus of 5. A blast passes over holes; a tangle or moth inside its area loses one layer, a knotted ball inside it loses the knot and clears, a bead inside it is untouched. These are our rules; they only have to feel like Fishdom, not match it.

**The frog meter.** A small frog with a meter sits beside the board — §11 hangs it as a round dial under the goals panel, which is where phase 5 built it. Every special that fires adds charge: Puff +1, Bobble +2, Popcorn +3, Yarn Bomb +4, and several firing in the same step add a +2 bonus. At 10 the frog hops onto a random open cell as a piece and the meter resets. **Decided:** these rates stand. The meter starts empty on every attempt (only the Frog Ready booster fills it); a full meter drops a frog even if one is already on the board; neither a frog rip nor the Hook charges it.

**Firing a special.** Swap it with any adjacent piece (legal even without a match), double-tap it in place, hit it with another blast, or include it in a match. Blasts chain: a Puff that hits a Bobble that hits the Frog all fire in one wave.

**Combos.** Swapping two specials fires both at once with a combined, larger blast (two Bobbles ≈ one Popcorn-sized blast, and so on). Frog + special: the special fires and the frog rips the most common color. Fishdom's combos are "more explosion," not Candy Crush's combo matrix, so keep it simple and make it look big. **Decided:** swapping two blasts fires one blast of radius max(r₁, r₂) + 1 from the swap cell (a Puff counts as r = 1; anything past a Yarn Bomb is the whole board). Hook + Hook fires 3 rows and 3 columns. Hook + blast fires both from the swap cell. Frog + Frog rips the two most common colors. Frog + Hook fires the hook and rips the most common color.

**Design note.** She will go looking for 6- and 7-matches because in Fishdom they're the big moments. Some levels need 5 colors and open boards to make that possible; hard levels can use 6 colors and clutter to take it away.

---

## 5. Blockers

| Blocker | Stands in for | Behavior | Cleared by |
|---|---|---|---|
| **Tangle** | crates / chests | fills a cell with tangled yarn, 1–3 layers; nothing falls through it | each adjacent match or blast removes one layer |
| **Knot** | ice-locked pieces | a yarn ball tied in place; can't be swapped or moved, but it can still be matched where it sits | matching that ball |
| **Moth** | spreading obstacles | fills a cell. At the end of any move where no moth was cleared, one moth eats a random adjacent yarn ball and spreads there | adjacent match or blast |

**Decided (2026-09-10):** a tangle loses one layer per *match* that touches it (a match with two balls against it still strips one) and one layer per *blast* whose area covers or touches it. A knotted ball inside a blast area loses its knot and clears. A stitch square counts when the piece on it clears by match or by blast.

Three blockers is plenty for v1. They combine well: a knotted ball behind a wall of tangles with moths creeping in is a real level.

---

## 6. Goals (what the project needs)

Fishdom shows the goals before the level and keeps them in a goals bar during it; do the same.

| Goal | Stands in for | How it works | Shows up as |
|---|---|---|---|
| **Stitch** | clear-the-cell goals | some cells are "unstitched" squares of the project (1 or 2 layers). Clearing a piece on top of the square stitches it | the board *is* the blanket pattern, stitching in square by square |
| **Collect** | collect N pieces of a type | "This pumpkin needs 40 orange and 10 green." Every cleared ball of that color counts, including cascades and blasts | the project illustration fills in as you collect |
| **Beads / Buttons** | drop-to-the-bottom goals | beads (for charm tails) or buttons (for amigurumi eyes) start on or fall onto the board, can be swapped but not matched, and must reach the exit cells at the bottom. New ones spawn on a schedule until the total is reached. Same mechanic, different sprite | beads sliding down to become a butterfly's beaded tails; button eyes getting sewn onto the amigurumi |
| **Clear** | obstacle goals | clear every tangle, knot or moth | "untangle the stash," "save the yarn from the moths" |
| **Buried** | gold in earth | some 2-layer tangles have a button inside (`x` cells). Clearing the tangle collects the button | buttons dug out of the tangled stash |

**Decided (2026-09-10):** beads and buttons are indestructible (blasts and frog rips pass over them). A new one drops from a random spawner every `beads.spawnEvery` moves until `total` is reached. Exits default to the lowest open cell of each column at level start; a bead resting on a tangle waits. A goal's `sprite: "button"` picks the button art.

Levels can mix goals (Stitch + Beads, Collect + Clear). Every level has a **move limit**.

**Win:** all goals complete. Trigger **Yarn Over**, Fishdom-style: each remaining move turns a random ball into a Puff or Bobble that fires, and pays coins. Banner: *"Fastened off!"* The finished project pays its coins and appears in the room.

**Lose:** on the last move with goals unmet, the Continue prompt appears (§8): +5 moves for stitch markers, or decline. Declining costs one life and shows *"Ran out of yarn."* before returning to the room.

---

## 7. Score, coins, stitch markers and beauty

Placeholders to tune; the shape matters more than the numbers.

- **Score** (for personal bests and the fun of it): cleared yarn ball **20** × cascade multiplier; creating a special Puff **+60**, Bobble **+120**, Popcorn **+250**, Yarn Bomb **+500**; frog rip **+500**; stitching a square **+1,000**; blocker layer **+200**; bead delivered **+2,000**. Show a per-level personal best.
- **Coins** (the currency that matters): each level pays a base amount (**100** early, rising with level number), plus **+20 per remaining move** during Yarn Over, plus project bonus for finale levels. Coins buy decor and amigurumi (§8). Coins are not sold for money directly; the shop sells coin packs for markers.
- **Beauty** (room progress): every decor item and creature has beauty points. A room's beauty total maps to 1–3 stars; 3 stars unlock the next room. This is Fishdom's aquarium beauty.
- **Stitch markers** (the premium currency, Fishdom's diamonds): earned in play and sold in packs. Rules in §8.
- No per-level star ratings. Fishdom doesn't rate levels; the reward is coins and the room.

---

## 8. Progression and the room (Fishdom's meta)

**Home screen = the room.** Just like Fishdom opens on the aquarium: the current room fills the screen, a big **Play** button shows the next level number, and the HUD has coins, lives, the shop cart, the Pattern Book and settings. There's no saga map.

**Levels** are numbered continuously (1, 2, 3 …). Hard levels are flagged on the Play button: *Tricky*, *Tangled*, *Nightmare Skein*. In the level file `hard` is `false` or one of `"tricky"`, `"tangled"`, `"nightmare"`; level 12 of every book is *Tricky*; level 15 is tuned to wall pass rates but left unflagged so the finale reads as a project, not a warning. Beating a level pays coins and places its project in the room.

**Lives.** 5 max, one regenerates every 20 minutes (Fishdom uses 30). A refill costs stitch markers (§ below); timed unlimited-lives rewards for milestones show as ∞ with a countdown, like Fishdom. A hidden "endless yarn" toggle (long-press the version line in Settings) stands in for the VIP flag on builds cut before phase 7, so she can play the phase 6 TestFlight build without a paywall.

**The shop.** Four tabs like Fishdom's: Creatures, Decor, Rooms, and (v2) Pattern Cards. Each item shows a coin price and a "+beauty" number. Some levels unlock a new decor item, shown with a New badge on the win screen. Items are organized in sets so matching pieces look good together:

- *Furniture*: sofa, armchair, side table, bookshelf, yarn cabinet, desk, lamp, rug, curtains.
- *Little things*: plants, candles, mugs, framed patterns, a bird print, a record player, fairy lights.
- *Amigurumi creatures* (the "fish"): cat, frog, bee, octopus, bunny, mushroom guy, ghost (October). No sheep for sale: the sheep is Skein, the guide. They sit or wander, have 2–3 idle animations, and say short lines in speech bubbles the way Fishdom's fish talk. Tap one and it bounces.
- *Care, kept light*: now and then a creature wants a pat (tap → happy bounce → 1 stitch marker, at most every 8 hours per creature; Fishdom's feeding-for-diamonds), and yarn scraps appear on the floor to tidy with a drag of the lint roller (Fishdom's sponge). No nagging.

**Finished projects place themselves.** Each level's project has a home in the room: coasters on the side table, the granny blanket over the sofa, the tote on a wall hook, the butterfly charm on a tumbler on the desk, Twirly on the balcony. Her actual work, on the actual furniture she picked.

**Rooms**, unlocked at 3 beauty stars in the previous one:

1. **Craft Nook** (start): a corner with a chair, a side table, a wall hook, a lamp and an empty shelf. Catalogue (decided 2026-09-10): the cat, the frog and the bee; twelve decor items in two sets, *Corner* (a nicer chair, lamp and shelf that replace the starting ones, plus rug, curtains, yarn cabinet) and *Little things* (plant, candle, mug, framed pattern, fairy lights, record player); stars at 30 / 60 / 100 % of the catalogue's total beauty, priced so three stars is reachable with one pass through Book 1.
2. **Living Room**: sofa and blanket territory.
3. **Bedroom**: desk, charms, the bird print from her real room.
4. **Balcony**: plants, string lights, Twirly spinning.
5. **Yarn Shop**: her own shop, with a window display that turns Halloween for October.

**Stitch markers, Continue and the Yarn Bank (Fishdom's diamond economy).** Fishdom's loop: levels get harder, lives run out, and a *Continue? +5 moves* prompt priced in diamonds appears when you're two pieces from winning. Hooked uses the same loop and, as a commercial release, the same business model. Markers are earned in play and also sold.

- **Stitch markers** are the premium currency; crocheters hoard them and lose them constantly. Icon: a small enamel locking marker.
- **Earn:** patting a creature that wants attention (1 marker, each creature at most every 8 hours), the daily yarn basket (1–3), a 3-win streak (+2), each room beauty star (+10), finishing a pattern book (+15), and the Yarn Bank. Target 5–8 a day with normal play, so a non-paying player clears a wall with a day or two of saving.
- **Spend:** *Continue* (+5 moves): 9 markers the first time on a level, 19 the second, 29 the third, resetting when the level is won or left (decided: this escalation stands). Life refill to 5: 9 markers. Unlimited lives for 30 minutes: 19. Boosters and coin packs for markers.
- **Buy (real money):** marker packs at the usual tiers (placeholders: 20 / 55 / 120 / 300 / 700 / 1,800), a one-time Starter Bundle (markers, boosters, 30 minutes of unlimited lives), and the **Yarn Bank**: a jar that fills with markers as levels are beaten (1 per level, 3 per hard level, cap 40) and opens for a store-configured price (placeholder $2.99) once it holds 15 or more, on a 7-day timer, exactly Fishdom's Fishy Bank. No loot boxes, no gacha. Prices are configured in App Store Connect, Play Console and RevenueCat, not in code.
- **The Continue prompt:** on the last move with goals unmet: *"Ran out of yarn. Play on?"* with the remaining goal count in view, a big +5 badge, and the button priced in markers; if the balance is short, it opens the marker shop. Decline → lose a life, back to the room. No ads in v1.
- **Walls.** Levels 12 and 15 of every book are tuned as walls (15–25% greedy-bot pass rate) and are where Continues get spent. Tune walls so losses are close: on failed bot attempts, at least half should end within 10% of the goal.
- **Fair-play rules** (good for reviews and for App Review): every level is beatable without paying; markers are earnable every day; nothing is purchased automatically; purchases restore across devices through the account; no fake countdown discounts in v1.
- **Free stuff you control** (details in §11 Backend): a **VIP flag** on a player gives unlimited lives and free Continues (her, testers, friends); **grants** from the admin page give any player markers, coins, lives or unlimited-lives time with a note, which doubles as customer support; **redeem codes** entered in Settings. Grants and codes land in-game as a gift popup from Skein.

**Boosters.** Earned from the daily yarn basket, win streaks and room milestones, and sold for markers, never directly for money. Booster slots unlock at level 8, like Fishdom, with three free Scissors. The level card offers up to three pre-level picks; the in-level panel on the right has four slots.

| Booster | When | Effect | Fishdom equivalent |
|---|---|---|---|
| Two Bobbles | pre-level | start with two Bobbles on the board | Double Bombs |
| Frog Ready | pre-level | start with the frog meter full | Lightning |
| Popcorn & Frog | pre-level | start with a Popcorn and a full meter | Dynamite & Lightning |
| Scissors | in-level | snip any single piece or blocker layer | Hammer |
| Lint Roller | in-level | clear a whole row | Torpedo |
| Darning Needle | in-level | clear a whole column | Anchor |
| Loosen | in-level | swap any two pieces without needing a match | Diving Gloves |

Pick up to 3 pre-level boosters on the level card, like Fishdom.

**Win streak.** 3 wins in a row → a free pre-level booster on the next level; 5 in a row → two. A loss resets it.

**Daily yarn basket.** Open once a day: a booster, coins, a life refill or a decor item. A visible streak counter.

**Pattern Book.** Every fastened-off project on a page: its illustration, the level number, the date, and which room it lives in.

---

## 9. Content plan

Levels are a single continuous sequence, but they're **authored in pattern books** of 15 for organization, and each book has a home room. Within a book: levels 1–4 easy, 5–9 medium, 10–14 include one flagged hard level, 15 is the book's big project.

| # | Pattern book | Levels | Teaches | Room | Projects |
|---|---|---|---|---|---|
| 1 | Kitchen & Coasters | 1–15 | Fishdom's own order: swap and Puff (1), Bobble (3), Tangles (4), frog meter (5), Popcorn (7), Knots and booster slots (8), Yarn Bomb (10), Buried (11), first wall (12); Stitch, Collect, Clear and Buried goals | Craft Nook | puff-stitch coasters (her set of twelve is the finale), potholder, dishcloth, mug cozy, Puff Flower, the button jar, the yarn basket; level by level in `docs/LEVELS-BOOK1.md` |
| 2 | Cozy Blankets | 16–30 | shaped boards, 2-layer tangles, 2-layer stitches, Hook levels | Living Room | granny square, chevron throw, corner-to-corner, the big brown blanket |
| 3 | Bags, Butterflies & Charms | 31–45 | Beads goal, tangle bars that span rows (Fishdom's ice columns) | Bedroom | the olive tote, market bag, butterfly charm with beaded tails, keychain charm, purse with a button clasp |
| 4 | Little Animals & the Balcony | 46–60 | Moths, mixed goals | Balcony | cat, bee, octopus, bunny, a frog (obviously), Twirly |
| 5 | October | 61–75 | everything at once, more hard levels | Yarn Shop | pumpkin, ghost, bat, witch hat, candy-corn garland |

Ship v1 with books 1–3 (45 levels) and rooms 1–3. Books 4 and 5 follow; October is a natural seasonal drop. After that, a new pattern book plus a new room is a repeatable release: seasonal drops (October, winter holidays, spring), never tied to a personal date.

---

## 10. Level file format

Levels are hand-authored JSON so they're quick to write, tweak and ship without touching code. Character grids keep board layout readable.

**Cell grid legend** (`cells`)

| Char | Meaning |
|---|---|
| `.` | hole (not part of the board) |
| `o` | open cell, random yarn |
| `1` `2` `3` | tangle with that many layers (no yarn) |
| `k` | knot (random yarn, locked in place) |
| `m` | moth |
| `b` | a bead starts here |
| `x` | 2-layer tangle with a button buried inside (Buried goal) |

**Stitch grid legend** (`stitch`, optional, same shape)

| Char | Meaning |
|---|---|
| `.` | nothing to stitch |
| `1` `2` | unstitched square with that many layers |

**Worked example — level 17, "Granny Square"**

```json
{
  "id": 17,
  "book": 2,
  "name": "Granny Square",
  "project": "granny_square_sunset",
  "hard": false,
  "moves": 24,
  "colors": ["olive", "mustard", "blush", "rust", "lavender"],
  "meter": "frog",
  "cells": [
    "ooooooooo",
    "o1ooooo1o",
    "ooooooooo",
    "ooo...ooo",
    "ooo...ooo",
    "ooo...ooo",
    "ooooooooo",
    "o1ooooo1o",
    "ooooooooo"
  ],
  "stitch": [
    "111111111",
    "1.......1",
    "1.22222.1",
    "1.2...2.1",
    "1.2...2.1",
    "1.2...2.1",
    "1.22222.1",
    "1.......1",
    "111111111"
  ],
  "goals": [
    { "type": "stitch" }
  ],
  "coins": 140,
  "presets": [
    { "x": 4, "y": 0, "piece": "bobble" }
  ]
}
```

**`project`** (required since 2026-09-13). The thing the level makes, as a string: it is the key the project's illustration is filed under (`apps/mobile/src/art/illustrations.js`, §11's art conventions), so the win screen draws what she made by reading this one field. `validateLevel` rejects a level without it — a level with no project fastens off into nothing, and the field is what a later illustration would be hung on. A project whose art is not *drawn* yet is fine and is the normal case: the screen draws nothing in its place, no placeholder, which today is every board but Book 1 level 1. `docs/LEVELS-BOOK1.md` names Book 1's fifteen projects, one per row, and its foot fixes how their ids are spelled.

**Other goal shapes**

```json
{ "type": "collect", "color": "lavender", "count": 30 }
{ "type": "beads", "count": 3 }
{ "type": "clear", "blocker": "moth" }
{ "type": "buried", "count": 12 }
```

**Optional fields**

```json
"meter":    "frog",
"beads":    { "total": 3, "onBoard": 1, "spawnEvery": 6 },
"exits":    "bottom",
"weights":  { "lavender": 1.4 },
"spawners": [[0,0], [1,0], [2,0]]
```

- `meter`: `"frog"` (default), `"hook"` (replaces the frog meter with the Hook meter on that level), or `"none"` (levels 1–4, before the frog meter is introduced at level 5).
- `tutorial`: one of `swap`, `puff`, `bobble`, `meter`, `popcorn`, `yarnbomb`, `tangle`, `knot`, `buried`, `boosters`, or an array of them played in order (level 1 is `["swap", "puff"]`, level 8 is `["knot", "boosters"]`). For match-size beats the generator guarantees an opening board where one swap makes that size (for `meter`, it places a Bobble); for blocker beats the level's own cells provide the setup. The UI shows Skein's line and a hand pointer. One line, one pointer, skippable.
- `beads`: total to deliver, how many start on the board, and how many moves between spawns. `exits` defaults to the bottom open cell of every column; pass a list of `[x, y]` to restrict it.
- `weights`: bias the refill toward a goal color (>1) or away from a nuisance color (<1).
- `spawners`: override the default (the top cell of each vertical run of non-hole cells); every entry must be such a run top, and a run without a spawner never refills.
- `presets`: place specific pieces at level start (`puff`, `bobble`, `popcorn`, `yarnbomb`, `hook`, `frog`).
- `hard`: `false`, `"tricky"`, `"tangled"` or `"nightmare"`: the label on the Play button (§8).
- `hidden`: `true` marks the frog-tap secret level (`id` 7000, `book` 0, §13); hidden levels are left out of the Play sequence and the bot-sim reports.
- a `beads` goal may carry `"sprite": "button"` to draw buttons instead of beads (§6).

---

## 11. Architecture (React Native)

**The single most important decision:** the game engine is plain JavaScript (`.js` modules, no TypeScript) with zero React Native imports. It takes a level and a seed, accepts a swap or a tap, and returns a list of animation steps plus the new state. The UI just plays the steps. This makes the engine unit-testable, lets you build a throwaway web playground to feel the mechanics before writing any native UI, and lets you tune difficulty with bots.

**Engine API sketch (JavaScript)**

The data shapes are documented with JSDoc comments, which give you editor hints without TypeScript. Tell Claude Code "plain JavaScript with JSDoc, no TypeScript" and it will keep to that.

```js
// packages/engine/src/constants.js — documentation only, nothing to compile

/** @typedef {'olive'|'mustard'|'blush'|'rust'|'lavender'|'cocoa'} Color */
/** @typedef {{ x: number, y: number }} Pos */
/** @typedef {'puff'|'bobble'|'popcorn'|'yarnbomb'|'hook'} Special */

/**
 * @typedef {Object} Piece
 * @property {'yarn'|'frog'|'bead'} kind
 * @property {Color} [color]        yarn only
 * @property {Special} [special]    yarn only; a special sits on a colored ball
 * @property {boolean} [knotted]    yarn only
 */

/**
 * @typedef {Object} Cell
 * @property {boolean} open
 * @property {Piece} [piece]
 * @property {number} [tangle]   1–3 layers; the cell has no piece while > 0
 * @property {boolean} [moth]
 * @property {number} [stitch]   0–2 layers under the piece
 * @property {boolean} [buried]  a button under a tangle (`x` in the level file)
 */
```

```js
// packages/engine/src/game.js, imported as @hooked/engine
import { createGame } from '@hooked/engine';

const game = createGame(levelJson, seed);

game.state();
// → { board: { width, height, cells }, moves (remaining), score, coins, meter, goals,
//     status: 'playing' | 'won' | 'lost', level: { id, name } }
//   meter is { kind: 'none' } or { kind: 'frog'|'hook', charge, full: 10 }

game.swap({ x: 3, y: 4 }, { x: 4, y: 4 });   // → { steps: [ ... ] }
game.tap({ x: 3, y: 4 });                     // double-tap fires a special in place
game.useBooster('scissors', { x: 2, y: 7 });
game.validMoves();                            // → [[a, b], ...] for hints and shuffle checks
```

Steps are plain objects. The step player in the UI is one function that switches on `type`:

```js
{ type: 'swap', a, b, illegal }              // illegal → animate and snap back
{ type: 'clear', cells, created, cascade, points }   // cells: Pos[]; created: [{ pos, piece }]; cascade 1-based; points this step scored
{ type: 'blast', pos, special, radius, orientation, cells, cascade, points, combo }  // a firing
{ type: 'frogRip', pos, color, cells, cascade, points, combo }   // the frog ripping out a color
{ type: 'meter', charge, full }              // frog (or hook) meter changed
{ type: 'meterDrop', pos, piece }            // the frog or hook lands on the board
{ type: 'blocker', pos, kind, layersLeft, points, buried } // kind: 'tangle' | 'moth' | 'knot' | 'stitch'; one per layer; `buried` only on a tangle's last layer
{ type: 'fall', moves }                      // moves: [{ from, to }]
{ type: 'spawn', cells }                     // cells: [{ pos, piece }]
{ type: 'mothSpread', from, to }
{ type: 'beadExit', pos, points }
{ type: 'shuffle', board }
{ type: 'yarnOver', specials, coins, moves }  // specials: [{ pos, piece }] placed on plain balls, then fired as ordinary steps
```

**Resolution loop (inside `swap` / `tap`)**

1. Validate the input; emit `swap` (illegal → snap back, no move spent). A swap or tap involving a special fires it.
2. Loop until stable:
   - find matches; determine specials to create (by match size); build the clear set
   - expand the clear set through blasts (breadth-first), adding meter charge for each special fired
   - apply damage: stitches under cleared cells, tangles/moths adjacent to cleared cells, knots on cleared balls
   - remove pieces, place created specials, score × cascade multiplier
   - gravity, then refill (beads on schedule), cascade++
3. If the meter is full, drop the frog (or hook) on a random open cell and reset the meter.
4. If no moth was cleared this move, spread one.
5. Check goals → won (emit `yarnOver`) / moves = 0 → lost.
6. If no valid moves remain, shuffle.

**Rendering**

- Board: one absolutely-positioned `Animated.View` per piece, each holding the drawn piece from phase 5, driven by Reanimated shared values. Play `steps` sequentially (timings in §16). A 9×9 grid of Views animates fine; Skia is not needed — measured once in phase 5, on one phone and a development bundle; §16 source 1 has what that does and does not show.
- Input: Gesture Handler pan → swipe direction → `game.swap`. Tap-tap on a special → `game.tap`.
- Screens: Room (home), Shop, Board + HUD with goals panel and meter (the level card, with its goals, moves and booster picker, is a step inside it rather than a route — see Navigation), Continue prompt, Result (coins, New decor unlock), Yarn Bank, Pattern Book, Settings.
- Navigation: React Navigation native-stack (`@react-navigation/native-stack`), one navigator, the Continue prompt and Result as modal screens; every navigation call goes through `apps/mobile/src/nav.js` so the navigator can change in one file. **The level card is not a route** (owner, 2026-09-13): it is a step inside `PlayScreen` that holds the board's mount back until a frame has been painted, because a route cannot do that — `PlayScreen` measures the arena on one commit and mounts the board on the next, so the expensive commit lands after `onLayout` returns whatever is on screen. Readiness is the screen's own state, and only a sibling in that subtree can read it without a provider above the navigator.
- Persistence: `expo-sqlite/kv-store` (synchronous, ships with the SDK, runs in Expo Go) behind one `apps/mobile/src/meta/storage.js` module for progress, coins, room layout, lives timestamp, boosters, streaks; MMKV stays a one-file swap if it is ever needed.
- **Landscape**, matching Fishdom (she already holds her phone that way for it); lock it in `app.json`. In-level layout, left to right: a goals panel (level number at the top, goal icons with remaining counts, the move counter at the bottom) with the frog meter as a round dial just below it (built in phase 5, and sized from the measured column rather than fixed, so a four-goal level shrinks the dial instead of pushing the move counter off the screen); the board centered and as tall as the screen allows; a booster panel with four slots on the right, settings gear beneath it. The room is a wide scene with a top bar (avatar, lives with timer, coins, stitch markers, settings) and a bottom bar (Store button showing the room's beauty stars, shop, Pattern Book, and a big Play button with the level number at the far right). iPad uses the same layout with more air, stays landscape-locked (`requireFullScreen`), and since she may play on one it is phase 6 work, not phase 9. The board and HUD lay out against a measured arena view, never the window, so the lock can be dropped later without a layout rewrite.
- Expo makes testing on her phone and iPad painless.

**Monorepo.** Same tooling and conventions as the existing `canvass-app` repo: the same package manager and workspaces setup, the same metro/babel config approach, the same `eas.json` profile and EAS Update channel scheme. Mirror the tooling, not the identity: Hooked gets its own EAS project (`eas init`), its own bundle identifier and package name, and none of canvass-app's credentials or env secrets. The engine and levels are workspace packages so the mobile app and the web playground share them.

```
hooked/                     monorepo, same tooling as canvass-app
  apps/
    mobile/                 Expo app: EAS Build + EAS Update
      src/
        game/               Board, Piece, HUD, GoalsBar, Meter, gestures, step player
        room/               Room scene, placement, shop, creatures, beauty
        screens/            Room, Shop, LevelCard, Play, Result, PatternBook, Settings
        meta/               progress store, coins, lives, boosters, streaks, daily basket
        art/                yarn sprites, specials, creatures, decor, rooms, project illustrations
    playground/             throwaway web harness (Vite) that imports @hooked/engine; phases 1–3
    api/                    Node/Express API, MongoDB, Heroku (phase 7), same setup as canvass-app
    admin/                  small React page over the admin routes: grants, codes, VIP (phase 7)
  packages/
    engine/                 @hooked/engine: plain JS engine + Jest tests, zero RN imports
    levels/                 @hooked/levels: level JSON + loader + schema validation
  docs/DESIGN.md
  CLAUDE.md
```

**Backend (needed the moment there are purchases and grants).** Playing stays fully offline; the server owns money and identity. Same stack and deployment as canvass-app: a Node/Express API in `apps/api`, MongoDB (Atlas), deployed to Heroku from the monorepo the way canvass-app is. Use a dyno that doesn't sleep; Continue prompts and gift popups shouldn't wait on a cold start.

- **Identity:** on first launch the app generates an install ID, calls `POST /auth/anon` and stores the returned JWT; no sign-up screen. Sign in with Apple or Google (`POST /auth/apple`, `/auth/google`, identity tokens verified server-side) links the same player record for cloud save. Cloud save is real: a `progress` document per player (levels beaten, coins, room layout, decor owned, streaks, a version counter) synced with last-write-wins by version through `PUT /progress` and `GET /progress`, so a signed-in player picks up her room on a new iPhone or iPad. Game Center is not used for identity or saves (it does leaderboards and achievements; a v2 item). Apple requires account deletion for apps with accounts: `DELETE /me` and a Delete Account button in Settings from day one.
- **Wallet ledger:** collection `ledger`, one document per change: `playerId, currency (markers|coins), delta, source (level_win|daily|streak|care|purchase|grant|code|refund|continue|refill), ref, clientId, createdAt`, with a unique index on `clientId` so retries are idempotent. Each write also `$inc`s the cached balance on the player document in the same transaction. The client keeps a cached balance for offline play, queues earns and spends with client-generated UUIDs, and posts the queue to `POST /wallet/sync`, which applies unseen entries and returns the authoritative balances. Purchases, grants and codes apply only when online.
- **Purchases:** RevenueCat (`react-native-purchases`) for App Store and Play Billing, receipt validation and restore. Its webhook hits `POST /webhooks/revenuecat` (verify the shared secret header), which writes a `purchases` document keyed by the RevenueCat event id and credits the ledger. The client never credits markers.
- **Grants, codes, VIP:** collections `grants` (`playerId, reward, note, deliveredAt`) and `codes` (`code, reward, maxUses, uses, expiresAt`), plus `players.vip`. Admin routes behind an admin key from env: `GET /admin/players?q=`, `POST /admin/grants`, `POST /admin/codes`, `PATCH /admin/players/:id` (vip, title). `apps/admin` is a small React page over those routes, built by `heroku-postbuild` and served by the API from `apps/admin/dist` the way canvass-app serves its client (in phase 7 `apps/api` lists `@hooked/admin` as a devDependency so a single-workspace Heroku install pulls it in; the recipe is in `apps/api/README.md`); MongoDB Compass works on day one. `GET /me` returns undelivered grants so the gift popup can play; `POST /codes/redeem` is once per player per code.
- **Telemetry:** `POST /attempts` takes the local attempt log in batches: level, won/lost, moves left, Continues used, markers spent, version. Nothing until phase 7; then Sentry for crashes with the phase 7 development build (the one RevenueCat forces) unless the owner picks otherwise; no product analytics in v1, the attempt log is the funnel.
- **Remote tuning:** levels are JSON and ship with `eas update`; `GET /config` serves the economy numbers (marker prices, earn rates, wall targets) from a `config` document, cached on the client with a version.
- **Collections:** `players`, `progress`, `ledger`, `purchases`, `grants`, `codes`, `attempts`, `config`. Keep the API stateless; everything a request needs is in the JWT and Mongo.

**Engine conventions (phase 1, decided 2026-09-11).** The rules `packages/engine` implements where the sections above left room; keep them easy to change, don't re-open them without the owner.

1. Cascades are numbered from 1 (the swap's own matches); the multiplier is min(cascade, 5); the HUD shows *Combo ×N* from cascade 2. The swapped cells guide special placement on cascade 1 only.
2. A swap-made match spawns its special at the swapped cell that belongs to it (for a swap-made L/T that cell is the corner). A cascade-made match spawns at the corner of an L/T/plus, else at the middle of the run, the left/top middle for even lengths.
3. A yarn ball carrying a special keeps its color and matches normally. A swap is legal if it makes a 3+ match or either piece fires on swap (carries a special, or is the frog); until phase 3 a fire-only swap just exchanges the pieces and spends the move.
4. Vertical runs are maximal groups of non-hole cells, computed once. Tangles, moths and knotted balls are floors inside a run. `spawners` replaces the default set and must name run tops.
5. `weights` default to 1, apply to generation and refill alike, and must leave at least two colors positive. The fill is a construction (it excludes any color that would complete a run with pieces already present), so with three or more positive colors every fill is match-free; the acceptance check (match-free plus at least one valid move) retries up to 200 times, then throws an error naming the level. Phase 1 accepts any two or more distinct colors so tests can use small sets; §3's five-to-six range is a phase 4 schema check. `tutorial` is parsed and passed through; its opening-board guarantee arrives with the tutorial phase.
6. A shuffle permutes the movable yarn balls (knots, beads, the frog and blockers stay) until the board is match-free with a valid move; 200 attempts, then an error.
7. Presets sit on `o` cells only; a preset special rides the ball already there; `frog` replaces it. `x` is a 2-layer tangle with `buried: true`. `exits` default to the lowest non-hole cell of each column; `beads` default to the bead cells on the board; goals, `hard` and `hidden` are validated.
8. Only the cleared ball is multiplied; the special bonuses are flat. A legal swap spends one move; `status` becomes `lost` at 0 moves (`won` arrives with goals). A swap on a finished game returns no steps; malformed coordinates throw; a swap into a hole, tangle, moth, empty cell or knot is an `illegal` step.
9. Steps never share objects with the board, and `illegal` is always a boolean. The stream is complete and strict: `applySteps(board, steps)` (exported) rebuilds the engine's board exactly and throws on a stream that under-reports; the phone's step player is that function with animations. Spawns in one run are the contiguous empty prefix from the run's top, so the i-th of n enters from row top − (n − i); where they enter from on screen is the step player's call (see the phase-2 conventions).
10. More than 100 cascades in one move is an error (a level whose weights leave one color would otherwise loop forever).

**Step player conventions (phase 2, decided 2026-09-11).** What `apps/mobile/src/game` does where §11 and §16 left room; same rule as above, keep them easy to change.

1. One move plays at a time: `game.swap` advances the engine the moment it is called, so there is no half-played board to swap on. A swipe made during playback is remembered only when both of its cells sit out that whole move untouched, because there the board the player aimed at is exactly the board they get; it fires as soon as the move settles. A swipe aimed into the churn is let go rather than applied to whatever lands there, and the last remembered swipe wins. The board arbitrates on the JS side, so a second gesture can never start a second move. (Moves run 470 ms at the median and over a second on one in nine, so dropping every swipe during playback made a fast player's board feel dead.)
2. A swipe is decided once, when the pan activates: the dominant axis of the travel from the touch-down point picks the neighbour (a tie reads as horizontal), and the threshold is a quarter of a cell, clamped to 10–24 pt. The touch-down point is recorded in `onBegin`, because both native pan handlers zero their translation at activation. A swipe that starts or lands off the board, on a hole, on an empty cell, on a blocker or on a knotted ball is ignored without calling the engine (the client's `inPlay` mirrors the engine's `canSwap`, so nothing that cannot move ever slides).
3. A move is one absolute timeline. `buildMove` turns the step stream into a track per piece (segments of `at`, `duration`, `to`, easing, in grid units), the board runs one linear clock from `base` to `base + total`, and every piece samples its track against that clock on the UI thread. Pieces in a column therefore share one instant and a stack cannot drift apart, and the whole timeline is testable in node without a device.
4. Timings follow §16: swap 150 (illegal 2×120, sliding a full cell out and back), then per cascade clear 120 with created specials popping in over the same 120, then fall and spawn together for 200, then the next cascade with no gap. Movement uses a deterministic ease-out-back rather than a spring, so every move has a known length.
5. Spawned pieces enter from above their run: the i-th of n from row top − (n − i) when the run reaches the top edge, clipped by the board; a run fed through a hole has no room above it, so its pieces enter on the hole cell and fan out as they fall. They are invisible until their fall starts.
6. A piece is a view with a stable id, assigned when the board is built, a piece spawns, or a special is created, and kept through swaps and falls. Ids only grow: a shuffle and every self-heal rebuild carry the counter forward, so a fresh piece never takes the key of one still on screen.
7. A cleared piece keeps drawing (scaling to 0 and fading) until the move ends, then is dropped in the same commit that unlocks input.
8. `shuffle` ends its move: everything before it plays, the board fades out over 200 ms behind "Untangling…", every view is rebuilt from the step's snapshot, and it fades back in over 200 ms once those pieces exist.
9. A ball carrying a special (the engine makes them on 4+ matches from phase 1) is drawn as its colored circle with a thin ring. It is a placeholder for legibility, not art: phase 3 replaces it, and until then swapping one just exchanges the pieces and spends the move. (The ring became a letter in phase 3 and the drawn overlay in phase 5; the art conventions below have it.)
10. The board is laid out against a measured arena view, never the window: the cell is the largest whole pixel that fits, the board is centred, and nothing is drawn until the arena has been measured. No side gutters are reserved; the phase-4 panels shrink the arena and the board re-fits.
11. A move ends on the clock's own callback, with a JS timer as a safety net that the clock disarms; the move in flight is recorded before the engine advances, so completion happens exactly once and can never compare a stale board to the engine's.
12. After every move the view's board is compared with the engine's. They must match cell for cell; a mismatch warns in development and rebuilds from the engine rather than playing on from a wrong picture.
13. Deferred, with nothing in phase 2 depending on them: the ~5 s idle hint (§3), the clear particles (§16), the real HUD and the dial, sounds and haptics, and honouring Reduce Motion. (The placeholder goals panel, the move counter and the win/lose screens arrived in phase 4; the drawn HUD icons and the dial arrived in phase 5. Reduce Motion is half done as of 2026-09-13, and the halves are worth keeping apart. The **defect** is fixed: reanimated finishes a reduced animation on its first frame, so with the OS setting on the move clock above landed on its last instant and ran `finishMove` before a piece had drawn, and every clock and cross-fade now names `reduceMotion: ReduceMotion.Never` — art convention 16 has the list and the exceptions. The **feature** is not built: nothing yet takes the fall's overshoot, the blast shake or the particles away from a player who asked for less motion. The hint, the particles, sound and haptics are still outstanding too.)

**Specials conventions (phase 3, decided 2026-09-11).** How the engine fires what §4 decided, and how the step player shows it. Same rule as the lists above.

1. `blast` and `frogRip` steps take the pieces they name and carry `points`, rather than folding their cells into a `clear`. A `clear`'s cells stay exactly the match union, and each firing is a self-contained "go off here, take these". The score is the sum of `points` over every step that has one.
2. Inside a cascade: `clear` (match cells taken, created specials placed), then one step per firing breadth-first wave by wave, then `meter`, then `fall` and `spawn`. A swap or tap that only fires has no `clear` at all. A wave never advances the cascade, so everything it takes scores at that cascade's multiplier.
3. A firing's cells are computed against the live board at the moment it goes off and removed before the next one runs, so no cell is ever named twice in a cascade and a firing whose area was already emptied is still a legal step with no cells. `applySteps` re-derives every firing's geometry from its own fields, which is why `radius` and `orientation` are on the step.
4. A special included in a match fires, and it is read while it is still standing there: the clear removes it, and the special that match creates often lands on the same cell. A special created by a cascade can be caught by that cascade's own wave.
5. A blast takes yarn balls including knotted ones, takes and fires the specials and frogs it covers, and skips beads. A rip takes every ball of its colour, knotted ones included, plus the frog that fired it. A piece leaves the board through exactly one step.
6. Tangles, moths and stitch squares are phase 4: the `damage` hook now also receives each blast's full area, because a blocker inside a ring holds no piece and can be found no other way.
7. The meter charges per wave: the specials it consumed, plus 2 once when two or more *charging* specials fire together. The Hook fires but never charges, and a rip never charges. One `meter` step per cascade in which the charge moved.
8. At ten or more the meter drops one piece per move, onto a cell holding a plain yarn ball, and resets to zero. The frog replaces that ball; the Hook rides it and keeps its colour, so a drop can never complete a match. With no plain ball to replace, nothing drops and the charge waits.
9. "The most common colour" counts every yarn ball, ties broken by palette order, read at the instant the frog is set off. No random draw: the only new one in the phase is where the meter drops.
10. `game.tap(pos)` fires a special or the frog in place and spends a move; on anything else it costs nothing and returns no steps. Malformed coordinates throw, exactly like `swap`.
11. A combo centres on the cell the player swiped into; a lone special fires from the cell it landed on. A horizontal swap sweeps the Hook across rows, a vertical one down columns, and a double-tap or a chained Hook sweeps rows.
12. A board is dead only when the player truly cannot act: no match-making swap, no swap that fires, and nothing to tap. A board with a special on it is never shuffled away. `game.validMoves()` still means match-making swaps and takes the same options as `listValidMoves`.
13. On screen a firing is one window (§16's duration for its size): the special swells, then the balls pop one ring at a time outward from it, the furthest landing as the window closes, and the whole board shakes harder for a bigger blast. A firing with no cells shows nothing and costs no time. The meter is a readout outside the board and costs the move no time at all.
14. A ball carrying a special is that ball wearing the special's overlay, composed into one svg root per appearance: the ball, then the special over its centre, then the knot low on it so a knotted special still shows both. The Yarn Bomb is the exception and replaces the ball rather than riding it (owner, 2026-09-12), which is why its yarn colour is not readable in play. The frog is drawn rather than marked, and the meter is the §11 dial under the goals panel, not a row of pips under the board — the pips could never show a full meter anyway, for the reason the art conventions below give.

**Level conventions (phase 4, decided 2026-09-11).** How the engine turns §5 and §6 into steps,
and how the step player shows them. Same rule as the lists above: easy to change, not re-opened
without the owner.

1. Damage is per event, not per cell: a tangle or a moth loses one layer per *match* whose cells
   touch it and one per *blast* whose area covers or touches it, so a match lying along two sides
   of a tangle still strips one layer and two separate matches strip two. A frog rip has no area
   and damages neither. A stitch square loses a layer when the piece standing on it leaves
   through a clear, a blast or a rip — not when a moth eats it, and not under a meter drop or an
   exiting bead.
2. A knot is credited, not stored: the knotted ball leaves through the step that takes it, and
   its `blocker` step changes nothing on the board. A special the same cascade created may
   already be standing on that cell.
3. One `blocker` step per layer, emitted after the `meter` and before the `fall`, row-major, then
   by kind (tangle, moth, knot, stitch), then by layers remaining. A tangle's last layer takes
   its buried button with it and says so with `buried: true`; a cell can never carry `buried`
   without a tangle.
4. A moth multiplies rather than crawls: at the end of any move that cleared no moth, one moth
   with a plain yarn ball beside it eats it and a new moth takes that cell, the old one staying
   put. Specials, knots, beads and the frog are safe. Two draws, or none at all.
5. A bead is due every `beads.spawnEvery` moves until the level's `total` is accounted for. It
   arrives in the first refill of that move, at one of the run tops about to be filled (one
   draw, no colour draw for that cell); a due move that never refills keeps the bead owed. Beads
   leave at the top of a cascade, before its clear, so the column above falls in the same breath.
6. A goal's progress is live for `stitch` and `clear` — what is left is what the board still
   shows, so a multiplying moth can push a clear goal back above its total — and counted for
   `collect`, `beads` and `buried`, clamped at zero. A level with no goals is never won.
7. End of a move: the meter drop, then the moth spread, then won (Yarn Over, and the moves left
   go to zero) / out of moves (lost) / otherwise the dead-board shuffle. A board no shuffle can
   make playable ends the level lost with no `shuffle` step, and the shuffle puts the board back
   as it found it first, so the stream still rebuilds it exactly.
8. Yarn Over places every special at once — one per unused move, a Puff or a Bobble riding a
   plain ball — and then fires them one after another, found by piece identity rather than by
   the cell they were placed on, because an earlier chain may have moved or taken one. Its coins
   are coins, never score.
9. The draw order per spent move is fixed: the refill's colours (with the scheduled bead's
   spawner drawn once), the meter drop, the moth spread, then Yarn Over. A level with no moths,
   no tangles and no beads plays exactly as it did in phase 3 until its first win.
10. Levels reach the app only through `@hooked/levels`: a hand-maintained registry of static
    JSON imports (Metro cannot read a filesystem), `listLevels()` for the play sequence,
    `listDevLevels()` for the boards under `levels/dev/`, and `loadLevel(id)`, which validates.
    The five-to-six colour range and every goal-versus-board cross-check live there, not in the
    engine, which still accepts a two-colour test board.
11. The view model carries the cell layer (tangle, moth, stitch, buried) and the drift check
    compares it, so a tangle drawn with a layer it has lost is caught like a misplaced piece.
    Cell tracks are sampled from the same move clock as the pieces, and the cells draw *under*
    them, with no elevation or z-index anywhere on the board.
12. A run of `blocker` steps is one 150 ms window, not one each: a cascade that strips four
    tangles is one event on screen. A knot step costs no time at all, and beads leaving together
    share one window.
13. The readout updates twice per move: the move counter the moment a swipe is accepted (as in
    Fishdom), the goals when the board settles. The end of the level is read from the engine's
    own status, so it reports exactly once however the animation went, and a gesture buffered
    during the last move is dropped with it.
14. Result is a transparent modal over the board it finished, reached through `nav.js`: *Fastened
    off!* with the score and the coins, or *Ran out of yarn.* The Continue prompt of §6 waits for
    lives and stitch markers in phase 6.

**Art conventions (phase 5, decided 2026-09-12).** How `apps/mobile/src/art` draws what §12 and
§16 asked for, and what the board does with it. Same rule as the lists above: easy to change, not
re-opened without the owner.

1. `src/art` is split three ways, and node is what forces the split. `pieces.js` is every board
   svg as a string factory and `compose.js` glues those strings into the pictures the board
   actually shows; both are plain string work, so the rules that matter — what overlays what, in
   what order, on which viewBox — are tested against the markup itself under `node --test`.
   `sprites.js` imports `react-native-svg`, which plain node cannot load at all: importing it
   reaches `react-native` itself, whose Flow-typed source node will not parse, so both
   `require` and `import` throw `SyntaxError: Unexpected token 'typeof'`. So `sprites.js` has no
   node test and can have none, and what is left in it is nothing but parse-and-remember. Merging
   it back into `compose.js` would be tidier and would silently delete `compose.test.js`'s reach.
2. Every distinct picture is parsed once and the same AST is handed to everyone drawing it.
   `SvgXml` re-parses its string inside every mounted instance — one parse per cell, on the JS
   thread, every time a board mounts — so the board uses `parse()` at module load or on first ask,
   plus `SvgAst`. Sharing is safe because a parsed AST is a read-only descriptor: `SvgAst` spreads
   its props onto one `<Svg>` and renders its children, and nothing mounts state into the tree or
   writes back to it.
3. One piece is one svg root, not a stack of them. The ball, the special over its centre and the
   knot over both are composed into a single document per appearance — 72 of them, six colours ×
   six specials × knotted or not — because a cell that mounts three roots pays for three of
   everything. The composition is safe only because no factory declares an element id any other
   declares, which `pieces.test.js` holds across all 50 distinct documents the art can draw; a
   shared gradient id would repaint one piece with another's fill.
4. The board's floor is one tile sheet, not one View per cell: `tileSheetXml` lays a translated
   tile at every open cell on a grid-sized viewBox, so a 9×9 draws one svg where the hairline grid
   drew 81 Views. The sheet is memoised on the identity of the `open` grid, which `cloneModel`
   carries from move to move because holes are fixed for the level, so only a shuffle or a rebuild
   from the engine ever parses one and never a move.
5. A cell mounts only the tiles it can actually use. A cell swaps pictures mid-move (three layers
   of tangle down to two, unstitched to stitched) and that swap has to land on the UI thread
   without waiting for a React commit, so every tile a cell might show is mounted at once and
   cross-faded by opacity — which makes the mount count the thing to watch, since everything
   `Cell.jsx` can draw on every cell of a 9×9 is eight roots × 81. So: no stitch square outside
   the level's pattern, no more tangle densities than the cell has layers, and no moth or button
   unless this cell has one. The numeral on a tangle is gone (owner): the three drawn densities
   carry the layer count, because a number on a blocker is a label and not a picture.
6. A Track gained a fifth animated property, `pose`, beside x, y, scale and opacity, with `POSE =
   { rest, hop, tongue }` in `timings.js`. A pose names a drawing rather than a distance, so every
   set is instant and none of them blend; the frog's three pictures are stacked and the sampled
   pose decides which one is opaque, which is what lets the switch happen on the UI thread
   mid-move. A pose landing at clock 0 is written into `initial` rather than pushed as a segment,
   because `sampleTrack(track, 0)` agreeing with `track.initial` is the start-of-move invariant
   `oracle.test.js` holds every move of every board to.
7. The pose belongs to the piece, not to the step. A frog firing its own rip flicks its tongue
   out; a frog the meter drops hops off the dial and settles as it lands; a frog caught in someone
   else's blast does neither, because the blast removes it and the rip that blast seeds excludes
   its cell. Reading it off the step instead would put a tongue on a frog that was simply standing
   there.
8. The meter is a move readout, not a state read. The engine resets the charge inside the same
   `swap()`/`tap()` call that fills it (`packages/engine/src/game.js`), so
   `game.state().meter.charge` is already 0 by the time the HUD reads it and a full meter is
   visible nowhere in the engine's state — which is why the old pip row could never show one.
   `buildMove` returns `meterFrames` (`{ at, charge, full }`, one per `meter` step plus the zero
   frame the drop leaves behind) and the dial samples them against the board's clock like every
   other animation. Between moves the engine is still the truth, and a board rebuilt from it takes
   the dial with it.
9. The charge is clamped where it is drawn, not where it is counted. The engine legitimately
   reports 11 on a full of 10, because nothing caps `addCharge`, so `arcFor` rounds and clamps to
   a whole notch before it asks for a picture, and `arcXml` clamps again as it draws one — which
   also bounds the arc cache at eleven pictures for a full meter, however often the readout is
   asked. An arc at charge 0 draws nothing at all rather than a zero-length dash, whose round cap
   would paint a dot at twelve o'clock.
10. The dial is not on the board. `PlayScreen` owns the left column and draws `<Meter>` under the
    goals panel per §11; `Board` publishes the dial's props once through `onMeter` — which meter
    the level runs on, and the shared value it writes the charge into — and the screen adds the
    one thing only the measured column knows, the size. That size is the measured column less what
    the panel above it needs, held to 56–100 pt (owner), so a four-goal level shrinks the dial
    rather than pushing the move counter off the screen, which is the one thing the owner asked
    never to happen.
11. One rounded font (§16), loaded at runtime. `useFonts` from `expo-font` in `App.jsx`, the four
    Fredoka faces from `@expo-google-fonts/fredoka`, and the splash held until loaded-or-error —
    a font that fails to download must not strand a player on a splash screen, and the system
    font is ugly and playable. Runtime rather than the `expo-font` config plugin because the
    plugin copies the .ttf files into the native projects: a new dev-client build, a moved
    fingerprint runtime version and every OTA channel orphaned, and it does not work in Expo Go,
    which is where the game is played today.
12. Every `Text` names a `fontFamily` from `src/art/type.js` and never a `fontWeight`. React
    Native has no synthetic bolding for a custom family: on Android a weight no loaded face
    matches does not embolden Fredoka, it silently falls back to the system font, so a "bold"
    label renders in the wrong typeface entirely — and it renders correctly on iOS, which is how
    the bug ships. The weight is baked into the family name instead.
13. The six hexes are authored, not sampled (owner): `palette.js` is the delivery, not a stand-in
    for one. They are luminance-tuned so no two yarns merge in greyscale — spread 58 / 100 / 124 /
    150 / 176 / 202 with the hue families preserved, the tightest step rust to olive at 23.79 —
    and `assertGreyscaleSpread()` guards that spread, so a later colour tweak cannot quietly cost
    board readability. Changing a hex means re-running that guard.
14. Still outstanding in phase 5, with nothing built so far depending on them: the drawn blast
    rings, the clear particles, the confetti and the coin pile, the sounds, the haptics, the
    ~5 s idle hint, and the Reduce Motion feature (convention 16 fixed the defect, not the
    feature). Slice 1 took three things off this list on 2026-09-13 — the coaster illustration
    and `coin()`, both of which the win screen now draws, and the level card, which is convention
    15 — but not the level list on Home, which is still the phase-0 row of buttons until the
    Room replaces that screen in phase 6. Some of the art is drawn and still not on a phone: no
    level carries a 3-layer tangle or a knot, Book 1 level 1 included, so `tangle(3)` and
    `knot()` cannot be seen until `docs/LEVELS-BOOK1.md` reaches its tangles at level 4 and its
    knots at level 8.
15. The level card is a cover over a mount, not a screen — which is why it is a step inside
    `PlayScreen` rather than the modal route §11 specified (owner, 2026-09-13). Opening a 9×9
    costs a measured 1845 ms on the minimum spec (§16 source 1), and no route can cover that:
    the screen measures the arena on one commit and mounts `<Board>` on the next, so the
    expensive commit lands after `onLayout` returns, whatever screen was on top while it waited.
    What covers it is the deferral. `PlayScreen` paints the card, measures the arena, and only
    then schedules a double `requestAnimationFrame` before setting the flag that lets the board
    mount — double because a `requestAnimationFrame` callback runs *before* the frame it was
    scheduled for is drawn, so a single one would still land the stall on the card's first
    frame. It is the standard "let it paint first" idiom and a heuristic, not a proof that the
    frame reached the glass. `Board` reports back through a new `onReady` prop, fired from an
    `onLayout` on its root — the commit that carries the Cells and the Pieces — and not from
    `onState`, which is a passive effect and runs when React commits, which is the *start* of
    native mounting. Play is drawn from the first frame and inert until that signal: during the
    mount the JS thread could not answer a press anyway, and a live-looking button that takes a
    press and drops it reads as broken. Back is live from frame one, so a wrong level is never a
    wait, and a 4000 ms timer flips ready regardless, so a signal that never arrives degrades to
    a wait and never to a trapped player.
16. Every `withTiming` and `withRepeat` in the app settles its `reduceMotion` on purpose, and
    what decides it is what the animation is *for*. Reanimated finishes a reduced animation on
    its first frame — it sets the value to its end and reports done — so anything that is a
    clock or a readout rather than movement has to name `reduceMotion: ReduceMotion.Never` or it
    stops being one: with the OS toggle on, the board's move clock landed on its last instant
    and ran `finishMove` before a piece had drawn, while the shuffle's wall-clock timers ran on
    to their own schedule (a live defect, found and fixed 2026-09-13). Named `Never`: the move
    clock, the two shuffle fades, the dial's arc cross-fade, and the frog's blink — the blink
    on the *repeat*, because a reduced `withRepeat` stops after one repetition and a reduced
    `withDelay` drops its delay, which is a frog that shuts its eyes once at mount and never
    opens them. Left at the system default, deliberately and each with a comment saying why: the
    frog's wiggle, the level card's fade-out and the win screen's reveal, which are decoration
    and lose nothing but the motion. The convention is the greppable part; the feature —
    suppressing the fall's overshoot, the blast shake and the particles — is still to build.
17. A project has an illustration, and exactly one file says which projects have one. Every level
    JSON already carried a `project` key (§10); slice 1 gave it meaning. `projects.js` reads the
    key off a level (`projectKeyOf`, pure, so node tests it) and `illustrations.js` files that key
    against two PNG `require()`s — `{ empty, done }`, with Metro picking the 1×/2×/3× density.
    They are two files for the reason `compose.js` and `sprites.js` are: a `require()` of a PNG
    cannot run under `node --test` at all — `require` is not defined in an ES module scope — so a
    test that imported `illustrations.js` would fail on that import instead of reaching the art,
    and take the rest of that file's tests down with it. `projects.test.js` reaches the Metro half
    by reading that source as text instead, parsing every `require()` path and every project key
    out of it. The list of keys therefore lives in `illustrations.js` and nowhere else — a mirror
    of it would be testable, would pass, and would still let a caller be told a project has art
    while `illustrationFor` came back null, on a screen whose only way out is Home. A project with
    no art is the documented answer rather than a fault: `illustrationFor` returns null and
    nothing is drawn, no placeholder box, which today is all five development boards and the
    fourteen Book 1 projects phase 6 draws. The level card draws `empty` beside the goals, and the
    win screen fades `done` in on a win and shows `empty` on a loss at **full** opacity — always
    on cream and never over the result screen's dark scrim, because the delivered PNGs carry a
    low-alpha cream wash at their border that haloes on anything dark. The line drawing is already
    a ghost: measured over its own ink on that cream card it is 20.8 grey values off the cream on
    average and 49.9 at its darkest pixel, so the 0.55 that "unfinished" suggests leaves 11.5,
    which is not a fainter picture but no picture. Nothing on that screen mentions the room
    (owner, 2026-09-13): it does not exist until phase 6, and promising a shelf the player cannot
    visit is worse than saying what the level paid.

**Build order.** Each phase has a "done when" so you know when to move on.

1. **Engine, no screen.** `packages/engine` as a pure JS package with Jest tests: board generation with no starting matches, match detection, swap legality, gravity and refill, cascades, scoring. Plus a small node script that plays random moves and prints the board as text. *Done when the tests pass and a text board plays itself in the terminal.* *(Built 2026-09-11: `npm run play -- packages/engine/fixtures/coaster-5x5.json`.)*
2. **Bare board on your phone.** `apps/mobile` (Expo). Placeholder pieces (colored circles in the six palette colors), swipe to swap, the step player animating clears, falls and spawns. No backgrounds, no HUD. *Done when you can play on your own phone and it feels smooth.* *(Built 2026-09-11: Home → Play on the sandbox board; `npm run test:mobile`.)*
3. **Specials and the meter.** Puff, Bobble, Popcorn, Yarn Bomb, the frog meter and the Hook, firing by swap, double-tap and chain, each with a big visible blast. The rules in §4 were settled by decision on 2026-09-10; no Fishdom session is needed. *Done when every row of the table in §4 works and reads clearly.* *(Built 2026-09-11.)*
4. **Level rules.** JSON loader, the five goal types, the three blockers, the goals bar, move counter, win/lose, Yarn Over with coins. Three hand-written test levels. *Done when you can load a level file, win it, lose it, and watch stitch squares fill in.* *(Built 2026-09-11: Home lists the development boards; `npm run play -- packages/levels/levels/dev/moths-7x7.json`.)*
5. **Vertical slice: finish level 1 completely.** Art enters here. Real SVG yarn balls and specials in her palette, the level card, HUD, win screen with the project illustration, sounds, haptics. *Done when you'd hand her the phone with only this level on it.* *(In progress 2026-09-13. Level 1 exists: `packages/levels/levels/book1/001.json`, so `listLevels()` is no longer empty and a production build has a Play button. The board itself is drawn — the pieces, the specials, the blockers, the stitch squares, the goal icons, the meter's dial and the game's font — and measured on a device, §16 source 1. The level card is in, as a step inside `PlayScreen` that covers the board's mount, and the win screen shows the coaster the level made beside the coins it paid. What is left of this phase: the drawn blast rings, the clear particles, the confetti and the coin pile, the sounds, the haptics, the ~5 s idle hint, and the Reduce Motion feature — 2026-09-13 fixed that defect, not that feature.)*
6. **Book 1 and the Craft Nook end to end.** The room as home screen, the shop, placing and moving decor, beauty stars, three creatures with idle animations, projects placing themselves, save/load, lives, boosters, win streak, daily basket, Pattern Book. Author levels 1–15 per `docs/LEVELS-BOOK1.md` ("Twelve Coasters" as the finale) and tune them with bot sims. *Done when Book 1 plays start to finish, the Nook reaches 3 stars, and everything survives an app restart.*
7. **Backend, wallet, grants and purchases.** `apps/api` (Express + MongoDB on Heroku, mirroring canvass-app), accounts, the wallet ledger with offline caching, grants, codes, the VIP flag, the admin page, Redeem Code and Delete Account in Settings, RevenueCat with marker packs, the Starter Bundle and the Yarn Bank (sandbox only), the gift popup. *Done when you can grant yourself 50 markers from the admin page and watch them arrive on your phone, redeem a code, buy a pack in sandbox, and see every event in the ledger.*
8. **Art and content pass.** Rooms 2–3, decor sets, more creatures, project illustrations (one style phrase, §16), books 2–3. *Done when 45 levels and 3 rooms have their art.*
9. **Release.** Performance check on an iPad, the tribute touches (§13), privacy policy, age rating and IAP setup in App Store Connect and Play Console, store listing text and screenshots, TestFlight and an internal Play track, then submission. *Done when the app is approved on both stores.* She has been on the phase 6 TestFlight build since before phase 7; phase 9's staging build reaches her through the same channel with her VIP flag on.

**Why art is last.** Art made before the mechanics exist gets remade: cell size, where the board sits on a phone versus an iPad, and the HUD layout all shift while the game is being found. Placeholder art first ("greyboxing") is standard practice. The two exceptions worth doing early are the palette (done) and a style test for generated illustrations: three test images with one style phrase until they look like a set.

**Telemetry.** Log every attempt locally: level id, won or lost, moves left, score, date. It costs an afternoon and it's how you'll know whether "level 12 is impossible" is true.

**Shipping.** The Apple Developer Program ($99/year) and a Google Play Console account ($25 once) are needed for TestFlight, the stores and IAP; enroll early, approval can take days. Expo's EAS Build produces the iOS build in the cloud, so you don't need a Mac. Purchases in TestFlight and internal Play tracks run in the sandbox and never charge anyone, which is how testers exercise the shop. Before the listing, run a trademark and store search on the name: "Hooked" is already a well-known app name, so the store name may need a variant. After the first build is on her phone, JavaScript and asset changes (new pattern books, tuning, decor, illustrations) ship with `eas update` on the production channel without a new build; only native dependency changes need a new TestFlight build. That's how future pattern books arrive as gifts.

**Money and accounts (decided 2026-09-10).** Revenue goes to the owner personally (decided 2026-09-10); the arrangement with her is the owner's to handle and is not tracked here. The Apple Developer team and the Google Play account that ship canvass-app are both reused (decided 2026-09-10). Hooked gets its own App Store Connect record, Play app, EAS project and credentials. The Apple paid-apps agreement and a Play merchant profile must be active before phase 7's sandbox purchases. The full product set ships in v1 (six marker packs, the Starter Bundle, the Yarn Bank); prices are set in the stores and RevenueCat. The privacy policy, terms and delete-account pages are committed static HTML served by the API, as canvass-app does; the privacy URL is needed before any *external* TestFlight build, so her phase 6 build goes out to TestFlight's internal testers (no Beta App Review, no URL needed) and the pages are live on the API before phase 9's external build; phases 7 and 9 follow in order. Age rating 4+ / Everyone, the same as Fishdom, with a declared target audience of 13+, not Made for Kids (decided 2026-09-10).

**Store name (decided 2026-09-10): Yarn Over.** "Hooked" stays the codename, the repo and the EAS slug; `expo.name` and the label under the icon are "Yarn Over", and the listing title can carry a tagline ("Yarn Over: Crochet Match"). Confirm availability the day the App Store Connect record is created and run a trademark search then; if either fails, the fallbacks are Fastened Off, Yarn Nook and Puff Stitch (`docs/QUESTIONS.md` item 22). The end-of-level bonus keeps its name (§6), so the title flashes at every win.

**Difficulty tuning with bots.** Because the engine is pure, you can run 1,000 simulated attempts of a level with a simple greedy bot (pick the move that clears the most goal cells, prefer bigger matches) and a random bot. Target pass rates roughly: easy 60–80%, medium 35–50%, hard 15–25% for the greedy bot. Tune moves, color count and blocker density until the numbers land. She is far better than a greedy bot, so err on the tight side.

**Working with Claude Code**

- Put this spec in the repo as `docs/DESIGN.md` and keep it current; it's the shared brief for every session.
- Add a `CLAUDE.md` at the repo root with the standing rules: plain JavaScript with JSDoc, no TypeScript; nothing in `packages/engine` imports React Native; every engine change ships with a Jest test; levels are JSON in `packages/levels`; art sources per §16.
- For the setup phase, launch with `claude --add-dir ~/Desktop/canvass-app` so it can read the reference repo.
- One phase at a time. Open each with "read docs/DESIGN.md, plan phase N, then write the tests before the code," and review the plan before it writes anything.
- When a level feels wrong, ask it to run the bot sim on that level before changing anything.

**Verified in Fishdom (levels 1–18, September 2026)**

- Landscape layout as described under Rendering; Lightning meter bottom-left under the goals panel, charged by exploding power-ups.
- Level card: title "Level N", goal icons with counts, three booster slots ("Unlocked at level 8"), Play. Boosters are asked about from level 2 even when you have none.
- Win screen: coin pile with the amount, a New decor unlock, Continue. Continue prompt: +5 moves for 9 diamonds. 5 lives, with timed unlimited-lives rewards shown as ∞ and a countdown.
- "The more pieces in a match, the stronger the power-up": size-based specials confirmed.
- Goals seen: tiles under pieces (our Stitch), crates in 1–2 layers cleared by adjacent matches (our Tangle), ice-locked pieces (our Knot), earth with gold collected by adjacent matches (our Buried), chests, ice columns spanning rows (v2).
- Feeding fish yields diamonds; the sponge cleans the tank; decor shows a coin price and +beauty; aquariums are themes with a 3-star rating.
- The "collect resources / fill orders" screenshots are skippable mini-games between levels, not the core loop. v2 at most.

**Still to verify** (all settled by decision on 2026-09-10, see §3–§6 and §8; kept for the record)

- Exact blast shapes per power-up (plus vs rounded square vs full square).
- Meter charge rate, and whether it carries over between levels.
- Lightning + power-up, and two power-ups swapped together.
- Continue price escalation on repeated use.
- Anchor, Torpedo and Diving Gloves effects.
- Whether leftover moves pay coins, power-ups, or both.

---

## 12. Art and audio direction

*(How the assets actually get made is in §16.)*

- **Mood:** a yarn shop on a rainy afternoon. Cream background, warm wood, soft shadows. Matte, never glossy: real yarn is fuzzy, and a plastic-looking ball would read as the wrong material.
- **Yarn balls (decided 2026-09-11):** **soft dimensional**, not flat — a warm side light, a shaded underside, a soft contact shadow where the ball meets the board, so it reads round and tactile at 34 pt. Two curved strands, and each color also gets a distinct strand pattern so pieces are readable by shape as well as color. The shading is drawn into the vector, so the pieces still recolor and scale from phone to iPad for free; a fully rendered look (modelled, lit and exported per color) was considered and turned down for costing the recolor and the scale without suiting wool.
- **Specials:** a Puff is a small fluffy bump on the ball; a Bobble is a bigger, rounder one; a Popcorn is a cluster; a Yarn Bomb is a ball wrapped in a wild rainbow of strands with a fuse of yarn (as delivered in phase 5 it **replaces** the ball rather than riding it, so the yarn's own colour is not readable in play — owner, 2026-09-12). Each should read as "bigger than the last" at a glance. The Frog is a small green amigurumi frog that blinks; the Hook is a wooden crochet hook.
- **Creatures:** amigurumi style, visible stitch texture, safety-eye dots. Two or three idle animations each (blink, sway, hop).
- **Rooms:** soft illustrated interiors with clear placement spots; furniture as separate layered sprites so the room can be rearranged.
- **Project illustrations:** simple line drawings that fill in stitch by stitch as the goal progresses (the coaster delivered in phase 5 is two states instead — empty and finished — and the fill is not built: the pair is the same drawing on the same crop, so neither can be revealed a stitch at a time; §11's art convention 17). The win screen and the Pattern Book show the illustration; her photos are references for the artist and are never shown.
- **Sound:** soft yarn "thup" on match, a growing "poof" for each blast size, a quiet ribbit when the frog lands, a snip for scissors, a warm chime for *Fastened off!*, a little coin jingle. Haptics on matches and blasts.

---

## 13. Tribute touches (public-safe)

- Her real projects as levels, drawn as illustrations. Her photos are references for the artist only (`docs/reference/photos/`) and never ship in the app.
- Her yarn palette: six colors in the hue families of the reference photos, with invented display names (§15, `docs/design/BRIEF.md`).
- Credits: "For Faith, who is at level 7000." (owner-approved 2026-09-10). Her first name appears here and in the hidden level's note, nowhere else; never her surname, never her photos.
- A guide character in the spirit of Fishdom's Tina the Turtle: **Skein the Sheep**, an amigurumi sheep who explains new mechanics, delivers gift popups and comments on the room.
- Her account carries the VIP flag and the profile title **Level 7000 Legend**.
- Tap the frog on the meter seven times → a hidden level (`id` 7000, `book` 0) with a short note at the end: "Fastened off. For Faith, who is at level 7000. Thank you for every stitch." (wording adjustable). Players finding it is part of the charm.
- New pattern books arrive as seasonal drops, for everyone; nothing in the release calendar is tied to her.

---

## 14. Later / v2 ideas

- Teams and tournaments, Fishdom-style, with life exchange and a Team Chest.
- Rewarded ads as an optional extra life or booster (decide after launch data).
- Skippable mini-games between levels, Fishdom-style (a wind-the-yarn or catch-the-runaway-ball toy). Not core; she skips them in Fishdom too.
- Pattern Cards, Fishdom's vouchers: a second currency from levels and events, spent on rare decor.
- Tangle bars spanning several cells (Fishdom's ice columns).
- Super Frog (rips two colors), Fishdom's Super Lightning.
- Diagonal slide around holes, conveyors, portals.
- Fishdom-style events: short story "expeditions" with their own level sets, and card collections earned by beating levels.
- The team of two with a Team Chest and a weekly "Yarn Bomb" tournament against you.
- Seasonal pattern books and room themes (Winter Holidays, Spring).
- No manipulative notifications. One gentle daily "your yarn basket is ready" at most, and she can turn it off.

---

## 15. Her work, mapped to levels

From the photos and video shared in September 2026:

| What she made | What it tells us | In the game |
|---|---|---|
| Big granny-square blanket: chocolate-brown joins, squares in mustard, oat, blush, rust, lavender, taupe | She finishes large projects. This is the palette. | Book 2 finale, **"The Big Brown Blanket"**: full 9×9 Stitch level with 2-layer squares; its illustration is the reward, and it lands on the Living Room sofa |
| A set of twelve puff-stitch coasters (olive, butter, taupe, blush) with the yarn cakes beside them | Sets and repetition; the yarn cakes are the game pieces. | Book 1 finale, **"Twelve Coasters"**: stitch exactly 12 marked squares laid out in two rows of six. Earlier in the book, **"Puff Flower"**: a Collect level where one coaster fills in ring by ring. The coasters stack on the Nook's side table. The first of them is authored (2026-09-13): Book 1 level 1, **"Coaster (olive)"**, a 5×5 round-ish Stitch board carrying the project key `coaster_olive`, and it is so far the only project with art — two PNG states, `empty` and `done`, that the win screen draws. The pair is the designer's first pass and ships as-is (owner); the re-cut is queued |
| Olive ribbed tote with two straps | Bags, texture, solid-color work | **"The Olive Tote"**: trapezoid board with two strap columns on top; collect 60 olive and the bag fills in row by row. Hangs on a wall hook in the Bedroom |
| Gray crochet butterfly with beaded tails, made as a tumbler charm; a bead organizer nearby | Accessories and charms with beads are a current thing | Butterfly-shaped board (four wings with a narrow body column down the middle); the ingredient piece is a **bead**, and the beads fall through the body to become the tails. Book 3 is **Bags, Butterflies & Charms** |
| Spiral wind spinner in yellow, pink and gray, filmed spinning on the balcony | Playful 3D pieces; she films her work | **"Twirly"**: tall narrow board, Collect in three colors; the finished spinner spins on the win screen and then on the Balcony |

**Palette** (the six keys are fixed in code; each color also gets an invented, crochet-flavoured display name for the Pattern Book, see `docs/design/BRIEF.md`; the hexes were **authored and delivered** in phase 5, not sampled — owner, 2026-09-12 — and live in `apps/mobile/src/art/palette.js`):

| Key | Color | Seen in |
|---|---|---|
| `olive` | olive green | tote, coasters, yarn cake |
| `mustard` | mustard yellow | blanket, spinner |
| `blush` | dusty pink | blanket, coasters, spinner |
| `rust` | terracotta | blanket |
| `lavender` | dusty lavender-blue | blanket |
| `cocoa` | chocolate brown | blanket joins, yarn cake |

The board background is warm cream (oat), so cream is not a piece color. Each color also gets its own strand pattern so pieces read at a glance, not just by hue. The photos were shot under warm indoor light and sample out near-neutral, so they set the hue family and the mood and nothing more; the six delivered hexes are luminance-tuned instead, spread far enough apart that no two yarns merge in greyscale, and `assertGreyscaleSpread()` in `palette.js` guards that spread so a later color tweak cannot quietly cost board readability.

Leave out the plush toys and the tumbler brand visible in the photos; they're other people's IP, and her work is the point.

---

## 16. Asset and animation pipeline

**How animation works in a game like this.** There are no video clips or pre-rendered animations. Every piece on the board is a small component sitting at an x/y position. When the engine returns a list of steps, a *step player* turns each one into a short animation by changing that position, scale or opacity with Reanimated. That is the entire animation system; everything else is polish on top.

Step → animation (starting values; tune by feel):

| Step | What moves | Duration |
|---|---|---|
| `swap` | both pieces slide to each other's cell; illegal swaps slide out and bounce back | 150 ms (2×120 ms if illegal) |
| `clear` | pieces scale to 0 and fade; 6–8 tiny yarn-fluff particles fly outward (the pieces are the drawn art from phase 5; the particles are still outstanding in it — slice 1 did not bring them) | 120 ms |
| `blast` puff | quick pop, a small plus-shaped puff of fluff | 150 ms |
| `blast` bobble / popcorn / yarn bomb | scale pulse, then a ring expands to the blast radius; pieces pop as the ring reaches them. Bigger radius, bigger ring, longer shake. From phase 3 the pulse, the outward pop wave and a board shake that grows with the size carry it; the drawn ring is still outstanding in phase 5 — slice 1 did not bring it either | 250 / 350 / 450 ms |
| `blast` hook | three streaks sweep along the rows or columns | 250 ms |
| `frogRip` | the frog flicks his tongue out — `POSE.tongue`, an instant swap between drawings rather than a tween — swells and goes with the rest; every ball of that color pops in a wave outward from him, the furthest as the window closes | 400 ms |
| `meter` | the dial's fill arc grows a notch: one drawing per notch, cross-faded, not an animated stroke. The frog on the dial blinks while he waits and wiggles for as long as the readout reads full — reachable only because the dial samples the move's `meterFrames` and not `state()`. It runs off the board's clock and costs the move no time | 150 ms |
| `meterDrop` | the frog hops off the dial onto its cell (`POSE.hop`) and settles back to rest as he lands; the hook simply arrives. The readout drops to zero in the same breath | 300 ms |
| `blocker` | tangle/moth shakes and loses a layer — the three drawn tangle densities cross-fade and there is no numeral (owner, phase 5) — and a stitch square flips to "stitched" with a scale pop; a knot's step is credit only and draws nothing (§11, phase-4 conventions 2 and 12) | 150 ms |
| `fall` | translateY to the new cell with a slight overshoot (ease-out-back; `FALL_OVERSHOOT` in the step player's `timings.js`) | 200 ms |
| `spawn` | new pieces fall in from above their run: the i-th of n starts n − i rows above the run's top, or on the hole cell above a run fed through one | 200 ms |
| `shuffle` | "Untangling…": the board fades out and fades back in at the snapshot's positions; a full rebuild from `board`, no per-piece movement | 400 ms |
| `mothSpread` | the moth leans into the ball beside it, which pops; a new moth grows in its place (they multiply, decided 2026-09-11) | 250 ms |
| `beadExit` | bead drops off the bottom edge and lands on the project illustration | 250 ms |
| `yarnOver` | specials fire one by one, coins fly to the counter, then confetti (Lottie) and the *Fastened off!* banner slides in | ~1.5 s |

**Libraries:** `react-native-reanimated` (movement), `react-native-gesture-handler` (swipes and taps), `react-native-svg` (vector pieces), `lottie-react-native` (confetti, sparkles, stars), `expo-haptics`, `expo-audio` (sound; `expo-av` no longer ships with the Expo SDK), `expo-image` (room backgrounds and large illustrations; **not installed**, and the win screen's two bundled PNGs use react-native's own `<Image>` instead — expo-image is a native module, so adding it moves the fingerprint runtime version `app.json` pins and `apps/mobile/scripts/ota-check.mjs` polices, orphaning every fielded binary from its OTA channel. That is a boundary worth crossing once, with phase 6's room), `expo-font` with `@expo-google-fonts/fredoka` (the UI font, loaded at runtime; §11's art conventions say why not the config plugin). `@shopify/react-native-skia` only if you want fancier particles later.

**Where the images come from.** Four sources; mix them.

1. **Vector art (SVG)** for everything on the board: the six yarn balls, the four special overlays, frog, hook, bead, button, tangle layers, knot, moth, stitched/unstitched tiles, UI icons. **The designer delivers these as production SVG** (decided 2026-09-11) and the build wires them in; the brief in `docs/design/BRIEF.md` is the work order. Scales perfectly from phone to iPad, recolors in one line, nothing to license. It covers v1's board completely. **Delivered 2026-09-12** (phase 5): `apps/mobile/src/art/pieces.js` is that delivery — every board svg as a string factory — with `palette.js`'s six authored hexes beside it; `compose.js` glues them into one document per appearance and `sprites.js` parses each composed string once (§11, "Art conventions"). If a 9×9 board of them ever costs frames on a real phone, the fix is exporting the same files to PNG at 1×/2×/3× and swapping the component — the step player hands the renderer plain numbers, so the renderer is replaceable without touching the game. **That fallback has not been needed, and here is exactly how far that has been established.** Three runs, all by the owner on 2026-09-12.

| | iPhone 17 Pro, dev | iPhone 17 Pro, `--no-dev --minify` | Moto G Play 2023, dev | Moto G Play 2023, release APK |
|---|---|---|---|---|
| at rest | 60/60 fps | 60/60 fps | 59/59 fps | — |
| lowest seen | 43 fps (frog rip) | 54 fps (frog rip) | JS to 0 (board open) | — |
| layout | 1.2 ms | 0.5 ms | 9.0 ms | — |
| RAM | 559 MB | 463 MB | 337 MB | — |
| board open | — | — | 6678 ms | **1845 ms** |

The 9×9 sandbox shows roughly 2,100 svg nodes in 81 roots, and the static board costs nothing anywhere: every device holds its refresh rate at rest, so the cost is all at mount and during the heaviest animation. The Moto G Play 2023 is a floor-of-market Android and is the minimum spec this game is measured against.

**Where the board-open cost actually goes**, measured on the Moto by instrumenting the phases and then swapping one variable at a time (a dev-build ladder, so read the ratios rather than the absolute numbers): with pieces drawn as svg, 6678 ms; with each piece a single plain `View` instead, 2988 ms; with the pieces drawing nothing at all but every hook still running, 2884 ms. So 81 native views cost 104 ms — nothing — and the ~2,100 svg nodes inside them cost 3690 ms, about 55%. The remaining 2884 ms is React and Reanimated mounting 162 memoised components with worklets, which no renderer change would touch. Everything else was ruled out by measurement rather than argument: `createGame` is 9 ms in release, `buildModel` 2 ms, and parsing all the svg strings totals about 174 ms of the stall.

**The decision that follows (2026-09-12).** The fallback stays unused. 1845 ms on the minimum spec is a loading problem rather than a rendering one, and the level card §11 already schedules covers it — a card over the mount turns a freeze into a transition, for art that was being built anyway. Revisit if Book 1's boards prove heavier than a sandbox 9×9, or if a level card does not land.

**The card landed (2026-09-13), and here is exactly what that showed.** It is built as a step inside `PlayScreen` rather than as a route, because only the screen that measures the arena can hold the board's mount back (§11, art convention 15). Measured by the owner on an iPhone 17 Pro, in Expo Go, on a **development** bundle, off `PlayScreen`'s two `__DEV__` logs — the mount, then the board's `onReady`:

| Board | Ready, under the card |
|---|---|
| Book 1 level 1, 5×5 | 172–298 ms |
| Sandbox 9×9 | 242–250 ms |
| Ring coaster, 7×7 | 269 ms |
| Charm tail, 7×7 | 206 ms |
| Moths in the stash, 7×7 | 210 ms |

Every board reports in well under a third of a second, and it reports from behind a frame that has already been painted rather than from on top of a frozen one. That is the deferral working. It is **not** a measurement of the 1845 ms the card exists to cover: that number is the Moto G Play 2023 in a release APK, and **the Moto has not been retested with the card**. The release-APK column above is still the last word on the minimum spec, and it still has no with-card reading in it.
2. **AI image generation** for illustrations: project art (pumpkin, cat, tote), room backgrounds, decor items, creatures. Any generator works; Canva's Magic Media plus its background remover covers both steps. Fix one style phrase and reuse it in every prompt so the set matches, e.g. *"flat vector illustration of a crocheted [thing], cozy, soft shadows, plain cream background, no text"*. Generate on a plain background, remove it, export PNG at 1×/2×/3× (e.g. 200/400/600 px). Expect a few regenerations per image to get a matching set. Creatures need 2–3 poses each for idle animation, so generate them as a set.
3. **Free packs** for the rest: Kenney.nl (CC0: UI, particles, audio), LottieFiles free animations (confetti, sparkles, star bursts; check each file's license), Google Fonts via `@expo-google-fonts` (rounded and friendly: Nunito, Fredoka, Baloo 2), Pixabay or Freesound for sound effects (check licenses; Kenney's audio packs are the safe default).
4. **Her real work** as reference only. The photos live in `docs/reference/photos/` (kept out of git) for the illustrator and the style sheet; nothing from them ships in the app. The Pattern Book and win screens use illustrations in the §12 style.

**v1 asset checklist**

- Board pieces (SVG): 6 yarn balls, Puff / Bobble / Popcorn / Yarn Bomb overlays, frog (meter, idle, hop), hook, bead, button, tangle ×3 layers, knot overlay, moth, unstitched ×2 layers, stitched tile, board background, meter frame. **Delivered 2026-09-12** in `apps/mobile/src/art/pieces.js`, with the Yarn Bomb replacing the ball rather than overlaying it (owner) and the frog carrying a blink and a tongue as well. `tangle(3)` and `knot()` are drawn but nothing shows them: no development level carries either, and neither does Book 1 level 1, so they stay unseen on a phone until `docs/LEVELS-BOOK1.md` reaches its tangles at level 4 and its knots at level 8.
- Effects: clear puff, blast rings, hook streaks, frog wave (all code); confetti and star pop (Lottie). The frog wave, the blast pulse and the board shake are built; the clear puff, the drawn rings, the hook streaks and the confetti are not, and slice 1 brought none of them. What slice 1 did do is release the commission: `docs/design/BRIEF.md` holds the confetti and the coin burst back until level 1's static art is in and moving on a phone, and as of 2026-09-13 it is, so they are the designer's next piece of work rather than something competing with it. `lottie-react-native` is not installed yet.
- UI (SVG or Kenney): buttons, panels, hearts for lives, coin, booster icons (scissors, lint roller, darning needle, loosen, two bobbles, frog ready, popcorn & frog), move counter, goals bar icons. The goals-bar icons are delivered (24×24, one per goal type and then per colour or blocker) and the level card draws them at their authored size beside the counts; the coin is drawn and, from 2026-09-13, the win screen puts it beside the coins figure — the static coin, not the coin burst. The rest wait on phase 6.
- Rooms and decor: 3 room backgrounds for v1, ~30 decor items in sets, 5–6 creatures with 2–3 poses each.
- Project illustrations: one per level (fifteen for Book 1, one per row of `docs/LEVELS-BOOK1.md`, whose foot fixes how their ids are spelled); simple SVGs may stand in for minor projects until phase 8. **One delivered:** `coaster_olive`, in the two states the level card and the win screen draw — `empty` and `done`, PNG at 1×/2×/3×, 200 pt square at 1× — filed in `apps/mobile/src/art/illustrations.js` under the `project` key Book 1 level 1 carries, and drawn from 2026-09-13. It ships as the designer's first pass (owner): the empty state is the finished piece desaturated rather than the line drawing the brief ordered, and the re-cut queued with the designer costs nothing to take, because it lands as the same six filenames.
- Audio: match, four blast sizes, frog land, frog rip, hook, fall, bead, stitch, coin, win jingle, lose, tap. None of it exists: there is no audio file of any kind in the repo and `expo-audio` is not installed.
- Economy UI: stitch marker icon, Continue panel with the +5 badge, marker shop with pack tiers, Starter Bundle card, Yarn Bank jar with fill states, life refill and unlimited-lives panels, gift popup, Redeem Code field.
- One rounded font. **Fredoka**, four weights, loaded at runtime from `@expo-google-fonts/fredoka`; `apps/mobile/src/art/type.js` is the only place a family name is written down.
