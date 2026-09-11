import { applyDamage, orthogonalNeighbours, touchedBlockers } from '../src/damage.js';
import { parseBoard, renderBoard, renderStitch } from '../src/text.js';
import { posKey } from '../src/board.js';

const P = (x, y) => ({ x, y });
const match = (...cells) => ({ cells });
const blast = (...area) => ({ pos: area[0] ?? P(0, 0), area, cells: [] });
const info = (extra = {}) => ({
  cascade: 1,
  matches: [],
  blasts: [],
  blasted: [],
  removed: [],
  ...extra,
});
const shape = (steps) => steps.map((s) => [posKey(s.pos), s.kind, s.layersLeft]);

test('orthogonalNeighbours stays on the board, in reading order', () => {
  const board = parseBoard(['o. o. o.', 'o. o. o.']);
  expect(orthogonalNeighbours(board, P(1, 1)).map(posKey)).toEqual(['1,0', '0,1', '2,1']);
  expect(orthogonalNeighbours(board, P(0, 0)).map(posKey)).toEqual(['1,0', '0,1']);
});

test('touchedBlockers names every tangle and moth a set of cells covers or sits beside, once', () => {
  const board = parseBoard(['o. #2 @.', 'o. o. o.']);
  // the middle cell touches both the tangle above it and, through (2,1), the moth
  expect(touchedBlockers(board, [P(0, 1), P(1, 1), P(2, 1)]).map(posKey)).toEqual(['1,0', '2,0']);
  expect(touchedBlockers(board, [P(1, 0), P(2, 0)]).map(posKey)).toEqual(['1,0', '2,0']);
  expect(touchedBlockers(board, [P(0, 1)]).map(posKey)).toEqual([]);
});

test('a tangle loses one layer per match that touches it, however many cells lie against it', () => {
  const board = parseBoard(['o. #3 o.', 'o. o. o.']);
  const steps = applyDamage(board, info({ matches: [match(P(0, 1), P(1, 1), P(2, 1))] }));
  expect(steps).toEqual([
    { type: 'blocker', pos: P(1, 0), kind: 'tangle', layersLeft: 2, points: 200 },
  ]);
  expect(board.cells[0][1].tangle).toBe(2);
});

test('two matches strip two layers, and a third is wasted on a two-layer tangle', () => {
  const board = parseBoard(['o. #3 o.', 'o. o. o.']);
  const two = applyDamage(board, info({ matches: [match(P(1, 1)), match(P(0, 0), P(1, 0))] }));
  expect(shape(two)).toEqual([
    ['1,0', 'tangle', 2],
    ['1,0', 'tangle', 1],
  ]);
  expect(board.cells[0][1].tangle).toBe(1);
  const small = parseBoard(['o. #2 o.', 'o. o. o.']);
  const three = applyDamage(
    small,
    info({ matches: [match(P(1, 1)), match(P(0, 0)), match(P(2, 0))] }),
  );
  expect(shape(three)).toEqual([
    ['1,0', 'tangle', 1],
    ['1,0', 'tangle', 0],
  ]);
  expect(small.cells[0][1]).toEqual({ open: true });
});

test('a blast damages what its area covers or touches, once per firing; a rip damages nothing', () => {
  const covering = parseBoard(['o. #2 o.', 'o. o. o.']);
  expect(shape(applyDamage(covering, info({ blasts: [blast(P(1, 0), P(1, 1))] })))).toEqual([
    ['1,0', 'tangle', 1],
  ]);
  const beside = parseBoard(['o. #2 o.', 'o. o. o.']);
  expect(shape(applyDamage(beside, info({ blasts: [blast(P(1, 1), P(0, 1))] })))).toEqual([
    ['1,0', 'tangle', 1],
  ]);
  const far = parseBoard(['o. #2 o.', 'o. o. o.']);
  expect(applyDamage(far, info({ blasts: [blast(P(0, 1))] }))).toEqual([]);
  // a hook fired with a blast is two firings, so it is two layers
  const both = parseBoard(['o. #2 o.', 'o. o. o.']);
  expect(
    shape(applyDamage(both, info({ blasts: [blast(P(1, 1)), blast(P(0, 0), P(1, 0))] }))),
  ).toEqual([
    ['1,0', 'tangle', 1],
    ['1,0', 'tangle', 0],
  ]);
  // a frog rip reaches the hook only through `blasted`, which damage ignores (§5)
  const ripped = parseBoard(['o. #2 o.', 'o. o. o.']);
  expect(applyDamage(ripped, info({ blasted: [P(1, 1), P(0, 1)] }))).toEqual([]);
});

