# Level files

One JSON file per level, named by its number (`001.json`, `002.json`, …), in the format
in docs/DESIGN.md §10. Never hardcode a level in code. Phase 4 adds the first three test
levels and the loader; Book 1 (levels 1–15) is authored in phase 6.

`dev/` holds development boards the loader never lists. `dev/sandbox-9x9.json` (id 9901, the
`99xx` dev range) is the phase-2 board: 9×9 open, all six colors, 999 moves, no goals. The app
imports it through the package's `./levels/dev/*.json` export from one scaffold file
(`apps/mobile/src/game/sandbox.js`) until phase 4 replaces that file with the loader.
