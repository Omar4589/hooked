// createGame: the engine's public entry point (DESIGN.md §11). One mutable board lives in the
// closure; state() and every step payload are snapshots.

import { METER_FULL, SCORE } from './constants.js';
import { normalizeLevel } from './level.js';
import { createRng } from './rng.js';
import {
  columnRuns,
  posKey,
  cloneBoard,
  findPiece,
  inBounds,
  isAdjacent,
  samePos,
  swapPieces,
} from './board.js';
import { generateBoard, shuffleBoard, pickColor } from './generate.js';
import { clonePiece, pieceAt, setPiece } from './board.js';
import { isDeadBoard, isLegalSwap, listValidMoves } from './moves.js';
import { orderFor, swapOrders, tapOrders } from './fire.js';
import { dropCandidates, dropPiece, meterState } from './meter.js';
import { applyDamage } from './damage.js';
import { emptySpawnerTops, isBeadDue } from './beads.js';
import { allGoalsMet, createGoals, creditRemoved, creditSteps, snapshotGoals } from './goals.js';
import { spreadMoth } from './moth.js';
import { placeYarnOver } from './yarnover.js';
import { resolveMatches } from './resolve.js';

/** @typedef {import('./constants.js').Pos} Pos */

/**
 * @typedef {Object} Game
 * @property {() => object} state
 * @property {(a: Pos, b: Pos) => { steps: object[] }} swap
 * @property {(pos: Pos) => { steps: object[] }} tap
 * @property {(name: string, pos: Pos) => never} useBooster  phase 6
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
  const exitKeys = new Set(level.exits.map(posKey));
  const board = generateBoard(level, rng);
  const goals = createGoals(level, board);
  let moves = level.moves;
  let score = 0;
  let charge = 0;
  let status = 'playing';
  /** Yarn Over's payout, on top of the level's base coins (§7). */
  let earned = 0;
  /** Per-move bookkeeping: a moth only spreads on a move that cleared none (§5). */
  let mothCleared = false;
  /** Beads owed by the schedule but not yet dropped, and where this move's is going (§6). */
  let beadsDue = 0;
  let beadsSpawned = 0;
  let beadTarget = null;
  let beadDrawn = false;
  /** While the win bonus fires: no drop, no spread, no scheduled bead. */
  let yarningOver = false;

  const ctx = {
    board,
    runs,
    spawnerKeys,
    exitKeys,
    // The refill, with the scheduled bead folded in: the first spawn of a move that owes one
    // picks among the run tops about to be filled, and that cell gets the bead instead of a
    // color draw.
    spawnPiece: (pos) => {
      if (!beadDrawn && !yarningOver && beadsDue > 0) {
        beadDrawn = true;
        const tops = emptySpawnerTops(board, level.spawners);
        if (tops.length > 0) beadTarget = rng.pick(tops);
      }
      if (beadTarget !== null && samePos(pos, beadTarget)) {
        beadTarget = null;
        beadsDue -= 1;
        beadsSpawned += 1;
        return { kind: 'bead' };
      }
      return { kind: 'yarn', color: pickColor(level.colors, level.weights, rng) };
    },
    addScore: (points) => {
      score += points;
    },
    // null on a level with no meter, so resolve.js needs to know no meter policy at all.
    addCharge: (n) => {
      if (level.meter === 'none') return null;
      charge += n;
      return charge;
    },
    damage: (cleared, info) => {
      const steps = applyDamage(board, info);
      for (const step of steps) {
        score += step.points;
        if (step.kind === 'moth') mothCleared = true;
      }
      creditRemoved(goals, info.removed);
      return steps;
    },
  };

  const state = () => ({
    board: cloneBoard(board),
    moves,
    score,
    coins: level.coins + earned,
    meter: meterState(level.meter, charge),
    goals: snapshotGoals(goals, board),
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

  /** A legal swap or a firing tap: one move gone, and the per-move bookkeeping reset. */
  const spendMove = () => {
    moves -= 1;
    mothCleared = false;
    beadDrawn = false;
    beadTarget = null;
    if (isBeadDue(level.beads, level.moves - moves, beadsSpawned + beadsDue)) beadsDue += 1;
  };

  /**
   * The win bonus (§6): every move left over becomes a Puff or a Bobble, and they go off one
   * after another, chaining into whatever they catch. A special an earlier chain already took is
   * skipped; one that fell somewhere else fires from where it landed, which is why they are
   * found by identity rather than by the cell they were placed on.
   * @returns {object[]}
   */
  const runYarnOver = () => {
    const spent = moves;
    moves = 0;
    const coins = SCORE.coinsPerMove * spent;
    earned += coins;
    const placed = placeYarnOver(board, rng, spent);
    const steps = [
      {
        type: 'yarnOver',
        specials: placed.map(({ pos, piece }) => ({
          pos: { x: pos.x, y: pos.y },
          piece: clonePiece(piece),
        })),
        coins,
        moves: spent,
      },
    ];
    yarningOver = true;
    for (const { piece } of placed) {
      const pos = findPiece(board, piece);
      if (pos === null) continue;
      const fired = resolveMatches(ctx, [], [orderFor(board, pos, piece)]);
      creditSteps(goals, fired);
      steps.push(...fired);
    }
    yarningOver = false;
    return steps;
  };

  /**
   * What happens once a move's cascades have settled (DESIGN.md §11 "Resolution loop"): the
   * meter drops its piece, a moth spreads unless one was cleared, then the level is won, lost,
   * or shuffled because the player cannot act. Shared by swap and tap.
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
    if (!mothCleared) {
      const spread = spreadMoth(board, rng);
      if (spread !== null) steps.push(spread);
    }
    if (allGoalsMet(goals, board)) {
      status = 'won';
      steps.push(...runYarnOver());
    } else if (moves === 0) {
      status = 'lost';
    } else if (isDeadBoard(board)) {
      try {
        shuffleBoard(board, level, rng);
        steps.push({ type: 'shuffle', board: cloneBoard(board) });
      } catch {
        // No arrangement of what is left is playable. shuffleBoard put the board back as it
        // found it, so the stream still describes it exactly; the level is simply over.
        status = 'lost';
      }
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
    spendMove();
    // read after the exchange, so each piece is where it landed
    const resolved = resolveMatches(ctx, [a, b], swapOrders(board, a, b));
    creditSteps(goals, resolved);
    steps.push(...resolved);
    steps.push(...finishMove());
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
    spendMove();
    const resolved = resolveMatches(ctx, [], orders);
    creditSteps(goals, resolved);
    const steps = [...resolved, ...finishMove()];
    return { steps };
  };

  const useBooster = () => {
    throw new Error('game.useBooster: not until phase 6 (boosters)');
  };

  const validMoves = (options) =>
    listValidMoves(board, options).map(([p, q]) => [
      { x: p.x, y: p.y },
      { x: q.x, y: q.y },
    ]);

  return { state, swap, tap, useBooster, validMoves };
};
