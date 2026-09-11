// Swap legality and the list of match-making moves (DESIGN.md §3 "Swap", §11 validMoves).

import { inBounds, isAdjacent, cellAt, pieceAt, swapPieces } from './board.js';
import { matchThrough } from './match.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./constants.js').Pos} Pos */

/**
 * A piece that fires when swapped: one carrying a special, or the frog (DESIGN.md §4).
 * @param {Piece} [piece]
 */
export const firesOnSwap = (piece) =>
  piece !== undefined && (piece.special !== undefined || piece.kind === 'frog');

/**
 * Both cells in bounds, adjacent, open, unblocked, holding a piece that is not knotted.
 * @param {Board} board
 * @param {Pos} a
 * @param {Pos} b
 */
export const canSwap = (board, a, b) => {
  if (!inBounds(board, a) || !inBounds(board, b) || !isAdjacent(a, b)) return false;
  for (const cell of [cellAt(board, a), cellAt(board, b)]) {
    if (!cell.open || cell.tangle > 0 || cell.moth === true) return false;
    if (cell.piece === undefined || cell.piece.knotted === true) return false;
  }
  return true;
};

/**
 * Would swapping make a 3+ line through either cell? Leaves the board as it found it.
 * @param {Board} board
 * @param {Pos} a
 * @param {Pos} b
 */
export const wouldMatch = (board, a, b) => {
  swapPieces(board, a, b);
  const result = matchThrough(board, a) || matchThrough(board, b);
  swapPieces(board, a, b);
  return result;
};

/**
 * DESIGN.md §3: legal if it makes a match, or either piece fires on swap.
 * @param {Board} board
 * @param {Pos} a
 * @param {Pos} b
 */
export const isLegalSwap = (board, a, b) =>
  canSwap(board, a, b) &&
  (wouldMatch(board, a, b) || firesOnSwap(pieceAt(board, a)) || firesOnSwap(pieceAt(board, b)));

/**
 * Every swap that makes a match, each pair once in row-major order (the first position sorts
 * before the second). With `specials`, swaps that only fire a special or the frog are included.
 * @param {Board} board
 * @param {{ specials?: boolean }} [options]
 * @returns {[Pos, Pos][]}
 */
export const listValidMoves = (board, { specials = false } = {}) => {
  const moves = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const p = { x, y };
      for (const q of [
        { x: x + 1, y },
        { x, y: y + 1 },
      ]) {
        if (!inBounds(board, q) || !canSwap(board, p, q)) continue;
        if (
          wouldMatch(board, p, q) ||
          (specials && (firesOnSwap(pieceAt(board, p)) || firesOnSwap(pieceAt(board, q))))
        ) {
          moves.push([
            { x, y },
            { x: q.x, y: q.y },
          ]);
        }
      }
    }
  }
  return moves;
};

/**
 * Is there a special or a frog anywhere the player could double-tap? A special hemmed in by
 * blockers has no swappable neighbour but is still a move (DESIGN.md §4 "double-tap it in place").
 * @param {Board} board
 */
export const hasFireable = (board) => {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = board.cells[y][x];
      if (cell.open && !(cell.tangle > 0) && cell.moth !== true && firesOnSwap(cell.piece)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * A board is dead only when the player truly cannot act: no match-making swap, no swap that
 * would fire something, and nothing to tap. A board with a Yarn Bomb on it is never dead, so it
 * is never shuffled away (DESIGN.md §3 "No valid moves → Untangling…").
 * @param {Board} board
 */
export const isDeadBoard = (board) =>
  listValidMoves(board, { specials: true }).length === 0 && !hasFireable(board);
