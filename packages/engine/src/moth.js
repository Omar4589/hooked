// Moths (DESIGN.md §5). A moth fills a cell and spreads: at the end of any move where no moth
// was cleared, one of them eats an adjacent yarn ball and a new moth takes that cell. The old
// moth stays — they multiply, they do not crawl (decided 2026-09-11) — so nothing falls after a
// spread and the only way out is to clear them faster than they breed.

import { cellAt, inBounds, isPlainBall } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * What a moth at `pos` could eat: an orthogonal open cell holding a plain yarn ball. Specials,
 * knots, beads and the frog are safe, so a spread can never destroy something earned.
 * @param {Board} board
 * @param {Pos} pos
 * @returns {Pos[]} up, left, right, down
 */
export const eligibleNeighbours = (board, pos) => {
  const cells = [];
  for (const next of [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
  ]) {
    if (!inBounds(board, next)) continue;
    const cell = cellAt(board, next);
    if (cell.open === true && !(cell.tangle > 0) && cell.moth !== true && isPlainBall(cell.piece)) {
      cells.push(next);
    }
  }
  return cells;
};

/**
 * Moths with something to eat, row-major.
 * @param {Board} board
 * @returns {Pos[]}
 */
export const spreadCandidates = (board) => {
  const cells = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const pos = { x, y };
      if (cellAt(board, pos).moth === true && eligibleNeighbours(board, pos).length > 0) {
        cells.push(pos);
      }
    }
  }
  return cells;
};

/**
 * One spread: a random moth, then a random neighbour of it. Two draws, or none at all when no
 * moth can reach a ball.
 * @param {Board} board  mutated: `to` loses its ball and gains a moth
 * @param {Rng} rng
 * @returns {{ type: 'mothSpread', from: Pos, to: Pos }|null}
 */
export const spreadMoth = (board, rng) => {
  const candidates = spreadCandidates(board);
  if (candidates.length === 0) return null;
  const from = rng.pick(candidates);
  const to = rng.pick(eligibleNeighbours(board, from));
  const cell = cellAt(board, to);
  delete cell.piece;
  cell.moth = true;
  return { type: 'mothSpread', from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
};
