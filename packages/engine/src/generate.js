// Board generation and shuffling (DESIGN.md §3). The fill is a construction: filling row-major
// and excluding any color that would complete a run of 3 with pieces already present makes
// every fill match-free whenever at least three colors carry a positive weight (two colors
// can both be excluded at once, and the acceptance check catches that). Retries exist for the
// acceptance predicate: match-free plus a valid move.

import { buildBoard } from './level.js';
import { forEachCell, setPiece, pieceAt } from './board.js';
import { findMatches, matchColor } from './match.js';
import { listValidMoves } from './moves.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Color} Color */
/** @typedef {import('./level.js').Level} Level */
/** @typedef {import('./rng.js').Rng} Rng */
/**
 * @typedef {Object} GenerateOptions
 * @property {(board: Board, level: Level) => boolean} [accept]
 * @property {number} [attempts]
 */

/**
 * A weighted pick among the level's colors, skipping `exclude`; if every candidate is excluded
 * or weightless, falls back to all colors with a positive weight (the caller's match check
 * catches the result).
 * @param {Color[]} colors
 * @param {Record<string, number>} weights
 * @param {Rng} rng
 * @param {Set<string>|null} [exclude]
 * @returns {Color}
 */
export const pickColor = (colors, weights, rng, exclude = null) => {
  const positive = colors.filter((c) => weights[c] > 0);
  const candidates = exclude === null ? positive : positive.filter((c) => !exclude.has(c));
  const pool = candidates.length > 0 ? candidates : positive;
  return rng.weighted(
    pool,
    pool.map((c) => weights[c]),
  );
};

/**
 * Colors that would complete a run of 3 through `pos` with the pieces already on the board,
 * looking both ways along the row and the column.
 * @param {Board} board
 * @param {Pos} pos
 * @returns {Set<string>}
 */
export const excludedColors = (board, pos) => {
  const excluded = new Set();
  const colorAt = (x, y) =>
    x >= 0 && y >= 0 && x < board.width && y < board.height ? matchColor(board.cells[y][x]) : null;
  const check = (dx, dy) => {
    const a1 = colorAt(pos.x - dx, pos.y - dy);
    const a2 = colorAt(pos.x - 2 * dx, pos.y - 2 * dy);
    const b1 = colorAt(pos.x + dx, pos.y + dy);
    const b2 = colorAt(pos.x + 2 * dx, pos.y + 2 * dy);
    if (a1 !== null && a1 === a2) excluded.add(a1);
    if (b1 !== null && b1 === b2) excluded.add(b1);
    if (a1 !== null && a1 === b1) excluded.add(a1);
  };
  check(1, 0);
  check(0, 1);
  return excluded;
};

/**
 * Places a match-free piece on every empty cell the level fills (yarn, knotted yarn, beads).
 * Cells that already hold a piece are kept.
 * @param {Board} board
 * @param {Level} level
 * @param {Rng} rng
 * @returns {Board}
 */
export const fillBoard = (board, level, rng) => {
  forEachCell(board, (cell, pos) => {
    if (!cell.open || cell.piece !== undefined) return;
    const t = level.grid[pos.y][pos.x];
    if (t.fill === 'yarn') {
      const piece = {
        kind: 'yarn',
        color: pickColor(level.colors, level.weights, rng, excludedColors(board, pos)),
      };
      if (t.knot) piece.knotted = true;
      setPiece(board, pos, piece);
    } else if (t.fill === 'bead') {
      setPiece(board, pos, { kind: 'bead' });
    }
  });
  return board;
};

/**
 * Applies the level's presets on top of a filled board: a special rides the ball already there
 * (its color is match-free by construction); the frog replaces the ball.
 * @param {Board} board
 * @param {Level} level
 * @returns {Board}
 */
export const placePresets = (board, level) => {
  for (const p of level.presets) {
    const pos = { x: p.x, y: p.y };
    if (p.piece === 'frog') setPiece(board, pos, { kind: 'frog' });
    else pieceAt(board, pos).special = p.piece;
  }
  return board;
};

/** No matches and at least one match-making move. @param {Board} board */
export const isPlayable = (board) =>
  findMatches(board).length === 0 && listValidMoves(board).length > 0;

/**
 * @param {Level} level
 * @param {Rng} rng
 * @param {GenerateOptions} [options]  accept defaults to isPlayable, attempts to 200
 * @returns {Board}
 */
export const generateBoard = (level, rng, { accept = isPlayable, attempts = 200 } = {}) => {
  for (let i = 0; i < attempts; i += 1) {
    const board = buildBoard(level);
    fillBoard(board, level, rng);
    placePresets(board, level);
    if (accept(board, level)) return board;
  }
  const hint = 'too few colors or open cells?';
  throw new Error(`level ${level.id}: no acceptable board after ${attempts} attempts (${hint})`);
};

/**
 * Positions of pieces a shuffle may move: unknotted yarn balls (specials ride along).
 * @param {Board} board
 * @returns {Pos[]}
 */
export const movablePositions = (board) => {
  const positions = [];
  forEachCell(board, (cell, pos) => {
    if (
      cell.open &&
      cell.piece !== undefined &&
      cell.piece.kind === 'yarn' &&
      cell.piece.knotted !== true
    ) {
      positions.push(pos);
    }
  });
  return positions;
};

/**
 * Permutes the movable pieces in place until the board is match-free with a valid move
 * (DESIGN.md §3 "never into an immediate match"). Knots, beads, the frog, blockers and holes
 * stay where they are.
 * @param {Board} board
 * @param {Level} level
 * @param {Rng} rng
 * @param {{ attempts?: number }} [options]
 * @returns {Board}
 */
export const shuffleBoard = (board, level, rng, { attempts = 200 } = {}) => {
  const positions = movablePositions(board);
  const pieces = positions.map((p) => pieceAt(board, p));
  for (let i = 0; i < attempts; i += 1) {
    rng.shuffle(pieces);
    positions.forEach((p, k) => setPiece(board, p, pieces[k]));
    if (isPlayable(board)) return board;
  }
  throw new Error(
    `level ${level.id}: cannot shuffle into a playable board after ${attempts} attempts`,
  );
};
