// The view model: the engine's board plus a stable id per piece, so a falling ball keeps its
// identity (and its React element) instead of being re-keyed by cell.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard } from '@hooked/engine';
import {
  buildModel,
  cellEntries,
  cellsOf,
  cloneModel,
  describeDrift,
  inModel,
  inPlay,
  piecesOf,
  projectCells,
  projectPieces,
  stitchPattern,
} from './model.js';

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

test('the model carries the cell layer, and it matches the engine board', () => {
  const board = parseBoard(['#2 x2', '@. o.'], ['. .', '. 1']);
  const model = buildModel(board);
  assert.deepEqual(model.tangle, [
    [2, 2],
    [0, 0],
  ]);
  assert.deepEqual(model.moth, [
    [false, false],
    [true, false],
  ]);
  assert.deepEqual(model.stitch, [
    [0, 0],
    [0, 1],
  ]);
  assert.deepEqual(model.buried, [
    [false, true],
    [false, false],
  ]);
  assert.deepEqual(projectCells(model), cellsOf(board));
});

test('cloneModel copies the layers a move can change and shares the ones it cannot', () => {
  const model = buildModel(parseBoard(['#2 o.', 'o. o.']));
  const copy = cloneModel(model);
  copy.tangle[0][0] = 0;
  copy.moth[0][1] = true;
  copy.stitch[1][1] = 2;
  copy.buried[0][0] = true;
  assert.equal(model.tangle[0][0], 2);
  assert.equal(model.moth[0][1], false);
  assert.equal(model.stitch[1][1], 0);
  assert.equal(model.buried[0][0], false);
  assert.equal(copy.open, model.open); // holes are fixed for the level
  assert.equal(copy.runTop, model.runTop);
});

test('describeDrift catches a layer the screen has wrong, not just a piece', () => {
  const model = buildModel(parseBoard(['#2 o.']));
  assert.match(describeDrift(model, parseBoard(['#1 o.'])), /\(0,0\)/);
  assert.match(describeDrift(model, parseBoard(['#1 o.'])), /tangle 2.*tangle 1/s);
  assert.match(describeDrift(buildModel(parseBoard(['@. o.'])), parseBoard(['__ o.'])), /moth/);
  const stitched = buildModel(parseBoard(['o. o.'], ['1 .']));
  assert.match(describeDrift(stitched, parseBoard(['o. o.'])), /olive on stitch 1/);
  assert.equal(describeDrift(stitched, parseBoard(['o. o.'], ['1 .'])), null);
});

test('describeDrift still stops at five lines with the cell layer in the mix', () => {
  const rows = ['#1 #1 #1', '#1 #1 #1', '#1 #1 #1'];
  const model = buildModel(parseBoard(rows));
  const drift = describeDrift(model, parseBoard(['__ __ __', '__ __ __', '__ __ __']));
  assert.equal(drift.split('\n').length, 5);
});

test('inPlay is the engine canSwap for one cell: a knot, a tangle and a moth are not in play', () => {
  const model = buildModel(parseBoard(['o. oK #1', '@. __ ..']));
  assert.equal(inPlay(model, { x: 0, y: 0 }), true);
  for (const pos of [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 9, y: 9 },
  ]) {
    assert.equal(inPlay(model, pos), false, `${pos.x},${pos.y}`);
  }
});

test('stitchPattern remembers the squares the engine forgets once they are stitched', () => {
  const start = parseBoard(['o. o.'], ['1 .']);
  const pattern = stitchPattern(start);
  assert.deepEqual(pattern, [[true, false]]);
  // the engine deletes `stitch` at zero, so the pattern cannot be read off a later board
  assert.deepEqual(stitchPattern(parseBoard(['o. o.'])), [[false, false]]);
});

test('cellEntries draws the layers, the pattern and anything this move touched', () => {
  const model = buildModel(parseBoard(['#1 o.', '@. o.'], ['. 1', '. .']));
  const pattern = stitchPattern(parseBoard(['#1 o.', '@. o.'], ['. 1', '. .']));
  const keys = (tracked) => cellEntries(model, pattern, tracked).map((e) => e.key);
  assert.deepEqual(keys(new Map()), ['0,0', '1,0', '0,1']);
  // a tangle that has just faded to nothing is gone from the model but still has an animation
  const cleared = buildModel(parseBoard(['__ o.', '@. o.']));
  assert.deepEqual(
    cellEntries(cleared, pattern, new Map()).map((e) => e.key),
    ['1,0', '0,1'],
  );
  assert.deepEqual(
    cellEntries(cleared, pattern, new Map([['0,0', {}]])).map((e) => e.key),
    ['0,0', '1,0', '0,1'],
  );
  const entry = cellEntries(model, pattern, new Map())[0];
  assert.deepEqual(entry, {
    key: '0,0',
    x: 0,
    y: 0,
    tangle: 1,
    moth: false,
    stitch: 0,
    buried: false,
    stitched: false,
  });
});
