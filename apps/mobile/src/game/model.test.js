// The view model: the engine's board plus a stable id per piece, so a falling ball keeps its
// identity (and its React element) instead of being re-keyed by cell.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard } from '@hooked/engine';
import { buildModel, describeDrift, inModel, piecesOf, projectPieces } from './model.js';

test('ids run row-major from nextId, and the model mirrors the board', () => {
  const board = parseBoard(['o. m.', 'b. r.']);
  const model = buildModel(board);
  assert.deepEqual(
    [...model.pieces.values()].map((e) => [e.id, e.x, e.y, e.piece.color]),
    [
      [1, 0, 0, 'olive'],
      [2, 1, 0, 'mustard'],
      [3, 0, 1, 'blush'],
      [4, 1, 1, 'rust'],
    ],
  );
  assert.deepEqual(model.grid, [
    [1, 2],
    [3, 4],
  ]);
  assert.equal(model.nextId, 5);
  assert.deepEqual(projectPieces(model), piecesOf(board));
});

test('holes are closed cells with no id, and empty open cells hold none either', () => {
  const model = buildModel(parseBoard(['.. o.', '__ o.']));
  assert.deepEqual(model.open, [
    [false, true],
    [true, true],
  ]);
  assert.equal(model.grid[0][0], null);
  assert.equal(model.grid[1][0], null);
  assert.equal(inModel(model, { x: 0, y: 0 }), false);
  assert.equal(inModel(model, { x: 0, y: 1 }), true);
  assert.equal(inModel(model, { x: 9, y: 0 }), false);
});

test('runTop names each cell vertical run, so a hole splits a column into two', () => {
  const model = buildModel(parseBoard(['o.', '..', 'o.', 'o.']));
  assert.deepEqual(model.runTop, [[0], [null], [2], [2]]);
});

test('pieces are copies: mutating the board afterwards never moves the view', () => {
  const board = parseBoard(['o. m.']);
  const model = buildModel(board);
  board.cells[0][0].piece.color = 'cocoa';
  assert.equal(model.pieces.get(1).piece.color, 'olive');
});

test('a rebuild carries nextId forward, so a remounted piece never reuses a live key', () => {
  const first = buildModel(parseBoard(['o. m.']));
  const second = buildModel(parseBoard(['b. r.']), first.nextId);
  const ids = (m) => [...m.pieces.keys()];
  assert.deepEqual(ids(second), [3, 4]);
  assert.equal(
    ids(first).some((id) => ids(second).includes(id)),
    false,
  );
});

test('describeDrift is silent when the view agrees with the engine', () => {
  const board = parseBoard(['o. m.', 'b. r.']);
  assert.equal(describeDrift(buildModel(board), board), null);
});

test('describeDrift names the cell and both sides for a missing, extra or altered piece', () => {
  const model = buildModel(parseBoard(['o. m.']));
  assert.match(describeDrift(model, parseBoard(['o. r.'])), /\(1,0\)/);
  assert.match(describeDrift(model, parseBoard(['o. __'])), /\(1,0\)/);
  assert.match(describeDrift(model, parseBoard(['__ m.'])), /\(0,0\)/);
  assert.match(describeDrift(model, parseBoard(['oP m.'])), /puff/);
});
