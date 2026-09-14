// The Metro-only half of the project registry, and the single authority on which projects have
// art. ./projects.js reads a project key off a level; this file is what that key opens.
//
// It cannot be node-tested, and that is why it is its own file. Its entries are require() of PNG
// files, and under `node --test` neither spelling survives: `require` is not defined in an ES
// module scope, and an `import` of a .png throws ERR_UNKNOWN_FILE_EXTENSION. A test that reached
// this module would fail that one file — node --test isolates each — the same wall that keeps
// ./sprites.js out of node and ./compose.js in it. Merging this back into projects.js would read
// as tidying and would silently delete projects.test.js's reach.
//
// That test covers this file from the outside, by reading this source as text: it parses every
// require() path, checks the PNG and its @2x/@3x siblings are on disk, and checks every key here
// is a project some real level carries and that every shipped level's project is a key here. The
// scan is why the SHAPE below matters — a flat object literal, one project key per entry, each
// asset named by a require() with a single quoted argument. Building the map in a loop, or from a
// list of keys, would leave that scan with nothing to parse.
//
// The list of keys lives here and nowhere else. Do not mirror it into projects.js to get it under
// node: two lists drift, and the drift lands on the win screen — a hasArt() saying yes, an
// illustrationFor() coming back undefined, `.done` throwing, and the player's only way out of
// that screen being Home.
//
// Metro resolves the density: require('./x.png') picks x@2x.png or x@3x.png to suit the screen,
// so only the base name is ever written and all three files must sit in this folder. The coaster
// pair is the designer's first pass (delivered 2026-09-12); the queued re-cut lands as the same
// six filenames, so it costs nothing here.

/**
 * One project's art, in the two states the win screen shows: `empty`, the line drawing the goal
 * fills in, and `done`, the finished piece. Each side is whatever require() of a PNG returns — an
 * opaque Metro asset handle — and is only ever handed straight to an <Image source>.
 * @typedef {{ empty: number, done: number }} Illustration
 */

// __proto__: null so a key nobody authored cannot come back with something off Object.prototype:
// illustrationFor('constructor') has to be as absent as illustrationFor('mug_cozy').
const ILLUSTRATIONS = {
  __proto__: null,
  coaster_olive: {
    empty: require('./illus_coaster_olive_empty.png'),
    done: require('./illus_coaster_olive_done.png'),
  },
};

/**
 * The illustration filed under a project key, or null when that project has no art. Null is the
 * documented answer, not a failure: development boards never have art, and the other fourteen
 * Book 1 projects have none until phase 6 draws them. Callers handle the null — the win screen
 * draws nothing in its place. A null or undefined key answers null too, so
 * `illustrationFor(projectKeyOf(level))` is one call with no guard in front of it.
 * @param {string|null|undefined} key
 * @returns {Illustration|null}
 */
export const illustrationFor = (key) => ILLUSTRATIONS[key] ?? null;
