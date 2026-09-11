// Yarn Over (DESIGN.md §6): the level is won, so every move left over turns a random ball into a
// Puff or a Bobble. This module only places them; game.js fires them one after another, and they
// chain into each other on the way.

import { YARN_OVER_SPECIALS } from './constants.js';
import { pieceAt, setPiece } from './board.js';
import { dropCandidates } from './meter.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * One special per unused move, on plain yarn balls drawn without replacement. Each rides the
 * ball it lands on and keeps its colour, exactly like a meter drop. The pieces come back as the
 * board's own objects so the caller can find them again after a cascade has moved them.
 * @param {Board} board  mutated
 * @param {Rng} rng
 * @param {number} moves  moves left when the level was won
 * @returns {{ pos: Pos, piece: Piece }[]} in draw order
 */
export const placeYarnOver = (board, rng, moves) => {
  const candidates = dropCandidates(board);
  const count = Math.min(moves, candidates.length);
  const placed = [];
  for (let i = 0; i < count; i += 1) {
    const pos = candidates.splice(rng.int(candidates.length), 1)[0];
    const special = rng.pick(YARN_OVER_SPECIALS);
    const piece = { ...pieceAt(board, pos), special };
    setPiece(board, pos, piece);
    placed.push({ pos: { x: pos.x, y: pos.y }, piece });
  }
  return placed;
};
