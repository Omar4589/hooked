// Board geometry against a measured arena (DESIGN.md §11: never the window), plus the
// hit-test the pan worklet uses.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_PAD, cellAt, fitBoard } from './geometry.js';

const board9 = { width: 9, height: 9 };

test('an unmeasured or tiny arena has no layout, so the board renders nothing', () => {
  assert.equal(fitBoard({ width: 0, height: 0 }, board9), null);
  assert.equal(fitBoard({ width: 20, height: 20 }, board9), null);
});

test('a phone in landscape gets an integer cell and a square board', () => {
  const l = fitBoard({ width: 734, height: 372 }, board9);
  assert.deepEqual(l, { cell: 39, width: 351, height: 351, columns: 9, rows: 9 });
  for (const v of Object.values(l)) assert.ok(Number.isInteger(v));
});

test('fractional layout sizes still give integers, and the board fits inside the padding', () => {
  const l = fitBoard({ width: 733.6, height: 371.2 }, board9);
  assert.ok(Number.isInteger(l.cell) && Number.isInteger(l.height));
  assert.ok(l.height + 2 * BOARD_PAD <= 371.2);
});

test('an iPad arena gets a much larger cell from the same function', () => {
  assert.equal(fitBoard({ width: 1194, height: 790 }, board9).cell, 86);
});

test('a tall narrow board is limited by the arena height', () => {
  const l = fitBoard({ width: 734, height: 372 }, { width: 5, height: 9 });
  assert.deepEqual(l, { cell: 39, width: 195, height: 351, columns: 5, rows: 9 });
});

test('cellAt maps a board-frame point to a cell and rejects everything outside', () => {
  const l = fitBoard({ width: 734, height: 372 }, board9);
  const at = (x, y) => cellAt(x, y, l.cell, l.columns, l.rows);
  assert.deepEqual(at(0, 0), { x: 0, y: 0 });
  assert.deepEqual(at(l.cell * 3 + 1, l.cell * 4 + 38), { x: 3, y: 4 });
  assert.deepEqual(at(l.width - 0.01, l.height - 0.01), { x: 8, y: 8 });
  assert.equal(at(l.width, 0), null);
  assert.equal(at(0, l.height), null);
  assert.equal(at(-1, 5), null);
  assert.equal(at(5, -1), null);
});

test('cellAt carries the worklet directive: the gesture calls it on the UI thread', () => {
  assert.ok(cellAt.toString().includes("'worklet'"));
});
