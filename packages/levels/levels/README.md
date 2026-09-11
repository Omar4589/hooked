# Levels

One JSON file per level, named by its number (`001.json`, `002.json`, …), following
docs/DESIGN.md §10. Book 1 (levels 1–15, `docs/LEVELS-BOOK1.md`) is authored in phase 6; until
then only the development boards below exist and `listLevels()` is empty.

`dev/` holds boards that are never part of the play sequence and never reach a player. They are
reached with `listDevLevels()` and `loadLevel(id)`, and the placeholder Home screen lists them
in development only.

| File | Id | What it is for |
|---|---|---|
| `dev/sandbox-9x9.json` | 9901 | the phase-2 board: full size, six colours, one of each blast in the corners |
| `dev/sandbox-hook-9x9.json` | 9902 | the same board on the hook meter |
| `dev/stitch-7x7.json` | 9903 | "Ring coaster": one stitch goal, 17 squares in a ring with a two-layer centre |
| `dev/beads-7x7.json` | 9904 | "Charm tail": collect 30 rust and deliver three beads, two of them on a schedule |
| `dev/moths-7x7.json` | 9905 | "Moths in the stash": clear the moths and the tangles, dig out two buttons |

`test/dev-levels.test.js` plays each of the three test levels out with the engine's random bot
over twenty seeds and fails if a level cannot be won or cannot be lost.
