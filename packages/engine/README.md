# @hooked/engine

The match-3 engine as a pure JavaScript package: it takes a level and a seed, accepts a swap,
and returns animation steps plus the new state (docs/DESIGN.md §11). It imports nothing from
react, react-native, expo or Node (test/browser-safe.test.js enforces it), which is what lets
the mobile app and the web playground share it and lets bots play thousands of attempts in Node.

```bash
npm test -w packages/engine                                    # from the repo root
npm run play -- packages/engine/fixtures/coaster-5x5.json --seed 1
node packages/engine/scripts/play.js --help
```

## API (phase 4)

```js
import { createGame, applySteps } from '@hooked/engine';

const game = createGame(levelJson, seed);   // levelJson: a parsed DESIGN.md §10 object; seed: string or number
game.state();          // { board: { width, height, cells }, moves, score, coins, meter, goals, status, level }
                       // goals: [{ type, color?, count?, blocker?, sprite?, total, remaining }]
                       // status: 'playing' | 'won' | 'lost'; coins: the level's base plus Yarn Over's bonus
game.swap(a, b);       // { steps } — a, b are { x, y }, x = column, y = row, y = 0 at the top
game.validMoves();     // [[a, b], …] match-making swaps, each pair once, row-major
game.validMoves({ specials: true });  // and the swaps that only fire a special or the frog
game.tap(pos);         // { steps } — fires what is at pos, spending a move
applySteps(board, steps); // the step player's contract: rebuilds the next board from the stream
```

`game.tap(pos)` fires a special or the frog in place and spends a move; on anything else it
returns no steps and costs nothing. `useBooster` throws until phase 6. Same seed + same moves =
same boards and steps.

A goal's `remaining` is recounted from the board for `stitch` and `clear` (a spreading moth can
push a clear goal back above its `total`) and counted down for `collect`, `beads` and `buried`.
The level is **won** when it has goals and every one of them is at zero, and **lost** when the
moves run out with something left to do, or when the board has no move in it and no shuffle can
find one. A finished game answers every swap and tap with no steps.

## The step contract (what the step player consumes)

Steps come in playback order, never share objects with the board, and are complete: replaying
them onto the previous `state().board` with `applySteps` gives the next one exactly (the replay
test proves it for every fixture over hundreds of moves), and `applySteps` throws on a stream
that under-reports.

| Step | Fields | Notes |
|---|---|---|
| `swap` | `a`, `b`, `illegal` | `illegal` is always a boolean; an illegal swap is the only step of its move |
| `clear` | `cells: Pos[]`, `created: [{ pos, piece }]`, `cascade`, `points` | cascade is 1-based; created specials sit on cleared cells |
| `fall` | `moves: [{ from, to }]` | every moved piece once, straight down, final positions; apply as a batch (lift every `from`, then place every `to`); a special created by the same cascade's `clear` can be a `from` here |
| `spawn` | `cells: [{ pos, piece }]` | x then y; per run the contiguous empty prefix from the run's top, so the i-th (0-based) of n enters from row `top − (n − i)`, one row above the board for the last one. Where they enter from on screen is the step player's call |
| `blast` | `pos`, `special`, `radius`, `orientation`, `cells`, `cascade`, `points`, `combo` | a firing: it takes the pieces in `cells` itself. `radius` is null for a hook, `orientation` null for anything else, and both are load-bearing — they are what lets `applySteps` re-derive the area and prove the step neither under- nor over-reports |
| `frogRip` | `pos`, `color`, `cells`, `cascade`, `points`, `combo` | every ball of that colour plus the frog that fired it |
| `meter` | `charge`, `full` | the frog or hook meter moved; no board change |
| `meterDrop` | `pos`, `piece` | the meter's piece replaces the plain ball at `pos` |
| `blocker` | `pos`, `kind`, `layersLeft`, `points`, `buried?` | one step per layer lost: `tangle`, `moth`, `stitch` change the cell; `knot` is credit only (the knotted ball already left through the step that took it, and a created special may be standing there). `buried: true` rides the tangle's last layer and only that one |
| `mothSpread` | `from`, `to` | the moth at `from` stays and a new one eats the plain ball at `to` |
| `beadExit` | `pos`, `points` | a bead resting on an exit leaves; emitted at the top of a cascade, before its clear |
| `yarnOver` | `specials: [{ pos, piece }]`, `coins`, `moves` | the win bonus: it *places* a puff or bobble on each named ball, and the ordinary steps that follow are those specials firing |
| `shuffle` | `board` | same shape as `state().board`; rebuild every view from it |

