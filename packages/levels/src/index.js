// @hooked/levels — the level registry, the loader and schema validation (DESIGN.md §10, §11).
// Browser-safe like the engine: no filesystem, no build step, just static JSON imports.

import { REGISTRY } from './registry.js';
import { buildCatalog } from './catalog.js';
import { validateLevel } from './schema.js';

export { validateLevel };

/** Version of the level JSON format this package understands (DESIGN.md §10). */
export const LEVEL_FORMAT_VERSION = 1;

const catalog = buildCatalog(REGISTRY);

/**
 * Every shipped level, in play order: Book 1 level 1, with levels 2-15 to follow in phase 6.
 * @returns {{ id: number, name: string, book: number, hard: false|string }[]}
 */
export const listLevels = () => catalog.shipped.map((summary) => ({ ...summary }));

/**
 * The development boards in levels/dev/, for the placeholder Home screen in development. They
 * are never part of the play sequence.
 * @returns {{ id: number, name: string, book: number, hard: false|string }[]}
 */
export const listDevLevels = () => catalog.dev.map((summary) => ({ ...summary }));

/**
 * A fresh copy of one level file, validated on the way out so a broken file fails where it is
 * loaded, naming itself.
 * @param {number} id
 * @returns {object}
 */
export const loadLevel = (id) => {
  const entry = catalog.byId.get(id);
  if (entry === undefined) throw new Error(`loadLevel: unknown level id ${id}`);
  validateLevel(entry.json, entry.name);
  return JSON.parse(JSON.stringify(entry.json));
};
