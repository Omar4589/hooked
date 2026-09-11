// Scoring (DESIGN.md §7): cleared yarn × cascade multiplier, flat bonuses for created specials.

import { SCORE, MAX_CASCADE_MULTIPLIER } from './constants.js';

/** ×1 for the swap's own matches, then ×2, ×3 … capped. @param {number} cascade 1-based */
export const multiplierFor = (cascade) => Math.min(Math.max(cascade, 1), MAX_CASCADE_MULTIPLIER);

/**
 * @param {{ cleared: unknown[], created: { piece: object }[], cascade: number }} clear
 * @returns {number}
 */
export const scoreForClear = ({ cleared, created, cascade }) =>
  cleared.length * SCORE.yarn * multiplierFor(cascade) +
  created.reduce(
    (sum, c) => sum + (SCORE[c.piece.special] === undefined ? 0 : SCORE[c.piece.special]),
    0,
  );

/**
 * What one firing scores: every yarn ball it took at the cascade's multiplier, plus the flat
 * frog-rip bonus (§7). The frog itself, and any bead the area skipped, score nothing.
 * @param {{ type: 'blast'|'rip' }} order
 * @param {{ kind: string }[]} taken  the pieces the firing removed
 * @param {number} cascade
 * @returns {number}
 */
export const scoreForFire = (order, taken, cascade) => {
  let balls = 0;
  for (const piece of taken) {
    if (piece.kind === 'yarn') balls += 1;
  }
  return balls * SCORE.yarn * multiplierFor(cascade) + (order.type === 'rip' ? SCORE.frogRip : 0);
};
