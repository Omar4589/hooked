// Fixed names, numbers and legends. Every other package, the level files and the UI use these
// strings verbatim (CLAUDE.md "Names are fixed"; docs/DESIGN.md §4, §5, §6, §7, §10, §11).

/** @typedef {'olive'|'mustard'|'blush'|'rust'|'lavender'|'cocoa'} Color */
/** @typedef {'puff'|'bobble'|'popcorn'|'yarnbomb'|'hook'} Special */
/** @typedef {'yarn'|'frog'|'bead'} PieceKind */
/** @typedef {'tangle'|'knot'|'moth'} Blocker */
/** @typedef {'stitch'|'collect'|'beads'|'clear'|'buried'} GoalType */
/** @typedef {{ x: number, y: number }} Pos */

/**
 * What sits in a cell. A special rides on a colored yarn ball; the frog is its own colorless
 * kind (decided 2026-09-10, DESIGN.md §4); a bead is swappable but never matchable.
 * @typedef {Object} Piece
 * @property {PieceKind} kind
 * @property {Color} [color]      yarn only
 * @property {Special} [special]  yarn only
 * @property {boolean} [knotted]  yarn only; never moves, still matches where it sits
 */

/**
 * One board cell. Optional keys are absent when unset, never `undefined`.
 * @typedef {Object} Cell
 * @property {boolean} open       false for a hole (`.` in the level file)
 * @property {Piece} [piece]
 * @property {number} [tangle]    1–3 layers; the cell has no piece while > 0
 * @property {boolean} [moth]
 * @property {number} [stitch]    1–2 unstitched layers under the piece
 * @property {boolean} [buried]   a button under a tangle (`x` in the level file)
 */

/** @typedef {{ width: number, height: number, cells: Cell[][] }} Board  cells indexed [y][x] */

/**
 * A maximal vertical group of non-hole cells; `cells` runs top to bottom.
 * @typedef {{ x: number, top: number, bottom: number, cells: Pos[] }} Run
 */

/**
 * One goal as `state()` reports it (DESIGN.md §6). `total` is fixed when the level starts;
 * `remaining` is recounted from the board for stitch and clear goals and counted down for the
 * rest, so a multiplying moth can push a clear goal above its total.
 * @typedef {Object} GoalState
 * @property {GoalType} type
 * @property {Color} [color]
 * @property {number} [count]
 * @property {Blocker} [blocker]
 * @property {string} [sprite]
 * @property {number} total
 * @property {number} remaining
 */

/** A piece and where it was when it left the board, for the damage hook. */
/** @typedef {{ pos: Pos, piece: Piece }} Removed */

/** Bumped by hand when the step format or the game API changes shape. */
export const ENGINE_VERSION = '0.4.0';

/** The six yarn colors, in palette order. @type {readonly Color[]} */
export const COLORS = Object.freeze(['olive', 'mustard', 'blush', 'rust', 'lavender', 'cocoa']);

/**
 * Specials that ride on a colored yarn ball: the four blasts by the match size that makes
 * them, then the Hook that the meter drops on hook levels. @type {readonly Special[]}
 */
export const SPECIALS = Object.freeze(['puff', 'bobble', 'popcorn', 'yarnbomb', 'hook']);

/** What can occupy a cell. @type {readonly PieceKind[]} */
export const PIECE_KINDS = Object.freeze(['yarn', 'frog', 'bead']);

/** The three v1 blockers. @type {readonly Blocker[]} */
export const BLOCKERS = Object.freeze(['tangle', 'knot', 'moth']);

/** Goal types a level may list (DESIGN.md §6, §10). @type {readonly GoalType[]} */
export const GOALS = Object.freeze(['stitch', 'collect', 'beads', 'clear', 'buried']);

/** Blast radius per special (DESIGN.md §4); the Hook has none, it sweeps lines. */
export const BLAST_RADII = Object.freeze({ puff: 1, bobble: 2, popcorn: 3, yarnbomb: 4 });

/** A combo fires at max(r1, r2) + 1; at this radius and beyond it takes the whole board. */
export const COMBO_BOARD_RADIUS = 5;

/** Which lines the Hook sweeps; 'both' is the Hook + Hook combo. */
export const HOOK_ORIENTATIONS = Object.freeze(['rows', 'cols', 'both']);

