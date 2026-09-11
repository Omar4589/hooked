# HOOKED — Game Design Spec (v0.9)

*Store name: **Yarn Over** (decided 2026-09-10). "Hooked" is the codename: the repo, the EAS slug, the bundle id.*

*A cozy match-3 where every level is a crochet project, and everything you make decorates your room. A tribute to one crocheter, built to ship to everyone.*

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
- **5–6 yarn colors** per level (fewer colors = easier and makes 6- and 7-matches possible). Palette from her work (§15): `olive`, `mustard`, `blush`, `rust`, `lavender`, `cocoa`.
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
| **Puff** | 4 in a match | clears the 4 orthogonally adjacent cells (a plus) | Firecracker |
| **Bobble** | 5 in a match | clears everything within a 2-cell radius | Bomb |
| **Popcorn** | 6 in a match | clears everything within a 3-cell radius | Dynamite |
| **Yarn Bomb** | 7+ in a match | clears everything within a 4-cell radius | Warhead |
| **The Frog** | the frog meter fills | hops onto a random open cell; swap it with any adjacent ball to rip out every ball of that color. Crocheters call undoing work "frogging" (rip it, rip it). **Decided:** the frog is its own colorless piece (`kind: 'frog'`), never a special on a ball; fired without a swap partner (double-tap, or caught in a blast) it rips the most common color on the board | Lightning |
| **The Hook** | replaces the frog meter on some levels | clears 3 rows or 3 columns through its cell; the swap direction picks the orientation, double-tap means rows | Energy Blast |

**Blast shape.** "Radius r" means every cell whose center lies within r cell-widths of the special's center: a rounded square (for r = 2, a 5×5 minus its corners). Puff is the exception and is a plus. **Decided (2026-09-10):** rounded squares stand, so on an open board a Bobble clears 21 cells, a Popcorn 45, a Yarn Bomb 77; a Puff is a plus of 5. A blast passes over holes; a tangle or moth inside its area loses one layer, a knotted ball inside it loses the knot and clears, a bead inside it is untouched. These are our rules; they only have to feel like Fishdom, not match it.

**The frog meter.** A small frog with a meter sits under the board. Every special that fires adds charge: Puff +1, Bobble +2, Popcorn +3, Yarn Bomb +4, and several firing in the same step add a +2 bonus. At 10 the frog hops onto a random open cell as a piece and the meter resets. **Decided:** these rates stand. The meter starts empty on every attempt (only the Frog Ready booster fills it); a full meter drops a frog even if one is already on the board; neither a frog rip nor the Hook charges it.

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
{ type: 'blast', pos, special, cells }       // a puff / bobble / popcorn / yarn bomb / hook firing
{ type: 'frogRip', pos, color, cells }       // the frog ripping out a color
{ type: 'meter', charge, full }              // frog (or hook) meter changed
{ type: 'meterDrop', pos, piece }            // the frog or hook lands on the board
{ type: 'blocker', pos, kind, layersLeft }   // kind: 'tangle' | 'knot' | 'moth' | 'stitch'
{ type: 'fall', moves }                      // moves: [{ from, to }]
{ type: 'spawn', cells }                     // cells: [{ pos, piece }]
{ type: 'mothSpread', from, to }
{ type: 'beadExit', pos }
{ type: 'shuffle', board }
{ type: 'yarnOver', specials, coins }
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

