# @hooked/levels

Level JSON in `levels/`, with the registry, the loader and schema validation. Format:
docs/DESIGN.md §10.

```js
import { listLevels, listDevLevels, loadLevel, validateLevel } from '@hooked/levels';

listLevels();      // the shipped play sequence, [{ id, name, book, hard }] by id (empty until Book 1)
listDevLevels();   // the development boards in levels/dev/, never part of the sequence
loadLevel(id);     // a fresh, validated copy of one level file; throws on an unknown id
validateLevel(json, name);  // the engine's normalizeLevel plus this package's checks
```

Adding a level is one JSON file under `levels/` and one line in `src/registry.js`:

```js
import level001 from '../levels/001.json' with { type: 'json' };
```

The imports are static and carry the attribute because the app bundles them with Metro, which
cannot read the filesystem on a phone; `test/registry.test.js` fails on a file with no line, or
a line without the attribute. Shipped levels are named by their number (`001.json`, `002.json`,
…) and are authored in phase 6 from `docs/LEVELS-BOOK1.md`.

`validateLevel` adds what `normalizeLevel` leaves to this package: five or six colours (§3), at
least one goal on a shipped level, and every cross-check between a level's goals and its board —
a stitch goal needs stitch squares, a collect colour has to be one the level plays and refills,
the bead schedule has to add up, a clear goal has to name a blocker the grid holds, a buried goal
needs `x` cells. Errors start with `level <name>:`.

```bash
npm test -w packages/levels        # from the repo root
```
