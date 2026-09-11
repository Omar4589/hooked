// buildMove turns one engine step stream into the whole move's timeline: what each piece does,
// when, and what the board looks like when it ends. It mirrors applySteps (packages/engine/
// src/replay.js) and is just as strict, because a silent disagreement here is a board on the
// phone that no longer matches the engine.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard } from '@hooked/engine';
import { buildModel, projectPieces } from './model.js';
import { buildMove, quietCells } from './move.js';
import { CLEAR_MS, FALL_MS, SWAP_MS } from './timings.js';

const P = (x, y) => ({ x, y });
const yarn = (color, extra = {}) => ({ kind: 'yarn', color, ...extra });
const swap = (a, b, illegal = false) => ({ type: 'swap', a, b, illegal });
const clear = (cells, created = [], cascade = 1) => ({
  type: 'clear',
  cells,
  created,
  cascade,
  points: 0,
});
const modelOf = (rows) => buildModel(parseBoard(rows));
const colors = (m) => projectPieces(m).map((row) => row.map((p) => p?.color ?? null));
const ids = (m) => [...m.pieces.keys()];

test('a legal horizontal swap slides both pieces once and spends 150 ms', () => {
  const model = modelOf(['o. m.']);
  const move = buildMove(model, [swap(P(0, 0), P(1, 0))]);
  assert.equal(move.total, SWAP_MS);
  assert.deepEqual(move.tracks.get(1).x, [{ at: 0, duration: SWAP_MS, to: 1, easing: 'inOut' }]);
  assert.deepEqual(move.tracks.get(2).x, [{ at: 0, duration: SWAP_MS, to: 0, easing: 'inOut' }]);
  assert.deepEqual(move.tracks.get(1).y, []);
  assert.deepEqual(colors(move.model), [['mustard', 'olive']]);
  assert.deepEqual(move.mounts, []);
  assert.deepEqual(move.removed, []);
});

test('a vertical swap moves on the y axis and stamps the clock base on every track', () => {
  const move = buildMove(modelOf(['o.', 'm.']), [swap(P(0, 0), P(0, 1))], 1500);
  assert.deepEqual(move.tracks.get(1).y, [{ at: 0, duration: SWAP_MS, to: 1, easing: 'inOut' }]);
  assert.deepEqual(move.tracks.get(1).x, []);
  for (const track of move.tracks.values()) assert.equal(track.base, 1500);
});

test('a fire-only swap (a special, no match) is an ordinary swap and keeps the special', () => {
  const move = buildMove(modelOf(['oP m.']), [swap(P(0, 0), P(1, 0))]);
  assert.equal(move.total, SWAP_MS);
  assert.equal(move.model.pieces.get(1).piece.special, 'puff');
  assert.equal(move.model.grid[0][1], 1);
});

test('an illegal swap slides out and bounces back, spends nothing and moves nothing', () => {
  const model = modelOf(['o. m.']);
  const move = buildMove(model, [swap(P(0, 0), P(1, 0), true)]);
  assert.equal(move.total, 240);
  assert.deepEqual(move.tracks.get(1).x, [
    { at: 0, duration: 120, to: 1, easing: 'out' },
    { at: 120, duration: 120, to: 0, easing: 'outBack' },
  ]);
  assert.deepEqual(move.tracks.get(2).x, [
    { at: 0, duration: 120, to: 0, easing: 'out' },
    { at: 120, duration: 120, to: 1, easing: 'outBack' },
  ]);
  assert.deepEqual(colors(move.model), colors(model));
});

test('an illegal swap against a hole or an empty cell animates only the piece that exists', () => {
  const hole = buildMove(modelOf(['o. ..']), [swap(P(0, 0), P(1, 0), true)]);
  assert.deepEqual([...hole.tracks.keys()], [1]);
  assert.equal(hole.total, 240);
  const empty = buildMove(modelOf(['__ m.']), [swap(P(0, 0), P(1, 0), true)]);
  assert.deepEqual([...empty.tracks.keys()], [1]);
});

