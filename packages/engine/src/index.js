// @hooked/engine — public surface.
//
// Phase 0 ships only the fixed names; phase 1 adds createGame (DESIGN.md §11).
// Nothing in this package may import react, react-native or expo.

export { COLORS, SPECIALS, PIECE_KINDS, BLOCKERS, GOALS, MAX_BOARD_SIZE } from './constants.js';

/** Bumped by hand when the step format or the game API changes shape. */
export const ENGINE_VERSION = '0.1.0';
