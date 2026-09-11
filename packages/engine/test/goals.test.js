import {
  allGoalsMet,
  countBlocker,
  countBuried,
  countStitch,
  createGoals,
  creditRemoved,
  creditSteps,
  isLiveGoal,
  snapshotGoals,
} from '../src/goals.js';
import { parseBoard } from '../src/text.js';

const P = (x, y) => ({ x, y });
const ball = (color, extra = {}) => ({ kind: 'yarn', color, ...extra });
const levelWith = (goals, beads = { total: 0, onBoard: 0, spawnEvery: 0 }) => ({ goals, beads });

test('counting what a board still owes', () => {
  const board = parseBoard(['#2 x2 @.', 'oK *. o.'], ['1 . .', '. . 2']);
  expect(countStitch(board)).toBe(2);
  expect(countBuried(board)).toBe(1);
  expect(countBlocker(board, 'tangle')).toBe(2); // the buried one is a tangle too
  expect(countBlocker(board, 'moth')).toBe(1);
  expect(countBlocker(board, 'knot')).toBe(1);
});

test('totals come from the board the level starts on, with the documented defaults', () => {
  const board = parseBoard(['#1 x2 o.', 'o. *. @.'], ['1 . 1', '. . .']);
  const goals = createGoals(
    levelWith(
      [
        { type: 'stitch' },
        { type: 'clear', blocker: 'tangle' },
        { type: 'collect', color: 'olive', count: 30 },
        { type: 'beads' },
        { type: 'buried' },
      ],
      { total: 3, onBoard: 1, spawnEvery: 4 },
    ),
    board,
  );
  expect(goals.map((g) => [g.type, g.total, g.remaining])).toEqual([
    ['stitch', 2, 2],
    ['clear', 2, 2],
    ['collect', 30, 30],
    ['beads', 3, 3],
    ['buried', 1, 1],
  ]);
  // an explicit count wins over the default, and the goal's own fields survive
  const counted = createGoals(
    levelWith(
      [
        { type: 'beads', count: 2, sprite: 'button' },
        { type: 'buried', count: 8 },
      ],
      {
        total: 3,
        onBoard: 1,
        spawnEvery: 4,
      },
    ),
    board,
  );
  expect(counted[0]).toEqual({ type: 'beads', count: 2, sprite: 'button', total: 2, remaining: 2 });
  expect(counted[1].total).toBe(8);
});

test('stitch and clear are live; a spreading moth can push a clear goal back above its total', () => {
  const board = parseBoard(['@. o.', 'o. o.'], ['1 .', '. .']);
  const goals = createGoals(
    levelWith([{ type: 'stitch' }, { type: 'clear', blocker: 'moth' }]),
    board,
  );
  expect(goals.map(isLiveGoal)).toEqual([true, true]);
  board.cells[0][1].moth = true;
  delete board.cells[0][0].stitch;
  const snapshot = snapshotGoals(goals, board);
  expect(snapshot.map((g) => [g.total, g.remaining])).toEqual([
    [1, 0],
    [1, 2],
  ]);
  expect(snapshot[0]).not.toBe(goals[0]);
});

test('collect counts every ball of its colour that left, and stops at zero', () => {
  const goals = createGoals(
    levelWith([{ type: 'collect', color: 'olive', count: 3 }]),
    parseBoard(['o.']),
  );
  creditRemoved(goals, [
    { pos: P(0, 0), piece: ball('olive') },
    { pos: P(1, 0), piece: ball('olive', { knotted: true }) },
    { pos: P(2, 0), piece: ball('olive', { special: 'puff' }) },
    { pos: P(3, 0), piece: ball('rust') },
    { pos: P(4, 0), piece: { kind: 'frog' } },
    { pos: P(5, 0), piece: { kind: 'bead' } },
  ]);
  expect(goals[0].remaining).toBe(0);
  creditRemoved(goals, [{ pos: P(0, 0), piece: ball('olive') }]);
  expect(goals[0].remaining).toBe(0);
});

test('beads and buried count the steps that deliver them; nothing else does', () => {
  const board = parseBoard(['x2 *.']);
  const goals = createGoals(
    levelWith([
      { type: 'beads', count: 2 },
      { type: 'buried' },
      { type: 'collect', color: 'olive', count: 1 },
    ]),
    board,
  );
  creditSteps(goals, [
    { type: 'beadExit', pos: P(1, 0), points: 2000 },
    { type: 'blocker', pos: P(0, 0), kind: 'tangle', layersLeft: 1, points: 200 },
    { type: 'blocker', pos: P(0, 0), kind: 'tangle', layersLeft: 0, points: 200, buried: true },
    { type: 'blocker', pos: P(0, 0), kind: 'knot', layersLeft: 0, points: 200 },
    { type: 'clear', cells: [P(0, 0)], created: [], cascade: 1, points: 20 },
  ]);
  expect(goals.map((g) => g.remaining)).toEqual([1, 0, 1]);
});

test('a level with no goals is never won, and a level with them is won only when nothing is left', () => {
  const board = parseBoard(['@. o.']);
  expect(allGoalsMet([], board)).toBe(false);
  const goals = createGoals(
    levelWith([
      { type: 'clear', blocker: 'moth' },
      { type: 'beads', count: 1 },
    ]),
    board,
  );
  expect(allGoalsMet(goals, board)).toBe(false);
  creditSteps(goals, [{ type: 'beadExit', pos: P(1, 0), points: 2000 }]);
  expect(allGoalsMet(goals, board)).toBe(false);
  delete board.cells[0][0].moth;
  expect(allGoalsMet(goals, board)).toBe(true);
});
