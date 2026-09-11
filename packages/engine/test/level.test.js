import { normalizeLevel, buildBoard } from '../src/level.js';
import { renderBoard } from '../src/text.js';
import { loadFixture } from './helpers/fixtures.js';

const base = () => ({
  id: 42,
  name: 'Test',
  moves: 10,
  colors: ['olive', 'mustard', 'blush'],
  cells: ['ooo', 'ooo', 'ooo'],
});

test('every legend character becomes the right cell template', () => {
  const level = normalizeLevel({
    ...base(),
    cells: ['.o1', '2k3', 'mbx'],
    colors: ['olive', 'mustard'],
  });
  const t = level.grid;
  expect(t[0][0]).toEqual({ open: false });
  expect(t[0][1]).toEqual({ open: true, fill: 'yarn' });
  expect(t[0][2]).toEqual({ open: true, tangle: 1 });
  expect(t[1][0]).toEqual({ open: true, tangle: 2 });
  expect(t[1][1]).toEqual({ open: true, fill: 'yarn', knot: true });
  expect(t[1][2]).toEqual({ open: true, tangle: 3 });
  expect(t[2][0]).toEqual({ open: true, moth: true });
  expect(t[2][1]).toEqual({ open: true, fill: 'bead' });
  expect(t[2][2]).toEqual({ open: true, tangle: 2, buried: true });
  expect(level.width).toBe(3);
  expect(level.height).toBe(3);
});

test('buildBoard carries tangles, moths, stitch and buried but no pieces', () => {
  const level = normalizeLevel({
    ...base(),
    cells: ['.o1', '2k3', 'mbx'],
    stitch: ['.1.', '2..', '...'],
  });
  const board = buildBoard(level);
  expect(renderBoard(board)).toBe('.. __ #1\n#2 __ #3\n@. __ x2');
  expect(board.cells[0][1].stitch).toBe(1);
  expect(board.cells[1][0].stitch).toBe(2);
  expect(board.cells[1][1].piece).toBeUndefined();
  expect(Object.keys(board.cells[1][1])).toEqual(['open']);
});

test('stitch must match the cells shape and never sit on a hole', () => {
  expect(() => normalizeLevel({ ...base(), stitch: ['111', '111'] })).toThrow(/same shape/);
  expect(() =>
    normalizeLevel({ ...base(), cells: ['.oo', 'ooo', 'ooo'], stitch: ['1..', '...', '...'] }),
  ).toThrow(/sits on a hole/);
  expect(() => normalizeLevel({ ...base(), stitch: ['3..', '...', '...'] })).toThrow(
    /unknown stitch/,
  );
});

test('default spawners are the top cell of every vertical run; explicit ones replace them', () => {
  const level = normalizeLevel({ ...base(), cells: ['o.o', 'ooo', 'o.o'] });
  expect(level.spawners).toEqual([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 0 },
  ]);
  const explicit = normalizeLevel({
    ...base(),
    cells: ['o.o', 'ooo', 'o.o'],
    spawners: [
      [0, 0],
      [0, 0],
      [1, 1],
    ],
  });
  expect(explicit.spawners).toEqual([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]);
  expect(() => normalizeLevel({ ...base(), spawners: [[0, 1]] })).toThrow(
    /not the top cell of a vertical run/,
  );
  expect(() => normalizeLevel({ ...base(), spawners: [[5, 0]] })).toThrow(/off the board/);
  expect(() => normalizeLevel({ ...base(), spawners: [[0]] })).toThrow(/not an \[x, y\] pair/);
});

test('a tangle does not split a run, so a spawner below it is rejected', () => {
  expect(() =>
    normalizeLevel({ ...base(), cells: ['ooo', '1oo', 'ooo'], spawners: [[0, 2]] }),
  ).toThrow(/not the top cell/);
});

test('exits default to the lowest non-hole cell per column, or the given list', () => {
  const level = normalizeLevel({ ...base(), cells: ['ooo', 'o.o', 'oo.'] });
  expect(level.exits).toEqual([
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 1 },
  ]);
  expect(normalizeLevel({ ...base(), exits: 'bottom' }).exits).toEqual(
    level.exits.map((e, i) => ({ x: i, y: 2 })),
  );
  expect(normalizeLevel({ ...base(), exits: [[1, 1]] }).exits).toEqual([{ x: 1, y: 1 }]);
  expect(() =>
    normalizeLevel({ ...base(), cells: ['ooo', 'o.o', 'ooo'], exits: [[1, 1]] }),
  ).toThrow(/not an open cell/);
});

test('beads default to the number of bead cells on the board', () => {
  const level = normalizeLevel({ ...base(), cells: ['obo', 'ooo', 'obo'] });
  expect(level.beads).toEqual({ total: 2, onBoard: 2, spawnEvery: 0 });
  const explicit = normalizeLevel({ ...base(), beads: { total: 5, onBoard: 1, spawnEvery: 6 } });
  expect(explicit.beads).toEqual({ total: 5, onBoard: 1, spawnEvery: 6 });
  expect(() => normalizeLevel({ ...base(), beads: { total: -1 } })).toThrow(/beads.total/);
});

test('weights default to 1, drop unknown keys and must leave two positive colors', () => {
  expect(normalizeLevel(base()).weights).toEqual({ olive: 1, mustard: 1, blush: 1 });
  const level = normalizeLevel({ ...base(), weights: { olive: 2.5, cocoa: 9 } });
  expect(level.weights).toEqual({ olive: 2.5, mustard: 1, blush: 1 });
  expect(() => normalizeLevel({ ...base(), weights: { olive: -1 } })).toThrow(/>= 0/);
  expect(() => normalizeLevel({ ...base(), weights: { olive: 0, mustard: 0 } })).toThrow(
    /two colors with a positive weight/,
  );
});

