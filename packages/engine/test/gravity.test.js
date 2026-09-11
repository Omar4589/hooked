import { applyGravity, refill } from '../src/gravity.js';
import { columnRuns, posKey, pieceAt } from '../src/board.js';
import { parseBoard, renderBoard } from '../src/text.js';

const settle = (rows) => {
  const board = parseBoard(rows);
  const moves = applyGravity(board, columnRuns(board));
  return { board, moves, text: renderBoard(board) };
};

test('pieces fall to the bottom of their run; the fall list names every moved piece once', () => {
  const { text, moves } = settle(['o.', '__', 'm.', '__']);
  expect(text).toBe('__\n__\no.\nm.');
  expect(moves).toEqual([
    { from: { x: 0, y: 2 }, to: { x: 0, y: 3 } },
    { from: { x: 0, y: 0 }, to: { x: 0, y: 2 } },
  ]);
});

test('a gap of two moves the pieces above it by two', () => {
  const { text } = settle(['o.', 'm.', '__', '__', 'b.']);
  expect(text).toBe('__\n__\no.\nm.\nb.');
});

test('a settled board produces no moves', () => {
  const { moves } = settle(['__', 'o.', 'm.']);
  expect(moves).toEqual([]);
});

test('holes split runs: a piece never crosses a hole', () => {
  const { text } = settle(['o.', '__', '..', '__', 'm.']);
  expect(text).toBe('__\no.\n..\n__\nm.');
});

test('tangles and moths are floors; empties below them stay empty', () => {
  const { text, moves } = settle(['o.', '__', '#2', '__', 'm.', '__']);
  expect(text).toBe('__\no.\n#2\n__\n__\nm.');
  expect(moves).toHaveLength(2);
  expect(settle(['o.', '__', '@.', '__']).text).toBe('__\no.\n@.\n__');
});

test('a knotted ball never moves and pieces above it stop on it', () => {
  const { text } = settle(['o.', '__', 'mK', '__']);
  expect(text).toBe('__\no.\nmK\n__');
});

test('beads and the frog fall like balls', () => {
  expect(settle(['*.', 'F.', '__', '__']).text).toBe('__\n__\n*.\nF.');
});

test('every fall move is strictly downward within its column', () => {
  const { moves } = settle(['o. __ b.', '__ m. __', '__ __ __']);
  for (const { from, to } of moves) {
    expect(to.x).toBe(from.x);
    expect(to.y).toBeGreaterThan(from.y);
  }
});

test('refill fills only the empty prefix of runs whose top is a spawner, x then y', () => {
  const board = parseBoard(['__ __ __', '__ o. __', 'o. m. __']);
  const runs = columnRuns(board);
  const spawners = new Set([posKey({ x: 0, y: 0 }), posKey({ x: 2, y: 0 })]);
  let n = 0;
  const spawned = refill(board, runs, spawners, () => ({
    kind: 'yarn',
    color: ['olive', 'mustard', 'blush', 'rust', 'lavender'][n++ % 5],
  }));
  expect(spawned.map((s) => posKey(s.pos))).toEqual(['0,0', '0,1', '2,0', '2,1', '2,2']);
  expect(renderBoard(board)).toBe('o. __ b.\nm. o. r.\no. m. l.');
  expect(spawned[0].piece).not.toBe(pieceAt(board, { x: 0, y: 0 }));
  expect(spawned[0].piece).toEqual(pieceAt(board, { x: 0, y: 0 }));
});

test('a run whose top is a tangle or that has no spawner stays empty', () => {
  const board = parseBoard(['#1 __', '__ __']);
  const spawned = refill(
    board,
    columnRuns(board),
    new Set([posKey({ x: 0, y: 0 }), posKey({ x: 1, y: 0 })]),
    () => ({ kind: 'yarn', color: 'olive' }),
  );
  expect(spawned.map((s) => posKey(s.pos))).toEqual(['1,0', '1,1']);
  expect(renderBoard(board)).toBe('#1 o.\n__ o.');
  const unfed = parseBoard(['__', '__']);
  expect(
    refill(unfed, columnRuns(unfed), new Set(), () => ({ kind: 'yarn', color: 'olive' })),
  ).toEqual([]);
});
