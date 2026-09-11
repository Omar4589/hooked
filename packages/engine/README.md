# @hooked/engine

The match-3 engine as a pure JavaScript package: it takes a level and a seed, accepts a
swap or a tap, and returns animation steps plus the new state (docs/DESIGN.md §11). It has
no dependency on react, react-native, expo or any app in this repo, which is what lets the
mobile app and the web playground share it and lets bots play thousands of attempts in Node.

- `src/constants.js` — the fixed color / special / blocker / goal names.
- `src/index.js` — the public surface. Phase 1 adds `createGame(level, seed)`.
- `scripts/play.js` (arrives in phase 1) — plays random moves and prints the board as text.
- `test/` — Jest. Every engine change ships with a test.

```bash
npm test -w packages/engine        # from the repo root
```

Native ESM: Jest runs with `--experimental-vm-modules` and no Babel transform.
