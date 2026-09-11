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
