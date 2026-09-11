// Swipe interpretation: the dominant axis of the finger's travel picks a neighbour, and a
// target that is not a piece is ignored without ever calling the engine.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard } from '@hooked/engine';
import { buildModel } from './model.js';
import { neighbor, swipeDirection, swipeTarget, swipeThreshold } from './input.js';

test('the threshold is a quarter cell, clamped to the pan activation range', () => {
  assert.equal(swipeThreshold(40), 10);
  assert.equal(swipeThreshold(86), 22);
  assert.equal(swipeThreshold(20), 10);
  assert.equal(swipeThreshold(120), 24);
  for (const cell of [12, 39, 57, 86]) assert.ok(Number.isInteger(swipeThreshold(cell)));
});

test('the dominant axis picks the direction; a tie reads as horizontal', () => {
  assert.equal(swipeDirection(30, 5), 'right');
  assert.equal(swipeDirection(-30, 5), 'left');
  assert.equal(swipeDirection(5, 30), 'down');
  assert.equal(swipeDirection(5, -30), 'up');
  assert.equal(swipeDirection(12, -12), 'right');
  assert.equal(swipeDirection(0, 0), null);
});

test('neighbor walks the grid with y growing downward, like the engine', () => {
  assert.deepEqual(neighbor({ x: 2, y: 3 }, 'up'), { x: 2, y: 2 });
  assert.deepEqual(neighbor({ x: 2, y: 3 }, 'down'), { x: 2, y: 4 });
  assert.deepEqual(neighbor({ x: 2, y: 3 }, 'left'), { x: 1, y: 3 });
  assert.deepEqual(neighbor({ x: 2, y: 3 }, 'right'), { x: 3, y: 3 });
});

test('a swipe off the board, into a hole or into an empty cell has no target', () => {
  const model = buildModel(parseBoard(['.. o. o.', 'o. __ o.', 'o. o. o.']));
  assert.deepEqual(swipeTarget(model, { x: 1, y: 1 }, 'right'), { x: 2, y: 1 });
  assert.equal(swipeTarget(model, { x: 0, y: 1 }, 'up'), null); // hole
  assert.equal(swipeTarget(model, { x: 0, y: 1 }, 'left'), null); // off the board
  assert.equal(swipeTarget(model, { x: 0, y: 1 }, 'right'), null); // empty cell
  assert.deepEqual(swipeTarget(model, { x: 1, y: 0 }, 'right'), { x: 2, y: 0 });
});

test('the gesture helpers carry the worklet directive', () => {
  for (const fn of [swipeDirection, neighbor]) {
    assert.ok(fn.toString().includes("'worklet'"), fn.name);
  }
});
