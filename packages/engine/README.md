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

## API (phase 1)

```js
import { createGame, applySteps } from '@hooked/engine';

const game = createGame(levelJson, seed);   // levelJson: a parsed DESIGN.md §10 object; seed: string or number
game.state();          // { board: { width, height, cells }, moves, score, coins, meter, goals, status, level }
game.swap(a, b);       // { steps } — a, b are { x, y }, x = column, y = row, y = 0 at the top
game.validMoves();     // [[a, b], …] match-making swaps, each pair once, row-major
applySteps(board, steps); // the step player's contract: rebuilds the next board from the stream
```

`tap` and `useBooster` throw until phases 3 and 4. Same seed + same moves = same boards and steps.

## The step contract (what phase 2's step player consumes)

Steps come in playback order, never share objects with the board, and are complete: replaying
them onto the previous `state().board` with `applySteps` gives the next one exactly (the replay
test proves it for every fixture over hundreds of moves), and `applySteps` throws on a stream
that under-reports.

| Step | Fields | Notes |
|---|---|---|
| `swap` | `a`, `b`, `illegal` | `illegal` is always a boolean; an illegal swap is the only step of its move |
| `clear` | `cells: Pos[]`, `created: [{ pos, piece }]`, `cascade`, `points` | cascade is 1-based; created specials sit on cleared cells |
| `fall` | `moves: [{ from, to }]` | every moved piece once, straight down, final positions; apply as a batch (lift every `from`, then place every `to`); a special created by the same cascade's `clear` can be a `from` here |
| `spawn` | `cells: [{ pos, piece }]` | x then y; per run the contiguous empty prefix from the run's top, so the i-th (0-based) of n enters from row `top − (n − i)`, one row above the board for the last one |
| `shuffle` | `board` | same shape as `state().board`; rebuild every view from it |

Per move: `swap`, then per cascade `clear → fall → spawn` (empty ones omitted), then possibly
`shuffle`. Reserved types (`STEP_TYPES`) are rejected by `applySteps` until their phase.

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
`packages/levels` from phase 4). Ids 9001–9008: `coaster-5x5` (level 1-alike), `square-6x6`,
`square-7x7`, `scarf-5x9`, `holes-split`, `blockers-mix`, `spawners-weights`, `dead-prone-5x5`.
In phase 1 nothing damages blockers, so on `blockers-mix` the cells under a tangle drain and
stay empty; that is expected until phase 4. `spawners-weights` leaves its lower runs unfed on
purpose.
