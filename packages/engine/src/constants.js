// Fixed names. Every other package, the level files and the UI use these strings
// verbatim (see CLAUDE.md "Names are fixed" and docs/DESIGN.md §4, §5, §6, §15).

/** @typedef {'olive'|'mustard'|'blush'|'rust'|'lavender'|'cocoa'} Color */
/** @typedef {'puff'|'bobble'|'popcorn'|'yarnbomb'|'hook'} Special */
/** @typedef {'yarn'|'frog'|'bead'} PieceKind */
/** @typedef {'tangle'|'knot'|'moth'} Blocker */
/** @typedef {'stitch'|'collect'|'beads'|'clear'|'buried'} GoalType */

/** The six yarn colors, in palette order. @type {readonly Color[]} */
export const COLORS = Object.freeze(['olive', 'mustard', 'blush', 'rust', 'lavender', 'cocoa']);

/**
 * Specials that ride on a colored yarn ball: the four blasts by the match size that makes
 * them, then the Hook that the meter drops on hook levels. @type {readonly Special[]}
 */
export const SPECIALS = Object.freeze(['puff', 'bobble', 'popcorn', 'yarnbomb', 'hook']);

/**
 * What can occupy a cell: a yarn ball (optionally carrying a special), the Frog, which is
 * its own colorless piece (decided 2026-09-10, DESIGN.md §4), or a bead. @type {readonly PieceKind[]}
 */
export const PIECE_KINDS = Object.freeze(['yarn', 'frog', 'bead']);

/** The three v1 blockers. @type {readonly Blocker[]} */
export const BLOCKERS = Object.freeze(['tangle', 'knot', 'moth']);

/** Goal types a level may list (DESIGN.md §6, §10). @type {readonly GoalType[]} */
export const GOALS = Object.freeze(['stitch', 'collect', 'beads', 'clear', 'buried']);

/** Board size ceiling (DESIGN.md §3). */
export const MAX_BOARD_SIZE = 9;
