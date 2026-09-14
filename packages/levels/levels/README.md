# Levels

One JSON file per level, following docs/DESIGN.md §10. A shipped level lives under its book
and is named by its number, so `book1/001.json` is Book 1 level 1, "Coaster (olive)" — the first
level a player is given, written in phase 5 as the vertical slice. The path is what makes a level
shipped: `listLevels()` lists every file outside `dev/` that is not marked `hidden` (§10's
frog-tap level). The rest of Book 1 (levels 2–15, `docs/LEVELS-BOOK1.md`) is authored in phase 6.

`dev/` holds boards that are never part of the play sequence and never reach a player. They are
reached with `listDevLevels()` and `loadLevel(id)`, and the placeholder Home screen lists them
in development only, under the shipped level.

Every level carries a `project`, the key the win screen's illustration is filed under; the
development boards name projects that have no art drawn, which is allowed.

| File | Id | What it is for |
|---|---|---|
| `book1/001.json` | 1 | "Coaster (olive)": stitch all 21 squares of a 5×5 round-ish coaster in 20 moves, on five colours and no meter — LEVELS-BOOK1 row 1, and the only level a release build lists |
| `dev/sandbox-9x9.json` | 9901 | the phase-2 board: full size, six colours, one of each blast in the corners |
| `dev/sandbox-hook-9x9.json` | 9902 | the same board on the hook meter |
| `dev/stitch-7x7.json` | 9903 | "Ring coaster": one stitch goal, 17 squares in a ring with a two-layer centre |
| `dev/beads-7x7.json` | 9904 | "Charm tail": collect 30 rust and deliver three beads, two of them on a schedule |
| `dev/moths-7x7.json` | 9905 | "Moths in the stash": clear the moths and the tangles, dig out two buttons |

`test/dev-levels.test.js` plays each of the three test levels out with the engine's random bot
over twenty seeds and fails if a level cannot be won or cannot be lost; `test/book1.test.js` does
the same for `book1/001.json` and checks it against its row in `docs/LEVELS-BOOK1.md`.
