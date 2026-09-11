// Beads and buttons (DESIGN.md §6). A bead is swappable, never matchable, indestructible, and
// leaves the board through an exit cell. New ones drop from a spawner on a schedule until the
// level's `total` is reached. Nothing here mutates the board: the callers do that.

import { cellAt, isEmptyOpen, posKey } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */

/**
 * Beads resting on an exit cell, row-major. Read at the top of every cascade: a bead that has
 * just fallen onto its exit leaves before anything else happens.
 * @param {Board} board
 * @param {Set<string>} exitKeys  posKey of each of the level's exits
 * @returns {Pos[]}
 */
export const beadsOnExits = (board, exitKeys) => {
  const cells = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const piece = board.cells[y][x].piece;
      if (piece !== undefined && piece.kind === 'bead' && exitKeys.has(posKey({ x, y }))) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
};

/**
 * The spawner tops that are empty right now: exactly the runs the refill about to happen will
 * fill, which is why the bead can be promised to one of them before a single piece is placed.
 * @param {Board} board
 * @param {Pos[]} spawners  the level's spawners, in level order
 * @returns {Pos[]}
 */
export const emptySpawnerTops = (board, spawners) => {
  const tops = [];
  for (const pos of spawners) {
    if (isEmptyOpen(cellAt(board, pos))) tops.push({ x: pos.x, y: pos.y });
  }
  return tops;
};

/**
 * Is another bead due on the move just spent? Every `spawnEvery` moves until the level's total
 * is accounted for, counting the ones that started on the board.
 * @param {{ total: number, onBoard: number, spawnEvery: number }} beads
 * @param {number} spent      moves spent so far, including this one
 * @param {number} scheduled  beads already spawned or still owed
 * @returns {boolean}
 */
export const isBeadDue = (beads, spent, scheduled) =>
  beads.spawnEvery > 0 &&
  spent > 0 &&
  spent % beads.spawnEvery === 0 &&
  scheduled < beads.total - beads.onBoard;