Per move: `swap`, then per cascade `beadExit`s → `clear` → the firings it set off, breadth-first
→ `meter` → `blocker`s → `fall` → `spawn` (empty ones omitted), then `meterDrop`, `mothSpread`
and either `yarnOver` (with the steps its specials fire) or `shuffle`. A swap or tap that only
fires a special has no `clear` at all. The score is the sum of `points` over every step that
carries one; `yarnOver`'s coins are not score. All thirteen `STEP_TYPES` are live from phase 4,
and `applySteps` rejects anything else.

## Modules

| File | Responsibility |
|---|---|
| `src/constants.js` | fixed names, numbers, legends, typedefs, `ENGINE_VERSION` |
| `src/rng.js` | seeded RNG (FNV-1a → mulberry32): `next`, `int`, `pick`, `weighted`, `shuffle` |
| `src/board.js` | board accessors, floors, clones, `columnRuns` |
| `src/level.js` | `normalizeLevel` (essentials validation) and `buildBoard` |
| `src/generate.js` | fill (match-free by construction with three or more colors), presets, playability, `generateBoard`, `shuffleBoard` |
| `src/match.js` | runs, matches (L/T/plus grouped), `matchThrough`, `specialForSize`, `spawnCellFor` |
| `src/moves.js` | swap legality and `listValidMoves` |
| `src/gravity.js` | `applyGravity` and `refill` per vertical run |
| `src/score.js` | multiplier and points per clear |
| `src/blast.js`, `src/fire.js`, `src/meter.js` | blast geometry, the firing wave, the frog/hook meter |
| `src/damage.js` | what a cascade did to tangles, moths, knots and stitch squares |
| `src/goals.js` | goal totals, live counts, credits, `allGoalsMet` |
| `src/beads.js`, `src/moth.js`, `src/yarnover.js` | the bead schedule and exits, the spread, the win bonus |
| `src/resolve.js` | the cascade loop, bounded by `MAX_CASCADES` |
| `src/game.js` | `createGame` |
| `src/replay.js` | `applySteps` |
| `src/text.js` | lossless two-character text render, step descriptions |
| `src/cli.js`, `src/bots.js` | argument parsing, the random bot, `playGame` |
| `scripts/play.js` | the terminal playthrough (`node:` imports live only here and in `test/`) |

## Text render

Two characters per cell, content then modifier: `o. m. b. r. l. c.` the colors (olive, mustard,
blush, rust, lavender, cocoa), `oP oB oC oY oH` a ball carrying a puff / bobble / popcorn /
yarn bomb / hook, `oK` a knotted ball, `F.` frog, `*.` bead, `#1 #2 #3` tangle layers, `x2` a
buried tangle, `@.` moth, `..` hole, `__` empty. `renderStitch` prints the stitch grid. This is
deliberately not the level-file legend of DESIGN.md §10 (where `b` is a bead and `m` a moth).

## Fixtures

`fixtures/*.json` are engine test and CLI inputs, not shipped levels (shipped levels live in
`packages/levels`). Ids 9001–9011: `coaster-5x5` (level 1-alike), `square-6x6`, `square-7x7`,
`scarf-5x9`, `holes-split`, `blockers-mix`, `spawners-weights`, `dead-prone-5x5`, `hook-meter`,
`specials-holes`, `beads-stitch-5x7`. `blockers-mix` carries a moth, a buried tangle, two knots
and two beads; `beads-stitch-5x7` carries a bead schedule, restricted exits, two-layer stitches
and a knot a bead comes to rest on. The cells under a tangle drain and stay empty until it is
cleared, which is the rule, not a gap. `spawners-weights` leaves its lower runs unfed on purpose.