test('an illegal swap between two piece-less cells is a no-op, like applySteps', () => {
  const model = modelOf(['.. __']);
  const move = buildMove(model, [swap(P(0, 0), P(1, 0), true)]);
  assert.equal(move.total, 0);
  assert.equal(move.tracks.size, 0);
  assert.deepEqual(colors(move.model), colors(model));
});

test('a swap that is not the first step, or an illegal one with company, is a broken stream', () => {
  const model = modelOf(['o. m. b.']);
  assert.throws(() => buildMove(model, [clear([P(0, 0)]), swap(P(1, 0), P(2, 0))]), /buildMove/);
  assert.throws(
    () => buildMove(model, [swap(P(0, 0), P(1, 0), true), clear([P(2, 0)])]),
    /only step/,
  );
});

test('a clear shrinks its pieces, records them as ghosts and pops the created special in', () => {
  const model = modelOf(['o. o. o. o. m.']);
  const created = [{ pos: P(3, 0), piece: yarn('olive', { special: 'puff' }) }];
  const move = buildMove(model, [
    swap(P(3, 0), P(4, 0)),
    clear([P(0, 0), P(1, 0), P(2, 0), P(3, 0)], created),
  ]);
  assert.equal(move.total, SWAP_MS + CLEAR_MS);
  const ghost = move.tracks.get(1);
  assert.deepEqual(ghost.scale, [{ at: SWAP_MS, duration: CLEAR_MS, to: 0, easing: 'in' }]);
  assert.deepEqual(ghost.opacity, [{ at: SWAP_MS, duration: CLEAR_MS, to: 0, easing: 'linear' }]);
  assert.deepEqual(
    move.removed.map((r) => [r.id, r.x, r.y, r.piece.color]),
    [
      [1, 0, 0, 'olive'],
      [2, 1, 0, 'olive'],
      [3, 2, 0, 'olive'],
      [5, 3, 0, 'mustard'],
    ],
  );
  const newId = move.mounts[0];
  assert.equal(move.tracks.get(newId).initial.scale, 0);
  assert.deepEqual(move.tracks.get(newId).scale, [
    { at: SWAP_MS, duration: CLEAR_MS, to: 1, easing: 'outBack' },
  ]);
  assert.equal(move.model.pieces.get(newId).piece.special, 'puff');
});

test('a clear of an empty cell or a created special off its clear is a broken stream', () => {
  const model = modelOf(['o. __']);
  assert.throws(() => buildMove(model, [clear([P(1, 0)])]), /holds no piece/);
  assert.throws(
    () => buildMove(model, [clear([P(0, 0)], [{ pos: P(1, 0), piece: yarn('olive') }])]),
    /cleared cells/,
  );
});

test('a fall applies as a batch, so a chain in one column lands in order', () => {
  const model = modelOf(['o.', 'm.', '__', '__']);
  const move = buildMove(model, [
    {
      type: 'fall',
      moves: [
        { from: P(0, 1), to: P(0, 3) },
        { from: P(0, 0), to: P(0, 2) },
      ],
    },
  ]);
  assert.equal(move.total, FALL_MS);
  assert.deepEqual(move.tracks.get(2).y, [{ at: 0, duration: FALL_MS, to: 3, easing: 'outBack' }]);
  assert.deepEqual(move.tracks.get(1).y, [{ at: 0, duration: FALL_MS, to: 2, easing: 'outBack' }]);
  assert.deepEqual(colors(move.model), [[null], [null], ['olive'], ['mustard']]);
});

test('a fall that is not straight down, or into a taken cell, is a broken stream', () => {
  const model = modelOf(['o. m.', '__ __']);
  const fall = (from, to) => [{ type: 'fall', moves: [{ from, to }] }];
  assert.throws(() => buildMove(model, fall(P(0, 0), P(1, 1))), /straight down/);
  assert.throws(() => buildMove(modelOf(['__', 'o.']), fall(P(0, 1), P(0, 0))), /straight down/);
  assert.throws(() => buildMove(modelOf(['o.', 'm.']), fall(P(0, 0), P(0, 1))), /occupied/);
});

