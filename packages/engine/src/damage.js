// Blocker and stitch damage (DESIGN.md §5, §6). Runs once per cascade, after everything that
// cascade removed has gone, and turns what happened into `blocker` steps.
//
// The rule is per *event*, not per cell (§5, decided 2026-09-10): a tangle loses one layer per
// match whose cells touch it and one per blast whose area covers or touches it, so a match lying
// along two sides of a tangle still strips one layer and two separate matches strip two. A frog
// rip has no area and damages nothing. A stitch square loses a layer when the piece standing on
// it leaves, and a knot is credited by a step that changes nothing: the knotted ball itself left
// through the clear or blast that took it.

import { BLOCKER_STEP_KINDS, SCORE } from './constants.js';
import { cellAt, comparePos, inBounds, posKey } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Removed} Removed */
/** @typedef {import('./match.js').Match} Match */
/** @typedef {import('./fire.js').BlastInfo} BlastInfo */

/**
 * What one cascade did, as `resolveMatches` hands it to the hook.
 * @typedef {Object} DamageInfo
 * @property {number} cascade
 * @property {Match[]} matches   the individual matches, because damage is per match
 * @property {BlastInfo[]} blasts  each firing's full area, blockers included
 * @property {Pos[]} blasted     every cell the firings took
 * @property {Removed[]} removed  every piece that left, with where it stood
 */

/** In-bounds orthogonal neighbours: up, left, right, down. @returns {Pos[]} */
export const orthogonalNeighbours = (board, pos) => {
  const cells = [];
  for (const next of [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
  ]) {
    if (inBounds(board, next)) cells.push(next);
  }
  return cells;
};

/**
 * The tangles and moths one event touches: the blockers among `cells` themselves (a blast covers
 * them) and those orthogonally beside one. Each named once, row-major.
 * @param {Board} board
 * @param {Pos[]} cells
 * @returns {Pos[]}
 */
export const touchedBlockers = (board, cells) => {
  const seen = new Set();
  const found = [];
  for (const cell of cells) {
    for (const pos of [cell, ...orthogonalNeighbours(board, cell)]) {
      const key = posKey(pos);
      if (seen.has(key)) continue;
      const target = cellAt(board, pos);
      if (target.tangle > 0 || target.moth === true) {
        seen.add(key);
        found.push({ x: pos.x, y: pos.y });
      }
    }
  }
  found.sort(comparePos);
  return found;
};

const blockerStep = (pos, kind, layersLeft, points) => ({
  type: 'blocker',
  pos: { x: pos.x, y: pos.y },
  kind,
  layersLeft,
  points,
});

/**
 * Applies a cascade's damage and returns the steps that describe it, one per layer lost, sorted
 * row-major, then by kind, then by layers remaining.
 * @param {Board} board  mutated
 * @param {DamageInfo} info
 * @returns {object[]}
 */
export const applyDamage = (board, info) => {
  const hits = new Map();
  const hit = (cells) => {
    for (const pos of touchedBlockers(board, cells)) {
      const key = posKey(pos);
      const entry = hits.get(key);
      if (entry === undefined) hits.set(key, { pos, count: 1 });
      else entry.count += 1;
    }
  };
  for (const match of info.matches) hit(match.cells);
  for (const blast of info.blasts) hit(blast.area);

  const steps = [];
  for (const { pos, count } of hits.values()) {
    const cell = cellAt(board, pos);
    const isTangle = cell.tangle > 0;
    const layers = isTangle ? cell.tangle : 1;
    const lost = Math.min(count, layers);
    for (let i = 1; i <= lost; i += 1) {
      const layersLeft = layers - i;
      const step = blockerStep(pos, isTangle ? 'tangle' : 'moth', layersLeft, SCORE.blockerLayer);
      if (isTangle && layersLeft === 0 && cell.buried === true) step.buried = true;
      steps.push(step);
    }
    if (lost === 0) continue;
    if (isTangle) {
      const left = layers - lost;
      if (left > 0) cell.tangle = left;
      else {
        delete cell.tangle;
        // The button comes out with the last layer; a bare `buried` has no board state left.
        delete cell.buried;
      }
    } else {
      delete cell.moth;
    }
  }

  for (const { pos, piece } of info.removed) {
    if (piece !== undefined && piece.knotted === true) {
      steps.push(blockerStep(pos, 'knot', 0, SCORE.blockerLayer));
    }
    const cell = cellAt(board, pos);
    if (cell.stitch > 0) {
      const layersLeft = cell.stitch - 1;
      if (layersLeft > 0) cell.stitch = layersLeft;
      else delete cell.stitch;
      steps.push(blockerStep(pos, 'stitch', layersLeft, SCORE.stitch));
    }
  }

  steps.sort(
    (a, b) =>
      comparePos(a.pos, b.pos) ||
      BLOCKER_STEP_KINDS.indexOf(a.kind) - BLOCKER_STEP_KINDS.indexOf(b.kind) ||
      b.layersLeft - a.layersLeft,
  );
  return steps;
};