/** Meter charge per special that fires (§4). The Hook fires but never charges. */
export const METER_CHARGE = Object.freeze({ puff: 1, bobble: 2, popcorn: 3, yarnbomb: 4, hook: 0 });

/** Added once per wave in which two or more charging specials fire (§4). */
export const METER_MULTI_BONUS = 2;

/**
 * What a `blocker` step can be about, and the order several of them on one cell are emitted in
 * (DESIGN.md §5). A knot is credited, not stored: the knotted ball leaves through the clear or
 * blast that takes it, and its step changes nothing on the board.
 */
export const BLOCKER_STEP_KINDS = Object.freeze(['tangle', 'moth', 'knot', 'stitch']);

/** What Yarn Over turns each remaining move into (DESIGN.md §6). */
export const YARN_OVER_SPECIALS = Object.freeze(['puff', 'bobble']);

/** Board size ceiling (DESIGN.md §3). */
export const MAX_BOARD_SIZE = 9;

/** Score table (DESIGN.md §7). Only `yarn` is multiplied by the cascade multiplier. */
export const SCORE = Object.freeze({
  yarn: 20,
  puff: 60,
  bobble: 120,
  popcorn: 250,
  yarnbomb: 500,
  frogRip: 500,
  stitch: 1000,
  blockerLayer: 200,
  bead: 2000,
  coinsPerMove: 20,
});

/** Cascade multiplier cap (DESIGN.md §3): ×1, ×2, … ×5. */
export const MAX_CASCADE_MULTIPLIER = 5;

/** Safety bound on cascades in one move; a level that exceeds it is an authoring bug. */
export const MAX_CASCADES = 100;

/**
 * Safety bound on blast waves within one cascade. A correct wave takes at least one piece per
 * round from a board of at most MAX_BOARD_SIZE^2 cells and cannot create specials, so this is
 * unreachable; reaching it means an order was seeded twice.
 */
export const MAX_BLAST_WAVES = MAX_BOARD_SIZE * MAX_BOARD_SIZE;

/** Charge at which the frog (or hook) meter drops its piece (DESIGN.md §4). */
export const METER_FULL = 10;

/** Values of a level's `meter` field (DESIGN.md §10). */
export const METERS = Object.freeze(['none', 'frog', 'hook']);

/** Values of a level's `hard` field (DESIGN.md §8, §10). */
export const HARD_LABELS = Object.freeze([false, 'tricky', 'tangled', 'nightmare']);

/** Match size → the special it creates (DESIGN.md §4); 7 or more makes a Yarn Bomb. */
export const MATCH_SPECIALS = Object.freeze({
  4: 'puff',
  5: 'bobble',
  6: 'popcorn',
  7: 'yarnbomb',
});

/** Pieces a level's `presets` may place (DESIGN.md §10). */
export const PRESET_PIECES = Object.freeze([...SPECIALS, 'frog']);

/** Every step type in DESIGN.md §11; all thirteen are live from phase 4. */
export const STEP_TYPES = Object.freeze([
  'swap',
  'clear',
  'blast',
  'frogRip',
  'meter',
  'meterDrop',
  'blocker',
  'fall',
  'spawn',
  'mothSpread',
  'beadExit',
  'shuffle',
  'yarnOver',
]);

/** Characters of a level file's `cells` grid (DESIGN.md §10). */
export const CELL_LEGEND = Object.freeze({
  '.': 'hole',
  o: 'open',
  1: 'tangle',
  2: 'tangle',
  3: 'tangle',
  k: 'knot',
  m: 'moth',
  b: 'bead',
  x: 'buried',
});

/** Characters of a level file's `stitch` grid (DESIGN.md §10). */
export const STITCH_LEGEND = Object.freeze({ '.': 0, 1: 1, 2: 2 });

/**
 * The text render (play.js, tests): two characters per cell so it is lossless and does not
 * collide with the level legend. Column 1 is the content, column 2 the modifier.
 */
export const TEXT_LEGEND = Object.freeze({
  color: Object.freeze({
    olive: 'o',
    mustard: 'm',
    blush: 'b',
    rust: 'r',
    lavender: 'l',
    cocoa: 'c',
  }),
  frog: 'F',
  bead: '*',
  tangle: '#',
  buried: 'x',
  moth: '@',
  hole: '.',
  empty: '_',
  none: '.',
  special: Object.freeze({ puff: 'P', bobble: 'B', popcorn: 'C', yarnbomb: 'Y', hook: 'H' }),
  knotted: 'K',
});