test('goals are normalized and validated; meter, hard, hidden, coins, tutorial default sensibly', () => {
  const level = normalizeLevel({
    ...base(),
    goals: [
      { type: 'stitch', extra: 1 },
      { type: 'collect', color: 'olive', count: 30 },
      { type: 'beads', count: 3, sprite: 'button' },
      { type: 'clear', blocker: 'moth' },
    ],
  });
  expect(level.goals).toEqual([
    { type: 'stitch' },
    { type: 'collect', color: 'olive', count: 30 },
    { type: 'beads', count: 3, sprite: 'button' },
    { type: 'clear', blocker: 'moth' },
  ]);
  expect(level.meter).toBe('frog');
  expect(level.hard).toBe(false);
  expect(level.hidden).toBe(false);
  expect(level.coins).toBe(0);
  expect(level.tutorial).toEqual([]);
  expect(normalizeLevel({ ...base(), tutorial: 'swap' }).tutorial).toEqual(['swap']);
  expect(normalizeLevel({ ...base(), tutorial: ['knot', 'boosters'] }).tutorial).toEqual([
    'knot',
    'boosters',
  ]);
  expect(normalizeLevel({ ...base(), hard: 'tricky' }).hard).toBe('tricky');
  expect(() => normalizeLevel({ ...base(), goals: [{ type: 'win' }] })).toThrow(/unknown goal/);
  expect(() => normalizeLevel({ ...base(), goals: [{ type: 'collect', color: 'pink' }] })).toThrow(
    /goal color/,
  );
  expect(() => normalizeLevel({ ...base(), goals: [{ type: 'clear', blocker: 'rock' }] })).toThrow(
    /goal blocker/,
  );
  expect(() => normalizeLevel({ ...base(), meter: 'lightning' })).toThrow(/unknown meter/);
  expect(() => normalizeLevel({ ...base(), hard: 'brutal' })).toThrow(/hard label/);
  expect(() => normalizeLevel({ ...base(), tutorial: 3 })).toThrow(/tutorial/);
});

test('presets must name a known piece on an open "o" cell, once', () => {
  const level = normalizeLevel({
    ...base(),
    presets: [
      { x: 1, y: 1, piece: 'bobble' },
      { x: 0, y: 0, piece: 'frog' },
    ],
  });
  expect(level.presets).toEqual([
    { x: 1, y: 1, piece: 'bobble' },
    { x: 0, y: 0, piece: 'frog' },
  ]);
  expect(() => normalizeLevel({ ...base(), presets: [{ x: 1, y: 1, piece: 'bead' }] })).toThrow(
    /preset piece/,
  );
  expect(() => normalizeLevel({ ...base(), presets: [{ x: 9, y: 1, piece: 'puff' }] })).toThrow(
    /off the board/,
  );
  expect(() =>
    normalizeLevel({
      ...base(),
      cells: ['.oo', 'ooo', 'ooo'],
      presets: [{ x: 0, y: 0, piece: 'puff' }],
    }),
  ).toThrow(/open "o" cell/);
  expect(() =>
    normalizeLevel({
      ...base(),
      cells: ['koo', 'ooo', 'ooo'],
      presets: [{ x: 0, y: 0, piece: 'puff' }],
    }),
  ).toThrow(/open "o" cell/);
  expect(() =>
    normalizeLevel({
      ...base(),
      presets: [
        { x: 1, y: 1, piece: 'puff' },
        { x: 1, y: 1, piece: 'frog' },
      ],
    }),
  ).toThrow(/two presets/);
});

test('essentials are validated with messages naming the level', () => {
  expect(() => normalizeLevel(null)).toThrow(/expected an object/);
  expect(() => normalizeLevel({ ...base(), cells: [] })).toThrow(/level 42: cells/);
  expect(() => normalizeLevel({ ...base(), cells: ['ooo', 'oo'] })).toThrow(/row 1 has length 2/);
  expect(() => normalizeLevel({ ...base(), cells: ['ooz', 'ooo', 'ooo'] })).toThrow(
    /unknown cell character "z"/,
  );
  expect(() => normalizeLevel({ ...base(), cells: Array(10).fill('ooo') })).toThrow(/ceiling/);
  expect(() => normalizeLevel({ ...base(), colors: ['olive'] })).toThrow(/at least two/);
  expect(() => normalizeLevel({ ...base(), colors: ['olive', 'pink'] })).toThrow(/unknown color/);
  expect(() => normalizeLevel({ ...base(), colors: ['olive', 'olive'] })).toThrow(/repeat/);
  expect(() => normalizeLevel({ ...base(), moves: 0 })).toThrow(/moves/);
  expect(() => normalizeLevel({ ...base(), moves: 2.5 })).toThrow(/moves/);
});

test('unknown fields pass through and id/name default', () => {
  const level = normalizeLevel({
    ...base(),
    id: undefined,
    name: undefined,
    book: 2,
    project: 'x',
  });
  expect(level.id).toBe(0);
  expect(level.name).toBe('');
  expect(level.book).toBe(2);
  expect(level.project).toBe('x');
});

test('the coaster fixture normalizes with its stitch grid and tutorial beats', () => {
  const level = normalizeLevel(loadFixture('coaster-5x5'));
  expect(level.width).toBe(5);
  expect(level.meter).toBe('none');
  expect(level.tutorial).toEqual(['swap', 'puff']);
  expect(level.grid[0][0]).toEqual({ open: false });
  expect(level.grid[0][1].stitch).toBe(1);
  expect(level.spawners).toEqual([
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 1 },
  ]);
});