test('spawns enter as a stack above the board, hidden until their fall starts', () => {
  const model = modelOf(['__ o.', '__ o.', '__ o.']);
  const move = buildMove(model, [
    {
      type: 'spawn',
      cells: [
        { pos: P(0, 0), piece: yarn('olive') },
        { pos: P(0, 1), piece: yarn('mustard') },
        { pos: P(0, 2), piece: yarn('blush') },
      ],
    },
  ]);
  const entries = move.mounts.map((id) => move.tracks.get(id).initial.y);
  assert.deepEqual(entries, [-3, -2, -1]);
  for (const id of move.mounts) {
    const track = move.tracks.get(id);
    assert.equal(track.initial.opacity, 0);
    assert.deepEqual(track.opacity, [{ at: 0, duration: 0, to: 1, easing: 'linear' }]);
    assert.equal(track.y[0].duration, FALL_MS);
  }
  assert.deepEqual(
    move.mounts.map((id) => move.model.pieces.get(id).y),
    [0, 1, 2],
  );
});

test('a run below a hole spawns from the hole cell, never through the pieces above it', () => {
  const model = modelOf(['o.', '..', '__', '__']);
  const move = buildMove(model, [
    {
      type: 'spawn',
      cells: [
        { pos: P(0, 2), piece: yarn('olive') },
        { pos: P(0, 3), piece: yarn('mustard') },
      ],
    },
  ]);
  assert.deepEqual(
    move.mounts.map((id) => move.tracks.get(id).initial.y),
    [1, 1],
  );
});

test('a cascade runs clear, then fall and spawn together, then the next cascade', () => {
  const model = modelOf(['__ __', 'o. o.']);
  const move = buildMove(model, [
    clear([P(0, 1)]),
    { type: 'fall', moves: [] },
    { type: 'spawn', cells: [{ pos: P(0, 1), piece: yarn('blush') }] },
  ]);
  const spawned = move.mounts[0];
  assert.equal(move.tracks.get(spawned).y[0].at, CLEAR_MS);
  assert.equal(move.total, CLEAR_MS + FALL_MS);
});

test('a piece that falls in two cascades gets two ordered, non-overlapping drops', () => {
  const model = modelOf(['o.', '__', '__', '__']);
  const drop = (from, to) => ({ type: 'fall', moves: [{ from, to }] });
  const move = buildMove(model, [
    clear([]),
    drop(P(0, 0), P(0, 1)),
    clear([], [], 2),
    drop(P(0, 1), P(0, 3)),
  ]);
  assert.deepEqual(move.tracks.get(1).y, [
    { at: CLEAR_MS, duration: FALL_MS, to: 1, easing: 'outBack' },
    { at: CLEAR_MS + FALL_MS + CLEAR_MS, duration: FALL_MS, to: 3, easing: 'outBack' },
  ]);
  assert.equal(move.total, CLEAR_MS + FALL_MS + CLEAR_MS + FALL_MS);
});

test('a special created by a cascade can fall in the same cascade, after it has popped in', () => {
  const model = modelOf(['o. o. o. o.', '__ __ __ __']);
  const created = [{ pos: P(0, 0), piece: yarn('olive', { special: 'puff' }) }];
  const move = buildMove(model, [
    clear([P(0, 0), P(1, 0), P(2, 0), P(3, 0)], created),
    { type: 'fall', moves: [{ from: P(0, 0), to: P(0, 1) }] },
  ]);
  const id = move.mounts[0];
  const track = move.tracks.get(id);
  assert.equal(track.scale[0].at + track.scale[0].duration, track.y[0].at);
  assert.equal(move.model.pieces.get(id).y, 1);
});

test('a piece spawned in one cascade and cleared in the next is both a mount and a ghost', () => {
  const model = modelOf(['__', 'o.']);
  const move = buildMove(model, [
    { type: 'spawn', cells: [{ pos: P(0, 0), piece: yarn('blush') }] },
    clear([P(0, 0)], [], 2),
  ]);
  const id = move.mounts[0];
  assert.deepEqual(
    move.removed.map((r) => r.id),
    [id],
  );
  assert.equal(move.model.pieces.has(id), false);
  assert.ok(move.tracks.get(id).y.length === 1 && move.tracks.get(id).scale.length === 1);
});

