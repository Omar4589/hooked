// Gravity and refill (DESIGN.md §3). Pieces fall straight down within a vertical run; tangles,
// moths and knotted balls are floors (nothing passes them, and cells below them stay empty
// until they clear); each run refills from its spawner at the top.

import { cellAt, isFloor, isEmptyOpen, removePiece, setPiece, posKey } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./constants.js').Run} Run */

/**
 * Settles every piece; returns every move made, each piece at most once, final positions.
 * @param {Board} board
 * @param {Run[]} runs
 * @returns {{ from: Pos, to: Pos }[]}
 */
export const applyGravity = (board, runs) => {
  const moves = [];
  for (const run of runs) {
    const { cells } = run;
    let write = cells.length - 1;
    for (let read = cells.length - 1; read >= 0; read -= 1) {
      const cell = cellAt(board, cells[read]);
      if (isFloor(cell)) {
        write = read - 1;
        continue;
      }
      if (cell.piece !== undefined) {
        if (write !== read) {
          const piece = removePiece(board, cells[read]);
          setPiece(board, cells[write], piece);
          moves.push({
            from: { x: cells[read].x, y: cells[read].y },
            to: { x: cells[write].x, y: cells[write].y },
          });
        }
        write -= 1;
      }
    }
  }
  return moves;
};

/**
 * Fills the contiguous empty prefix of every run whose top is a spawner. Returns the spawned
 * cells in x-then-y order, with pieces cloned so the step never aliases the board.
 * @param {Board} board
 * @param {Run[]} runs
 * @param {Set<string>} spawnerKeys  posKey of each spawner
 * @param {(pos: Pos) => Piece} spawnPiece
 * @returns {{ pos: Pos, piece: Piece }[]}
 */
export const refill = (board, runs, spawnerKeys, spawnPiece) => {
  const spawned = [];
  for (const run of runs) {
    if (!spawnerKeys.has(posKey({ x: run.x, y: run.top }))) continue;
    for (const pos of run.cells) {
      if (!isEmptyOpen(cellAt(board, pos))) break;
      const piece = spawnPiece({ x: pos.x, y: pos.y });
      setPiece(board, pos, piece);
      spawned.push({ pos: { x: pos.x, y: pos.y }, piece: { ...piece } });
    }
  }
  return spawned;
};
