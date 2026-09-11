// Swipe to swap (docs/DESIGN.md §11 "Gesture Handler pan -> swipe direction -> game.swap").
// swipeDirection and neighbor run on the UI thread inside the pan; swipeTarget runs on the JS
// side, where the view model lives.

import { inPlay } from './model.js';

/** @typedef {'up'|'down'|'left'|'right'} Direction */

/**
 * How far the finger travels before a swipe counts: a quarter of a cell, never below the pan's
 * own activation slop and never a long drag. Phone cells are around 39pt, iPad ones 86.
 * @param {number} cell
 * @returns {number}
 */
export const swipeThreshold = (cell) => Math.min(24, Math.max(10, Math.round(cell / 4)));

/**
 * The dominant axis of the finger's travel, or null if it has not moved at all. A tie reads as
 * horizontal rather than guessing.
 * @param {number} dx
 * @param {number} dy
 * @returns {Direction|null}
 */
export const swipeDirection = (dx, dy) => {
  'worklet';
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
};

/**
 * The cell a direction points at. y grows downward on screen and in the engine alike.
 * @param {{ x: number, y: number }} pos
 * @param {Direction} dir
 */
export const neighbor = (pos, dir) => {
  'worklet';
  if (dir === 'up') return { x: pos.x, y: pos.y - 1 };
  if (dir === 'down') return { x: pos.x, y: pos.y + 1 };
  if (dir === 'left') return { x: pos.x - 1, y: pos.y };
  return { x: pos.x + 1, y: pos.y };
};

/**
 * Where a swipe would swap to, or null when there is nothing to swap with: off the board, a
 * hole, an empty cell, a blocker, or a knotted ball that cannot move. Those are ignored without
 * troubling the engine; everything else goes to `game.swap`, which answers with an illegal step
 * when the swap makes nothing.
 * @param {import('./model.js').Model} model
 * @param {{ x: number, y: number }} from
 * @param {Direction} dir
 * @returns {{ x: number, y: number }|null}
 */
export const swipeTarget = (model, from, dir) => {
  const to = neighbor(from, dir);
  return inPlay(model, to) ? to : null;
};