test('a shuffle ends the move: the board is rebuilt with fresh ids after the fade', () => {
  const model = modelOf(['o. m.', 'b. r.']);
  const snapshot = parseBoard(['r. b.', 'm. o.']);
  const move = buildMove(model, [swap(P(0, 0), P(1, 0)), { type: 'shuffle', board: snapshot }]);
  assert.equal(move.shuffle.at, SWAP_MS);
  assert.equal(move.total, SWAP_MS + 400);
  assert.deepEqual(colors(move.shuffle.before), [
    ['mustard', 'olive'],
    ['blush', 'rust'],
  ]);
  assert.deepEqual(colors(move.model), [
    ['rust', 'blush'],
    ['mustard', 'olive'],
  ]);
  assert.equal(
    ids(move.model).some((id) => ids(move.shuffle.before).includes(id)),
    false,
  );
  assert.ok(move.model.nextId > Math.max(...ids(move.model)));
  assert.throws(
    () => buildMove(model, [{ type: 'shuffle', board: snapshot }, swap(P(0, 0), P(1, 0))]),
    /last step/,
  );
});

test('an empty stream and an unknown step: nothing to play, or a loud failure', () => {
  const model = modelOf(['o. m.']);
  const move = buildMove(model, []);
  assert.equal(move.total, 0);
  assert.equal(move.tracks.size, 0);
  assert.deepEqual(colors(move.model), colors(model));
  assert.throws(() => buildMove(model, [{ type: 'mothSpread', from: P(0, 0) }]), /unsupported/);
});

test('buildMove never touches the model it was given', () => {
  const model = modelOf(['o. o. o. m.', '__ __ __ __']);
  const before = JSON.stringify([colors(model), [...model.pieces.keys()], model.nextId]);
  buildMove(model, [
    swap(P(2, 0), P(3, 0)),
    clear([P(0, 0), P(1, 0), P(3, 0)]),
    { type: 'fall', moves: [{ from: P(2, 0), to: P(2, 1) }] },
    { type: 'spawn', cells: [{ pos: P(0, 0), piece: yarn('blush') }] },
  ]);
  assert.equal(JSON.stringify([colors(model), [...model.pieces.keys()], model.nextId]), before);
});

test('quiet cells are the ones a move leaves completely alone', () => {
  const model = modelOf(['o. o. o. m.', 'b. r. __ c.']);
  const move = buildMove(model, [
    swap(P(2, 0), P(3, 0)),
    clear([P(0, 0), P(1, 0), P(3, 0)]),
    { type: 'fall', moves: [{ from: P(2, 0), to: P(2, 1) }] },
  ]);
  const quiet = quietCells(model, move);
  // row 0 was swapped, cleared and emptied; (2,1) took a falling piece
  assert.equal(quiet.has('0,0'), false);
  assert.equal(quiet.has('2,0'), false);
  assert.equal(quiet.has('3,0'), false);
  assert.equal(quiet.has('2,1'), false);
  // the rest of the bottom row never moved
  assert.deepEqual([...quiet].sort(), ['0,1', '1,1', '3,1']);
});

test('an illegal swap is not quiet where it wobbles, and a shuffle is quiet nowhere', () => {
  const model = modelOf(['o. m.', 'b. r.']);
  const illegal = quietCells(model, buildMove(model, [swap(P(0, 0), P(1, 0), true)]));
  assert.deepEqual([...illegal].sort(), ['0,1', '1,1']);
  const shuffled = buildMove(model, [
    swap(P(0, 1), P(1, 1)),
    { type: 'shuffle', board: parseBoard(['r. b.', 'm. o.']) },
  ]);
  assert.equal(quietCells(model, shuffled).size, 0);
});

test('an empty or blocked cell is never quiet: there is nothing there to swipe', () => {
  const model = modelOf(['o. __', '.. r.']);
  const quiet = quietCells(model, buildMove(model, []));
  assert.deepEqual([...quiet].sort(), ['0,0', '1,1']);
});

