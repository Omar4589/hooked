// Firing specials (DESIGN.md §4). An *order* is one firing: what it is, where it goes off, and
// which specials it consumed. Orders come from a swap, a double-tap, a match, or another blast,
// and `runFire` plays them breadth-first — a Puff that hits a Bobble that hits the Frog all go
// off in one wave, one step each.
//
// The wave computes every order's cells against the live board at the moment that order fires
// and removes them before the next one runs. That is what makes a step self-contained: its
// `cells` are exactly what it took, no cell is ever named twice in a cascade, and applySteps can
// re-derive the same set to prove the stream neither under- nor over-reports.

import { MAX_BLAST_WAVES, METER_CHARGE, BLAST_RADII } from './constants.js';
import { cellAt, pieceAt, posKey, removePiece } from './board.js';
import { mostCommonColors } from './match.js';
import {
  blastArea,
  comboRadius,
  isTakeable,
  ripArea,
  specialForRadius,
  takeableIn,
} from './blast.js';
import { chargeForWave } from './meter.js';
import { scoreForFire } from './score.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Color} Color */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./constants.js').Special} Special */
/** @typedef {import('./blast.js').HookOrientation} HookOrientation */

/**
 * One firing. `sources` names the specials it consumed, which is what the meter charges for: a
 * combo is one step that consumed two.
 * @typedef {Object} FireOrder
 * @property {'blast'|'rip'} type
 * @property {Pos} pos
 * @property {Special} [special]
 * @property {number|null} [radius]
 * @property {HookOrientation|null} [orientation]
 * @property {Color|null} [color]
 * @property {Special[]} sources
 * @property {boolean} combo
 */

const at = (pos) => ({ x: pos.x, y: pos.y });

/** @returns {FireOrder} */
const blastOrder = (pos, special, radius, orientation, sources, combo = false) => ({
  type: 'blast',
  pos: at(pos),
  special,
  radius,
  orientation,
  sources,
  combo,
});

/** @returns {FireOrder} */
const ripOrder = (pos, color, combo = false) => ({
  type: 'rip',
  pos: at(pos),
  color,
  sources: [],
  combo,
});

/** A horizontal swap sweeps rows, a vertical one columns (§4). @returns {HookOrientation} */
const axisOrientation = (a, b) => (a.y === b.y ? 'rows' : 'cols');

/**
 * What a piece fires with where it sits: a chain, a tap, a lone swap or a match. Null for a
 * plain ball, a bead or an empty cell.
 * @param {Board} board
 * @param {Pos} pos
 * @param {Piece} [piece]
 * @param {{ orientation?: HookOrientation, color?: Color }} [options]
 * @returns {FireOrder|null}
 */
export const orderFor = (board, pos, piece, options = {}) => {
  if (piece === undefined) return null;
  if (piece.kind === 'frog') {
    const color =
      options.color === undefined ? (mostCommonColors(board, 1)[0] ?? null) : options.color;
    return ripOrder(pos, color);
  }
  if (piece.special === undefined) return null;
  if (piece.special === 'hook') {
    return blastOrder(pos, 'hook', null, options.orientation ?? 'rows', ['hook']);
  }
  return blastOrder(pos, piece.special, BLAST_RADII[piece.special], null, [piece.special]);
};

const isFrog = (piece) => piece !== undefined && piece.kind === 'frog';
const isBlast = (piece) =>
  piece !== undefined && piece.special !== undefined && piece.special !== 'hook';
const isHook = (piece) => piece !== undefined && piece.special === 'hook';

/**
 * What a swap sets off, read after the pieces have been exchanged so each is where it landed.
 * Combos centre on `b`, the cell the player swiped into (§4); a lone special fires where it
 * landed.
 * @param {Board} board
 * @param {Pos} a
 * @param {Pos} b
 * @returns {FireOrder[]}
 */
export const swapOrders = (board, a, b) => {
  const pa = pieceAt(board, a);
  const pb = pieceAt(board, b);
  const orientation = axisOrientation(a, b);

  if (isFrog(pa) && isFrog(pb)) {
    const colors = mostCommonColors(board, 2);
    return [
      ripOrder(b, colors[0] ?? null, true),
      ripOrder(a, colors[1] ?? colors[0] ?? null, true),
    ];
  }
  if (isBlast(pa) && isBlast(pb)) {
    const radius = comboRadius(pa.special, pb.special);
    return [blastOrder(b, specialForRadius(radius), radius, null, [pa.special, pb.special], true)];
  }
  if (isHook(pa) && isHook(pb)) {
    return [blastOrder(b, 'hook', null, 'both', ['hook', 'hook'], true)];
  }
  if ((isHook(pa) && isBlast(pb)) || (isBlast(pa) && isHook(pb))) {
    const blast = isBlast(pa) ? pa : pb;
    return [
      blastOrder(b, 'hook', null, orientation, ['hook'], true),
      blastOrder(b, blast.special, BLAST_RADII[blast.special], null, [blast.special], true),
    ];
  }
  // the frog with a special: the special fires from the swap cell, the frog rips where it stands
  for (const [frogPos, frogPiece, otherPiece] of [
    [a, pa, pb],
    [b, pb, pa],
  ]) {
    if (!isFrog(frogPiece)) continue;
    if (isHook(otherPiece)) {
      return [
        blastOrder(b, 'hook', null, orientation, ['hook'], true),
        ripOrder(frogPos, mostCommonColors(board, 1)[0] ?? null, true),
      ];
    }
    if (isBlast(otherPiece)) {
      return [
        blastOrder(
          b,
          otherPiece.special,
          BLAST_RADII[otherPiece.special],
          null,
          [otherPiece.special],
          true,
        ),
        ripOrder(frogPos, mostCommonColors(board, 1)[0] ?? null, true),
      ];
    }
    // with a plain ball the frog rips that ball's colour (§4); with anything else, the board's
    const color =
      otherPiece !== undefined && otherPiece.kind === 'yarn'
        ? otherPiece.color
        : (mostCommonColors(board, 1)[0] ?? null);
    return [ripOrder(frogPos, color)];
  }
  // one special and a plain piece: it fires from the cell it landed on
  for (const [pos, piece] of [
    [a, pa],
    [b, pb],
  ]) {
    const order = orderFor(board, pos, piece, { orientation });
    if (order !== null) return [order];
  }
  return [];
};

