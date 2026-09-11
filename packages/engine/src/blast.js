// What a special covers when it fires (DESIGN.md §4). Pure geometry: these functions read the
// board's shape and, for `takeableIn` and `ripArea`, what kind of piece sits in a cell — never
// what a piece is about to do. The wave in fire.js decides that.
//
// "Radius r" is the decided rounded square: the (2r+1) square centred on the cell minus its four
// extreme corners, so on an open board a Bobble takes 21 cells, a Popcorn 45 and a Yarn Bomb 77.
// A Puff is the exception and is a plus of five. A blast passes over holes: the hole itself is
// skipped and the cells beyond it are still taken.

import { BLAST_RADII, COMBO_BOARD_RADIUS, MATCH_SPECIALS } from './constants.js';
import { cellAt, inBounds } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Cell} Cell */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Color} Color */
/** @typedef {import('./constants.js').Special} Special */
/** @typedef {'rows'|'cols'|'both'} HookOrientation */

/**
 * Enough to re-derive a blast's cells from the step that reports it, which is how `applySteps`
 * proves the step neither under- nor over-reports.
 * @typedef {Object} BlastSpec
 * @property {Pos} pos
 * @property {Special} special                      names the shape the step player draws
 * @property {number|null} radius                   null for the hook
 * @property {HookOrientation|null} orientation     hook only
 */

/** Open cells only, in the order pushed. @param {Board} board @param {Pos[]} candidates */
const openOnly = (board, candidates) => {
  const cells = [];
  for (const pos of candidates) {
    if (inBounds(board, pos) && cellAt(board, pos).open) cells.push({ x: pos.x, y: pos.y });
  }
  return cells;
};

/**
 * The rounded square of radius r, row-major and clipped to the board.
 * @param {Board} board @param {Pos} pos @param {number} radius @returns {Pos[]}
 */
export const roundedSquare = (board, pos, radius) => {
  const candidates = [];
  for (let y = pos.y - radius; y <= pos.y + radius; y += 1) {
    for (let x = pos.x - radius; x <= pos.x + radius; x += 1) {
      const corner = Math.abs(x - pos.x) === radius && Math.abs(y - pos.y) === radius && radius > 0;
      if (!corner) candidates.push({ x, y });
    }
  }
  return openOnly(board, candidates);
};

/** A Puff: its own cell and its four orthogonal neighbours. @returns {Pos[]} */
export const plusArea = (board, pos) =>
  openOnly(board, [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
  ]);

/**
 * The Hook: three rows, three columns, or both through its own cell, clipped at the edge.
 * @param {Board} board @param {Pos} pos @param {HookOrientation} orientation @returns {Pos[]}
 */
export const hookLines = (board, pos, orientation) => {
  const wanted = new Set();
  if (orientation !== 'cols') {
    for (let y = pos.y - 1; y <= pos.y + 1; y += 1) {
      for (let x = 0; x < board.width; x += 1) wanted.add(`${x},${y}`);
    }
  }
  if (orientation !== 'rows') {
    for (let x = pos.x - 1; x <= pos.x + 1; x += 1) {
      for (let y = 0; y < board.height; y += 1) wanted.add(`${x},${y}`);
    }
  }
  const candidates = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (wanted.has(`${x},${y}`)) candidates.push({ x, y });
    }
  }
  return openOnly(board, candidates);
};

/** Every open cell: a combo bigger than a Yarn Bomb takes the board (§4). @returns {Pos[]} */
export const openCells = (board) => {
  const candidates = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) candidates.push({ x, y });
  }
  return openOnly(board, candidates);
};

/**
 * The cells a firing covers, from the spec alone. A radius past a Yarn Bomb is the whole board:
 * a rounded square that big is still clipped by the edges (35 cells from a corner of a 9x9),
 * which is not what §4 means.
 * @param {Board} board @param {BlastSpec} spec @returns {Pos[]}
 */
export const blastArea = (board, spec) => {
  if (spec.special === 'hook') return hookLines(board, spec.pos, spec.orientation ?? 'rows');
  if (spec.radius >= COMBO_BOARD_RADIUS) return openCells(board);
  if (spec.special === 'puff') return plusArea(board, spec.pos);
  return roundedSquare(board, spec.pos, spec.radius);
};

/**
 * What a blast or a rip takes: any piece but a bead, which is indestructible (§6). Knotted balls
 * and the frog are taken; an empty cell, a hole and a blocked cell hold nothing to take.
 * @param {Cell} cell
 */
export const isTakeable = (cell) =>
  cell.open === true && cell.piece !== undefined && cell.piece.kind !== 'bead';

/** The cells of `area` that hold something to take, in the order given. @returns {Pos[]} */
export const takeableIn = (board, area) => {
  const cells = [];
  for (const pos of area) {
    if (isTakeable(cellAt(board, pos))) cells.push({ x: pos.x, y: pos.y });
  }
  return cells;
};

/**
 * What the frog rips: every ball of `color`, plus its own cell while it is still standing there
 * (a frog caught in a blast was already taken by that blast). Row-major.
 * @param {Board} board @param {Color} color @param {Pos} pos @returns {Pos[]}
 */
export const ripArea = (board, color, pos) => {
  const cells = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = board.cells[y][x];
      const isFrog = pos !== undefined && x === pos.x && y === pos.y && isTakeable(cell);
      const isColor =
        cell.open &&
        cell.piece !== undefined &&
        cell.piece.kind === 'yarn' &&
        cell.piece.color === color;
      if (isFrog || isColor) cells.push({ x, y });
    }
  }
  return cells;
};

/** §4: swapping two blasts fires one of radius max + 1, a Puff counting as 1. @returns {number} */
export const comboRadius = (specialA, specialB) =>
  Math.max(BLAST_RADII[specialA], BLAST_RADII[specialB]) + 1;

/** The special whose shape a radius draws; past a Yarn Bomb it keeps the bomb's name. */
export const specialForRadius = (radius) =>
  radius >= BLAST_RADII.yarnbomb ? MATCH_SPECIALS[7] : MATCH_SPECIALS[radius + 3];