test('the last layer of a buried tangle frees its button and takes the flag with it', () => {
  const one = parseBoard(['x1 o.']);
  const steps = applyDamage(one, info({ matches: [match(P(1, 0))] }));
  expect(steps).toEqual([
    { type: 'blocker', pos: P(0, 0), kind: 'tangle', layersLeft: 0, points: 200, buried: true },
  ]);
  expect(one.cells[0][0]).toEqual({ open: true });
  const two = parseBoard(['x2 o.']);
  const first = applyDamage(two, info({ matches: [match(P(1, 0))] }));
  expect(first[0].buried).toBeUndefined();
  expect(two.cells[0][0]).toEqual({ open: true, tangle: 1, buried: true });
});

test('a moth has one layer however many times it is hit', () => {
  const board = parseBoard(['@. o.']);
  const steps = applyDamage(board, info({ matches: [match(P(1, 0)), match(P(1, 0))] }));
  expect(steps).toEqual([
    { type: 'blocker', pos: P(0, 0), kind: 'moth', layersLeft: 0, points: 200 },
  ]);
  expect(board.cells[0][0]).toEqual({ open: true });
});

test('a stitch square loses a layer for every piece that left it, and nothing else touches it', () => {
  const board = parseBoard(['o. o.'], ['2 1']);
  const ball = { kind: 'yarn', color: 'olive' };
  const once = applyDamage(board, info({ removed: [{ pos: P(0, 0), piece: ball }] }));
  expect(once).toEqual([
    { type: 'blocker', pos: P(0, 0), kind: 'stitch', layersLeft: 1, points: 1000 },
  ]);
  expect(renderStitch(board)).toBe('1 1');
  // a cell cleared twice in one cascade (cleared, then its created special blasted) loses two,
  // and a third removal off the same cell finds nothing left to stitch
  const deep = parseBoard(['o. o.'], ['2 1']);
  const twice = applyDamage(
    deep,
    info({
      removed: [
        { pos: P(0, 0), piece: ball },
        { pos: P(0, 0), piece: ball },
        { pos: P(0, 0), piece: ball },
      ],
    }),
  );
  expect(shape(twice)).toEqual([
    ['0,0', 'stitch', 1],
    ['0,0', 'stitch', 0],
  ]);
  expect(renderStitch(deep)).toBe('. 1');
});

test('a knot is credited where it stood and the board is left alone', () => {
  const board = parseBoard(['oK o.']);
  const knot = { kind: 'yarn', color: 'olive', knotted: true };
  const before = renderBoard(board);
  expect(applyDamage(board, info({ removed: [{ pos: P(0, 0), piece: knot }] }))).toEqual([
    { type: 'blocker', pos: P(0, 0), kind: 'knot', layersLeft: 0, points: 200 },
  ]);
  expect(renderBoard(board)).toBe(before);
});

test('steps come out row-major, then by kind, then by layers left, and share nothing with the board', () => {
  const board = parseBoard(['@. o. #2', 'oK o. o.'], ['. . .', '1 . .']);
  const steps = applyDamage(
    board,
    info({
      matches: [match(P(1, 0), P(1, 1)), match(P(2, 1))],
      removed: [{ pos: P(0, 1), piece: { kind: 'yarn', color: 'olive', knotted: true } }],
    }),
  );
  expect(shape(steps)).toEqual([
    ['0,0', 'moth', 0],
    ['2,0', 'tangle', 1],
    ['2,0', 'tangle', 0],
    ['0,1', 'knot', 0],
    ['0,1', 'stitch', 0],
  ]);
  expect(JSON.parse(JSON.stringify(steps))).toEqual(steps);
});
