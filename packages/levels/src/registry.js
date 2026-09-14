// The level registry: one static import per file under levels/, with the import attribute Node,
// Jest, Metro and Vite all require. Static because Metro cannot read the filesystem on a phone;
// hand-maintained because adding a level should be one JSON file and one line, and
// test/registry.test.js fails on a file that has no line or a line without the attribute.

import level001 from '../levels/book1/001.json' with { type: 'json' };
import sandbox9x9 from '../levels/dev/sandbox-9x9.json' with { type: 'json' };
import sandboxHook9x9 from '../levels/dev/sandbox-hook-9x9.json' with { type: 'json' };
import stitch7x7 from '../levels/dev/stitch-7x7.json' with { type: 'json' };
import beads7x7 from '../levels/dev/beads-7x7.json' with { type: 'json' };
import moths7x7 from '../levels/dev/moths-7x7.json' with { type: 'json' };

/**
 * One level file.
 * @typedef {Object} Entry
 * @property {string} name  its path under levels/ without the extension; a `dev/` prefix marks a
 *   development board, which listLevels() never lists
 * @property {object} json  the parsed level file (DESIGN.md §10)
 */

/** Every level this package knows, shipped and development alike. @type {readonly Entry[]} */
export const REGISTRY = Object.freeze([
  { name: 'book1/001', json: level001 },
  { name: 'dev/sandbox-9x9', json: sandbox9x9 },
  { name: 'dev/sandbox-hook-9x9', json: sandboxHook9x9 },
  { name: 'dev/stitch-7x7', json: stitch7x7 },
  { name: 'dev/beads-7x7', json: beads7x7 },
  { name: 'dev/moths-7x7', json: moths7x7 },
]);