- Board: one absolutely-positioned `Animated.View` per piece, driven by Reanimated shared values. Play `steps` sequentially (timings in §16). A 9×9 grid of Views animates fine; Skia is not needed.
- Input: Gesture Handler pan → swipe direction → `game.swap`. Tap-tap on a special → `game.tap`.
- Screens: Room (home), Shop, Level card (goals + booster picker), Board + HUD with goals panel and meter, Continue prompt, Result (coins, New decor unlock), Yarn Bank, Pattern Book, Settings.
- Navigation: React Navigation native-stack (`@react-navigation/native-stack`), one navigator, the level card / Continue / Result as modal screens; every navigation call goes through `apps/mobile/src/nav.js` so the navigator can change in one file.
- Persistence: `expo-sqlite/kv-store` (synchronous, ships with the SDK, runs in Expo Go) behind one `apps/mobile/src/meta/storage.js` module for progress, coins, room layout, lives timestamp, boosters, streaks; MMKV stays a one-file swap if it is ever needed.
- **Landscape**, matching Fishdom (she already holds her phone that way for it); lock it in `app.json`. In-level layout, left to right: a goals panel (level number at the top, goal icons with remaining counts, the move counter at the bottom) with the frog meter as a round dial just below it; the board centered and as tall as the screen allows; a booster panel with four slots on the right, settings gear beneath it. The room is a wide scene with a top bar (avatar, lives with timer, coins, stitch markers, settings) and a bottom bar (Store button showing the room's beauty stars, shop, Pattern Book, and a big Play button with the level number at the far right). iPad uses the same layout with more air, stays landscape-locked (`requireFullScreen`), and since she may play on one it is phase 6 work, not phase 9. The board and HUD lay out against a measured arena view, never the window, so the lock can be dropped later without a layout rewrite.
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
9. Steps never share objects with the board, and `illegal` is always a boolean. The stream is complete and strict: `applySteps(board, steps)` (exported) rebuilds the engine's board exactly and throws on a stream that under-reports; the phone's step player is that function with animations. Spawns in one run are the contiguous empty prefix from the run's top, so the i-th of n enters from row top − (n − i).
10. More than 100 cascades in one move is an error (a level whose weights leave one color would otherwise loop forever).

**Build order.** Each phase has a "done when" so you know when to move on.

1. **Engine, no screen.** `packages/engine` as a pure JS package with Jest tests: board generation with no starting matches, match detection, swap legality, gravity and refill, cascades, scoring. Plus a small node script that plays random moves and prints the board as text. *Done when the tests pass and a text board plays itself in the terminal.* *(Built 2026-09-11: `npm run play -- packages/engine/fixtures/coaster-5x5.json`.)*
2. **Bare board on your phone.** `apps/mobile` (Expo). Placeholder pieces (colored circles in the six palette colors), swipe to swap, the step player animating clears, falls and spawns. No backgrounds, no HUD. *Done when you can play on your own phone and it feels smooth.*
3. **Specials and the meter.** Puff, Bobble, Popcorn, Yarn Bomb, the frog meter and the Hook, firing by swap, double-tap and chain, each with a big visible blast. The rules in §4 were settled by decision on 2026-09-10; no Fishdom session is needed. *Done when every row of the table in §4 works and reads clearly.*
4. **Level rules.** JSON loader, the five goal types, the three blockers, the goals bar, move counter, win/lose, Yarn Over with coins. Three hand-written test levels. *Done when you can load a level file, win it, lose it, and watch stitch squares fill in.*
5. **Vertical slice: finish level 1 completely.** Art enters here. Real SVG yarn balls and specials in her palette, the level card, HUD, win screen with the project illustration, sounds, haptics. *Done when you'd hand her the phone with only this level on it.*
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

- **Mood:** a yarn shop on a rainy afternoon. Cream background, warm wood, soft shadows. Nothing glossy.
- **Yarn balls:** flat circles with two curved strands; each color also gets a subtle distinct texture or strand pattern so pieces are readable by shape as well as color.
- **Specials:** a Puff is a small fluffy bump on the ball; a Bobble is a bigger, rounder one; a Popcorn is a cluster; a Yarn Bomb is a ball wrapped in a wild rainbow of strands with a fuse of yarn. Each should read as "bigger than the last" at a glance. The Frog is a small green amigurumi frog that blinks; the Hook is a wooden crochet hook.
- **Creatures:** amigurumi style, visible stitch texture, safety-eye dots. Two or three idle animations each (blink, sway, hop).
- **Rooms:** soft illustrated interiors with clear placement spots; furniture as separate layered sprites so the room can be rearranged.
- **Project illustrations:** simple line drawings that fill in stitch by stitch as the goal progresses. The win screen and the Pattern Book show the illustration; her photos are references for the artist and are never shown.
- **Sound:** soft yarn "thup" on match, a growing "poof" for each blast size, a quiet ribbit when the frog lands, a snip for scissors, a warm chime for *Fastened off!*, a little coin jingle. Haptics on matches and blasts.

---

## 13. Tribute touches (public-safe)

- Her real projects as levels, drawn as illustrations. Her photos are references for the artist only (`docs/reference/photos/`) and never ship in the app.
- Her yarn palette: six colors sampled from the reference photos, with invented display names (§15, `docs/design/BRIEF.md`).
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
| A set of twelve puff-stitch coasters (olive, butter, taupe, blush) with the yarn cakes beside them | Sets and repetition; the yarn cakes are the game pieces. | Book 1 finale, **"Twelve Coasters"**: stitch exactly 12 marked squares laid out in two rows of six. Earlier in the book, **"Puff Flower"**: a Collect level where one coaster fills in ring by ring. The coasters stack on the Nook's side table |
| Olive ribbed tote with two straps | Bags, texture, solid-color work | **"The Olive Tote"**: trapezoid board with two strap columns on top; collect 60 olive and the bag fills in row by row. Hangs on a wall hook in the Bedroom |
| Gray crochet butterfly with beaded tails, made as a tumbler charm; a bead organizer nearby | Accessories and charms with beads are a current thing | Butterfly-shaped board (four wings with a narrow body column down the middle); the ingredient piece is a **bead**, and the beads fall through the body to become the tails. Book 3 is **Bags, Butterflies & Charms** |
| Spiral wind spinner in yellow, pink and gray, filmed spinning on the balcony | Playful 3D pieces; she films her work | **"Twirly"**: tall narrow board, Collect in three colors; the finished spinner spins on the win screen and then on the Balcony |

**Palette** (the six keys are fixed in code; each color also gets an invented, crochet-flavoured display name for the Pattern Book, see `docs/design/BRIEF.md`; the final hexes are sampled from the reference photos in phase 5):

| Key | Color | Seen in |
|---|---|---|
| `olive` | olive green | tote, coasters, yarn cake |
| `mustard` | mustard yellow | blanket, spinner |
| `blush` | dusty pink | blanket, coasters, spinner |
| `rust` | terracotta | blanket |
| `lavender` | dusty lavender-blue | blanket |
| `cocoa` | chocolate brown | blanket joins, yarn cake |

The board background is warm cream (oat), so cream is not a piece color. Each color also gets its own strand pattern so pieces read at a glance, not just by hue.

Leave out the plush toys and the tumbler brand visible in the photos; they're other people's IP, and her work is the point.

---

## 16. Asset and animation pipeline

**How animation works in a game like this.** There are no video clips or pre-rendered animations. Every piece on the board is a small component sitting at an x/y position. When the engine returns a list of steps, a *step player* turns each one into a short animation by changing that position, scale or opacity with Reanimated. That is the entire animation system; everything else is polish on top.

Step → animation (starting values; tune by feel):

| Step | What moves | Duration |
|---|---|---|
| `swap` | both pieces slide to each other's cell; illegal swaps slide out and bounce back | 150 ms (2×120 ms if illegal) |
| `clear` | pieces scale to 0 and fade; 6–8 tiny yarn-fluff particles fly outward | 120 ms |
| `blast` puff | quick pop, a small plus-shaped puff of fluff | 150 ms |
| `blast` bobble / popcorn / yarn bomb | scale pulse, then a ring expands to the blast radius; pieces pop as the ring reaches them. Bigger radius, bigger ring, longer shake | 250 / 350 / 450 ms |
| `blast` hook | three streaks sweep along the rows or columns | 250 ms |
| `frogRip` | frog hops in place, tongue flick, every ball of that color pops in a wave outward from the frog | 400 ms |
| `meter` | the meter fills a notch; the frog wiggles when it's full | 150 ms |
| `meterDrop` | the frog (or hook) hops from the meter onto its cell | 300 ms |
| `blocker` | tangle/moth/knot shakes and loses a layer; a stitch square flips to "stitched" with a scale pop | 150 ms |
| `fall` | translateY to the new cell with a slight overshoot (`withSpring` or ease-out-back) | 200 ms |
| `spawn` | new pieces start one row above the board and fall in | 200 ms |
| `shuffle` | "Untangling…": the board fades out and fades back in at the snapshot's positions; a full rebuild from `board`, no per-piece movement | 400 ms |
| `mothSpread` | moth crawls to the neighbor cell | 250 ms |
| `beadExit` | bead drops off the bottom edge and lands on the project illustration | 250 ms |
| `yarnOver` | specials fire one by one, coins fly to the counter, then confetti (Lottie) and the *Fastened off!* banner slides in | ~1.5 s |

**Libraries:** `react-native-reanimated` (movement), `react-native-gesture-handler` (swipes and taps), `react-native-svg` (vector pieces), `lottie-react-native` (confetti, sparkles, stars), `expo-haptics`, `expo-audio` (sound; `expo-av` no longer ships with the Expo SDK), `expo-image` (illustrations and room backgrounds). `@shopify/react-native-skia` only if you want fancier particles later.

**Where the images come from.** Four sources; mix them.

1. **Code-drawn vector art (SVG)** for everything on the board: the six yarn balls, the four special overlays, frog, hook, bead, button, tangle layers, knot, moth, stitched/unstitched tiles, UI icons. Claude writes these as SVG components (here or in Claude Code). Consistent style, scales perfectly from phone to iPad, recolors in one line, nothing to license. Start here; it covers v1's board completely.
2. **AI image generation** for illustrations: project art (pumpkin, cat, tote), room backgrounds, decor items, creatures. Any generator works; Canva's Magic Media plus its background remover covers both steps. Fix one style phrase and reuse it in every prompt so the set matches, e.g. *"flat vector illustration of a crocheted [thing], cozy, soft shadows, plain cream background, no text"*. Generate on a plain background, remove it, export PNG at 1×/2×/3× (e.g. 200/400/600 px). Expect a few regenerations per image to get a matching set. Creatures need 2–3 poses each for idle animation, so generate them as a set.
3. **Free packs** for the rest: Kenney.nl (CC0: UI, particles, audio), LottieFiles free animations (confetti, sparkles, star bursts; check each file's license), Google Fonts via `@expo-google-fonts` (rounded and friendly: Nunito, Fredoka, Baloo 2), Pixabay or Freesound for sound effects (check licenses; Kenney's audio packs are the safe default).
4. **Her real work** as reference only. The photos live in `docs/reference/photos/` (kept out of git) for the illustrator and the style sheet; nothing from them ships in the app. The Pattern Book and win screens use illustrations in the §12 style.

**v1 asset checklist**

- Board pieces (SVG): 6 yarn balls, Puff / Bobble / Popcorn / Yarn Bomb overlays, frog (meter, idle, hop), hook, bead, button, tangle ×3 layers, knot overlay, moth, unstitched ×2 layers, stitched tile, board background, meter frame.
- Effects: clear puff, blast rings, hook streaks, frog wave (all code); confetti and star pop (Lottie).
- UI (SVG or Kenney): buttons, panels, hearts for lives, coin, booster icons (scissors, lint roller, darning needle, loosen, two bobbles, frog ready, popcorn & frog), move counter, goals bar icons.
- Rooms and decor: 3 room backgrounds for v1, ~30 decor items in sets, 5–6 creatures with 2–3 poses each.
- Project illustrations: one per level (fifteen for Book 1, ids in `docs/design/BRIEF.md`); simple SVGs may stand in for minor projects until phase 8.
- Audio: match, four blast sizes, frog land, frog rip, hook, fall, bead, stitch, coin, win jingle, lose, tap.
- Economy UI: stitch marker icon, Continue panel with the +5 badge, marker shop with pack tiers, Starter Bundle card, Yarn Bank jar with fill states, life refill and unlimited-lives panels, gift popup, Redeem Code field.
- One rounded font.
