// The frog meter (DESIGN.md §4). Every special that fires adds charge; at METER_FULL the frog —
// or the Hook on a hook level — drops onto the board and the meter resets. A rip never charges,
// and neither does the Hook.

import { COLORS, METER_CHARGE, METER_FULL, METER_MULTI_BONUS } from './constants.js';
import { cellAt, isPlainBall } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./fire.js').FireOrder} FireOrder */

/**
 * What one wave adds: every special it consumed, plus the multi bonus once when two or more
 * *charging* specials fired together. The Hook fires but charges nothing, so a wave of one Hook
 * and one Puff is worth 1, not 3.
 * @param {FireOrder[]} orders  every order in the wave
 * @returns {number}
 */
export const chargeForWave = (orders) => {
  let total = 0;
  let charging = 0;
  for (const order of orders) {
    for (const source of order.sources) {
      const rate = METER_CHARGE[source] === undefined ? 0 : METER_CHARGE[source];
      total += rate;
      if (rate > 0) charging += 1;
    }
  }
  return charging >= 2 ? total + METER_MULTI_BONUS : total;
};

/**
 * The meter as `state()` reports it: a fresh object every call.
 * @param {'none'|'frog'|'hook'} kind
 * @param {number} charge
 */
export const meterState = (kind, charge) =>
  kind === 'none' ? { kind: 'none' } : { kind, charge, full: METER_FULL };

/**
 * Where the meter may drop: a cell holding a plain yarn ball, which the dropped piece replaces.
 * Specials, knots, beads and the frog are left alone, so a drop never destroys anything earned.
 * @param {Board} board
 * @returns {Pos[]} row-major
 */
export const dropCandidates = (board) => {
  const cells = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = cellAt(board, { x, y });
      if (cell.open && isPlainBall(cell.piece)) cells.push({ x, y });
    }
  }
  return cells;
};

/**
 * What the meter drops. The frog is colorless and replaces the ball outright; the Hook rides the
 * ball already there and keeps its color, so the drop can never complete a match.
 * @param {'frog'|'hook'} kind
 * @param {Piece} replaced
 * @returns {Piece}
 */
export const dropPiece = (kind, replaced) =>
  kind === 'frog'
    ? { kind: 'frog' }
    : {
        kind: 'yarn',
        color: COLORS.includes(replaced.color) ? replaced.color : COLORS[0],
        special: 'hook',
      };
