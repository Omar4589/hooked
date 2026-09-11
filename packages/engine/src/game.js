// createGame: the engine's public entry point (DESIGN.md §11). One mutable board lives in the
// closure; state() and every step payload are snapshots.

import { METER_FULL } from './constants.js';
import { normalizeLevel } from './level.js';
import { createRng } from './rng.js';
import {
  columnRuns,
  posKey,
  cloneBoard,
  inBounds,
  isAdjacent,
  samePos,
  swapPieces,
} from './board.js';
import { generateBoard, shuffleBoard, pickColor } from './generate.js';
import { clonePiece, pieceAt, setPiece } from './board.js';
import { isDeadBoard, isLegalSwap, listValidMoves } from './moves.js';
import { swapOrders, tapOrders } from './fire.js';
import { dropCandidates, dropPiece, meterState } from './meter.js';
import { resolveMatches } from './resolve.js';

/** @typedef {import('./constants.js').Pos} Pos */

/**
 * @typedef {Object} Game
 * @property {() => object} state
 * @property {(a: Pos, b: Pos) => { steps: object[] }} swap
 * @property {(pos: Pos) => never} tap            phase 3
 * @property {(name: string, pos: Pos) => never} useBooster  phase 4
 * @property {() => [Pos, Pos][]} validMoves
 */

/**
 * @param {object} levelJson  a parsed level file (DESIGN.md §10)
 * @param {number|string} seed
 * @returns {Game}
 */
export const createGame = (levelJson, seed) => {
  const level = normalizeLevel(levelJson);
  const rng = createRng(seed);
  const runs = columnRuns({ width: level.width, height: level.height, cells: level.grid });
  const spawnerKeys = new Set(level.spawners.map(posKey));
  const board = generateBoard(level, rng);
  let moves = level.moves;
  let score = 0;
  let charge = 0;
  let status = 'playing';

  const ctx = {
    board,
    runs,
    spawnerKeys,
    spawnPiece: () => ({ kind: 'yarn', color: pickColor(level.colors, level.weights, rng) }),
    addScore: (points) => {
      score += points;
    },
    // null on a level with no meter, so resolve.js needs to know no meter policy at all.
    addCharge: (n) => {
      if (level.meter === 'none') return null;
      charge += n;
      return charge;
    },
  };

  const state = () => ({
    board: cloneBoard(board),
    moves,
    score,
    coins: level.coins,
    meter: meterState(level.meter, charge),
    goals: level.goals.map((g) => ({ ...g })),
    status,
    level: { id: level.id, name: level.name },
  });

  const toPos = (raw, label, caller = 'swap') => {
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !Number.isInteger(raw.x) ||
      !Number.isInteger(raw.y)
    ) {
      throw new Error(`${caller}: ${label} must be an integer {x, y}`);
    }
    const pos = { x: raw.x, y: raw.y };
    if (!inBounds(board, pos))
      throw new Error(`${caller}: ${label} (${pos.x},${pos.y}) is off the board`);
    return pos;
  };

  /**
   * What happens once a move's cascades have settled: a full meter drops its piece, and a board
   * the player cannot act on is shuffled. Shared by swap and tap.
   * @returns {object[]}
   */
  const finishMove = () => {
    const steps = [];
    if (level.meter !== 'none' && charge >= METER_FULL) {
      const candidates = dropCandidates(board);
      if (candidates.length > 0) {
        const pos = rng.pick(candidates);
        const piece = dropPiece(level.meter, pieceAt(board, pos));
        setPiece(board, pos, piece);
        charge = 0;
        steps.push({ type: 'meterDrop', pos: { x: pos.x, y: pos.y }, piece: clonePiece(piece) });
      }
    }
    if (moves > 0 && isDeadBoard(board)) {
      shuffleBoard(board, level, rng);
      steps.push({ type: 'shuffle', board: cloneBoard(board) });
    }
    return steps;
  };

  const swap = (rawA, rawB) => {
    const a = toPos(rawA, 'a');
    const b = toPos(rawB, 'b');
    if (samePos(a, b)) throw new Error('swap: a and b are the same cell');
    if (!isAdjacent(a, b)) throw new Error('swap: a and b are not adjacent');
    if (status !== 'playing') return { steps: [] };
    const legal = isLegalSwap(board, a, b);
    const steps = [{ type: 'swap', a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, illegal: !legal }];
    if (!legal) return { steps };
    swapPieces(board, a, b);
    moves -= 1;
    // read after the exchange, so each piece is where it landed
    steps.push(...resolveMatches(ctx, [a, b], swapOrders(board, a, b)));
    steps.push(...finishMove());
    if (moves === 0) status = 'lost';
    return { steps };
  };

  /**
   * A double-tap fires a special or the frog in place (DESIGN.md §4), spending a move. A tap on
   * anything else costs nothing and returns no steps.
   * @param {Pos} rawPos
   * @returns {{ steps: object[] }}
   */
  const tap = (rawPos) => {
    const pos = toPos(rawPos, 'pos', 'tap');
    if (status !== 'playing') return { steps: [] };
    const orders = tapOrders(board, pos);
    if (orders.length === 0) return { steps: [] };
    moves -= 1;
    const steps = resolveMatches(ctx, [], orders);
    steps.push(...finishMove());
    if (moves === 0) status = 'lost';
    return { steps };
  };

  const useBooster = () => {
    throw new Error('game.useBooster: not until phase 4 (boosters)');
  };

  const validMoves = (options) =>
    listValidMoves(board, options).map(([p, q]) => [
      { x: p.x, y: p.y },
      { x: q.x, y: q.y },
    ]);

  return { state, swap, tap, useBooster, validMoves };
};
