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
import { isLegalSwap, listValidMoves } from './moves.js';
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
  let status = 'playing';

  const ctx = {
    board,
    runs,
    spawnerKeys,
    spawnPiece: () => ({ kind: 'yarn', color: pickColor(level.colors, level.weights, rng) }),
    addScore: (points) => {
      score += points;
    },
  };

  const meterState = () =>
    level.meter === 'none' ? { kind: 'none' } : { kind: level.meter, charge: 0, full: METER_FULL };

  const state = () => ({
    board: cloneBoard(board),
    moves,
    score,
    coins: level.coins,
    meter: meterState(),
    goals: level.goals.map((g) => ({ ...g })),
    status,
    level: { id: level.id, name: level.name },
  });

  const toPos = (raw, label) => {
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !Number.isInteger(raw.x) ||
      !Number.isInteger(raw.y)
    ) {
      throw new Error(`swap: ${label} must be an integer {x, y}`);
    }
    const pos = { x: raw.x, y: raw.y };
    if (!inBounds(board, pos))
      throw new Error(`swap: ${label} (${pos.x},${pos.y}) is off the board`);
    return pos;
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
    steps.push(...resolveMatches(ctx, [a, b]));
    if (moves > 0 && listValidMoves(board).length === 0) {
      shuffleBoard(board, level, rng);
      steps.push({ type: 'shuffle', board: cloneBoard(board) });
    }
    if (moves === 0) status = 'lost';
    return { steps };
  };

  const tap = () => {
    throw new Error('game.tap: not until phase 3 (specials)');
  };

  const useBooster = () => {
    throw new Error('game.useBooster: not until phase 4 (boosters)');
  };

  const validMoves = () =>
    listValidMoves(board).map(([p, q]) => [
      { x: p.x, y: p.y },
      { x: q.x, y: q.y },
    ]);

  return { state, swap, tap, useBooster, validMoves };
};
