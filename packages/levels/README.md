# @hooked/levels

Level JSON in `levels/`. The loader and schema validation land in `src/` in phase 4; until then
`src/index.js` only reserves the package shape. Format: docs/DESIGN.md §10.

`levels/dev/` holds development boards (never listed by the loader); the phase-2 sandbox lives
there and is reachable as `@hooked/levels/levels/dev/sandbox-9x9.json` through the package's
`exports`. `test/sandbox.test.js` keeps it valid and playable.

```bash
npm test -w packages/levels        # from the repo root
```