/**
 * What a double-tap sets off: whatever is under the finger, with the Hook sweeping rows (§4).
 * @param {Board} board @param {Pos} pos @returns {FireOrder[]}
 */
export const tapOrders = (board, pos) => {
  const order = orderFor(board, pos, pieceAt(board, pos), { orientation: 'rows' });
  return order === null ? [] : [order];
};

/**
 * Specials sitting on cells a match is about to clear. `skip` holds the position keys the swap
 * already seeded, so a swapped special that is also part of the match it made fires only once.
 * Read before the clear removes anything: afterwards the pieces are gone.
 * @param {Board} board @param {Pos[]} cells @param {Set<string>} skip @returns {FireOrder[]}
 */
export const matchOrders = (board, cells, skip) => {
  const orders = [];
  for (const pos of cells) {
    if (skip.has(posKey(pos))) continue;
    const order = orderFor(board, pos, pieceAt(board, pos));
    if (order !== null) orders.push(order);
  }
  return orders;
};

/** What a blast covered, for phase 4's blocker damage: the area, not just what it took. */
/** @typedef {{ pos: Pos, area: Pos[], cells: Pos[] }} BlastInfo */

/**
 * Play a wave of firings breadth-first until nothing is left to fire.
 * @param {object} ctx  the resolve context; uses `board` and `addScore`
 * @param {FireOrder[]} seeds  never mutated
 * @param {number} cascade
 * @param {{ maxWaves?: number }} [options]
 * @returns {{ steps: object[], charge: number, blasts: BlastInfo[], cells: Pos[],
 *   removed: import('./constants.js').Removed[] }}
 */
export const runFire = (ctx, seeds, cascade, { maxWaves = MAX_BLAST_WAVES } = {}) => {
  const { board, addScore } = ctx;
  const steps = [];
  const blasts = [];
  const taken = [];
  // What left and from where, for phase 4's collect goals, stitch squares and knot credit.
  const removed = [];
  let charge = 0;
  let frontier = seeds.slice();
  let wave = 0;
  // A piece fires at most once: keyed by identity, because a cell emptied by one firing can be
  // filled again by a special this same cascade created on it.
  const fired = new Set();
  for (const order of seeds) {
    const piece = pieceAt(board, order.pos);
    if (piece !== undefined) fired.add(piece);
  }

  while (frontier.length > 0) {
    wave += 1;
    if (wave > maxWaves) {
      throw new Error(`fire: more than ${maxWaves} blast waves in one cascade`);
    }
    const next = [];
    for (const order of frontier) {
      const area =
        order.type === 'blast' ? blastArea(board, order) : ripArea(board, order.color, order.pos);
      const cells = takeableIn(board, area);
      const pieces = cells.map((pos) => pieceAt(board, pos));
      const points = scoreForFire(order, pieces, cascade);
      addScore(points);
      steps.push(
        order.type === 'blast'
          ? {
              type: 'blast',
              pos: at(order.pos),
              special: order.special,
              radius: order.radius,
              orientation: order.orientation,
              cells: cells.map(at),
              cascade,
              points,
              combo: order.combo,
            }
          : {
              type: 'frogRip',
              pos: at(order.pos),
              color: order.color,
              cells: cells.map(at),
              cascade,
              points,
              combo: order.combo,
            },
      );
      if (order.type === 'blast') blasts.push({ pos: at(order.pos), area, cells: cells.map(at) });
      cells.forEach((pos, i) => {
        taken.push(at(pos));
        removed.push({ pos: at(pos), piece: pieces[i] });
        removePiece(board, pos);
        const piece = pieces[i];
        if (fired.has(piece)) return;
        const chained = orderFor(board, pos, piece);
        if (chained === null) return;
        fired.add(piece);
        next.push(chained);
      });
    }
    charge += chargeForWave(frontier);
    frontier = next;
  }
  return { steps, charge, blasts, cells: taken, removed };
};
