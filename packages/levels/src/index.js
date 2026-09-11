// @hooked/levels — level registry, loader and schema validation.
//
// Levels are hand-authored JSON in ../levels/ and follow docs/DESIGN.md §10. Phase 4 adds
// the loader and the schema validator; phase 0 only reserves the package and its shape.

/** Version of the level JSON format this package understands (DESIGN.md §10). */
export const LEVEL_FORMAT_VERSION = 1;

/**
 * Every shipped level, in play order. Empty until phase 4 authors the first ones.
 * @returns {object[]}
 */
export const listLevels = () => [];
