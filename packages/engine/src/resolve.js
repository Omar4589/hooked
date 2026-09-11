// The cascade loop (DESIGN.md §11 "Resolution loop"): find matches, clear them, place the
// specials they create, score, let pieces fall, refill, and repeat until nothing matches.
// Emits the steps the step player replays, in playback order.

import { MAX_CASCADES, METER_FULL, SCORE } from './constants.js';
import { removePiece, setPiece, clonePiece, comparePos, posKey } from './board.js';
import { findMatches, specialForSize, spawnCellFor } from './match.js';
import { applyGravity, refill } from './gravity.js';
import { beadsOnExits } from './beads.js';
import { matchOrders, runFire } from './fire.js';
import { scoreForClear } from './score.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./constants.js').Run} Run */

/**
 * @typedef {Object} ResolveContext
 * @property {Board} board
 * @property {Run[]} runs
 * @property {Set<string>} spawnerKeys           posKey of each spawner
 * @property {(pos: Pos) => Piece} spawnPiece   injected so tests can script refills
 * @property {(points: number) => void} addScore
 * @property {Set<string>} [exitKeys]           posKey of each exit; without it beads never leave
 * @property {(cleared: Pos[], info: import('./damage.js').DamageInfo) => object[]} [damage]
 *   blocker and stitch damage; returns the steps emitted between the meter and the fall
 */

/**
 * Resolves a move: whatever the swap or tap set off, every match it makes, and everything those
 * cascade into. Steps never share objects with the board: pieces are cloned at emission,
 * positions are fresh.
 * @param {ResolveContext} ctx
 * @param {Pos[]} [swapped]  the two swapped cells; used for cascade 1 only
 * @param {import('./fire.js').FireOrder[]} [fire]  what the swap or tap fires, cascade 1 only
 * @returns {object[]}
 */
export const resolveMatches = (ctx, swapped = [], fire = []) => {
  const {
    board,
    runs,
    spawnerKeys,
    exitKeys = new Set(),
    spawnPiece,
    addScore,
    damage,
    addCharge,
  } = ctx;
  const steps = [];
  let pending = fire;
  let cascade = 1;
  for (;;) {
    // A bead that reached its exit leaves before anything else this cascade, so the column above
    // it falls in the same breath (§6).
    const exits = beadsOnExits(board, exitKeys);
    const matches = findMatches(board);
    if (matches.length === 0 && pending.length === 0 && exits.length === 0) break;
    if (cascade > MAX_CASCADES) {
      const hint = "check the level's colors and weights";
      throw new Error(`resolve: more than ${MAX_CASCADES} cascades in one move; ${hint}`);
    }
    for (const pos of exits) {
      removePiece(board, pos);
      addScore(SCORE.bead);
      steps.push({ type: 'beadExit', pos: { x: pos.x, y: pos.y }, points: SCORE.bead });
    }
    const seeds = pending.slice();
    pending = [];
    const seen = new Set();
    const cleared = [];
    for (const m of matches) {
      for (const p of m.cells) {
        if (!seen.has(posKey(p))) {
          seen.add(posKey(p));
          cleared.push({ x: p.x, y: p.y });
        }
      }
    }
    cleared.sort(comparePos);
    const removed = [];
    const created = [];
    for (const m of matches) {
      const special = specialForSize(m.size);
      if (special === null) continue;
      const pos = spawnCellFor(m, cascade === 1 ? swapped : []);
      created.push({ pos, piece: { kind: 'yarn', color: m.color, special } });
    }
    if (matches.length > 0) {
      const points = scoreForClear({ cleared, created, cascade });
      addScore(points);
      steps.push({
        type: 'clear',
        cells: cleared.map((p) => ({ x: p.x, y: p.y })),
        created: created.map((c) => ({
          pos: { x: c.pos.x, y: c.pos.y },
          piece: clonePiece(c.piece),
        })),
        cascade,
        points,
      });
      // A special caught in a match fires, but it has to be read while it is still standing
      // there: the clear removes it, and the special this match creates often lands on that
      // very cell. The firing itself still happens after the clear step.
      const skip = new Set(seeds.map((order) => posKey(order.pos)));
      seeds.push(...matchOrders(board, cleared, skip));
      for (const p of cleared)
        removed.push({ pos: { x: p.x, y: p.y }, piece: removePiece(board, p) });
      for (const c of created) setPiece(board, c.pos, clonePiece(c.piece));
    }
    const fired = runFire(ctx, seeds, cascade);
    steps.push(...fired.steps);
    removed.push(...fired.removed);
    if (fired.charge > 0 && addCharge !== undefined) {
      const charge = addCharge(fired.charge);
      if (charge !== null) steps.push({ type: 'meter', charge, full: METER_FULL });
    }
    if (damage !== undefined) {
      steps.push(
        ...damage(cleared, {
          cascade,
          matches,
          blasts: fired.blasts,
          blasted: fired.cells,
          removed,
        }),
      );
    }
    const moves = applyGravity(board, runs);
    if (moves.length > 0) steps.push({ type: 'fall', moves });
    const spawned = refill(board, runs, spawnerKeys, spawnPiece);
    if (spawned.length > 0) steps.push({ type: 'spawn', cells: spawned });
    cascade += 1;
  }
  return steps;
};