test('a blast swells its special, then pops the board outward from it', () => {
  const model = modelOf(['o. o. o. o. o.', 'o. o. o. o. o.', 'o. o. oP o. o.']);
  const move = buildMove(model, [
    {
      type: 'blast',
      pos: P(2, 2),
      special: 'puff',
      radius: 1,
      orientation: null,
      cells: [P(2, 1), P(1, 2), P(2, 2), P(3, 2)],
      cascade: 1,
      points: 60,
      combo: false,
    },
  ]);
  assert.equal(move.total, 150);
  const origin = move.tracks.get(model.grid[2][2]);
  assert.equal(origin.scale[0].to > 1, true); // it swells first
  assert.equal(origin.scale[0].at, 0);
  assert.equal(origin.scale[1].to, 0);
  assert.equal(origin.scale[1].at + origin.scale[1].duration, 150);
  // a neighbour pops later than the origin starts, and lands exactly as the window closes
  const neighbour = move.tracks.get(model.grid[2][1]);
  assert.ok(neighbour.scale[0].at > 0);
  assert.equal(neighbour.scale[0].at + neighbour.scale[0].duration, 150);
  assert.equal(move.removed.length, 4);
  assert.equal(move.model.pieces.size, model.pieces.size - 4);
});

test('a bigger blast shakes the board, a puff does not', () => {
  const model = modelOf(['o. o. o.', 'o. oB o.', 'o. o. o.']);
  const blast = (special) => ({
    type: 'blast',
    pos: P(1, 1),
    special,
    radius: 2,
    orientation: null,
    cells: [P(1, 1), P(0, 1)],
    cascade: 1,
    points: 40,
    combo: false,
  });
  assert.deepEqual(buildMove(model, [blast('puff')]).shakes, []);
  const shaken = buildMove(model, [blast('yarnbomb')]);
  assert.equal(shaken.shakes.length, 1);
  assert.deepEqual(
    { at: shaken.shakes[0].at, ends: shaken.shakes[0].at + shaken.shakes[0].duration },
    { at: 0, ends: shaken.total },
  );
});

test('a firing that finds its area already empty costs nothing and shows nothing', () => {
  const model = modelOf(['o. o.']);
  const move = buildMove(model, [
    {
      type: 'blast',
      pos: P(0, 0),
      special: 'bobble',
      radius: 2,
      orientation: null,
      cells: [],
      cascade: 1,
      points: 0,
      combo: false,
    },
  ]);
  assert.equal(move.total, 0);
  assert.equal(move.tracks.size, 0);
  assert.deepEqual(move.shakes, []);
});

test('a frog rip pops its colour outward from the frog over the rip window', () => {
  const model = modelOf(['o. m. o.', 'F. o. m.']);
  const move = buildMove(model, [
    {
      type: 'frogRip',
      pos: P(0, 1),
      color: 'olive',
      cells: [P(0, 0), P(2, 0), P(0, 1), P(1, 1)],
      cascade: 1,
      points: 560,
      combo: false,
    },
  ]);
  assert.equal(move.total, 400);
  assert.equal(move.removed.length, 4);
  const far = move.tracks.get(model.grid[0][2]);
  assert.equal(far.scale[0].at + far.scale[0].duration, 400);
});

test('a meter drop pops the ball it replaces and springs the new piece in', () => {
  const model = modelOf(['o. m.', 'b. r.']);
  const move = buildMove(model, [{ type: 'meterDrop', pos: P(1, 0), piece: { kind: 'frog' } }]);
  assert.equal(move.total, 300);
  assert.deepEqual(
    move.removed.map((r) => r.id),
    [model.grid[0][1]],
  );
  const landed = move.mounts[0];
  assert.equal(move.model.pieces.get(landed).piece.kind, 'frog');
  assert.equal(move.tracks.get(landed).initial.scale, 0);
  assert.equal(move.tracks.get(landed).scale[0].to, 1);
});

test('a meter step records the charge and costs the move no time at all', () => {
  const model = modelOf(['o. m.']);
  const move = buildMove(model, [{ type: 'meter', charge: 7, full: 10 }]);
  assert.equal(move.meter, 7);
  assert.equal(move.total, 0);
  assert.equal(move.tracks.size, 0);
  assert.equal(buildMove(model, []).meter, null);
});
