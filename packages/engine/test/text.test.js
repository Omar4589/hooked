import {
  renderBoard,
  renderStitch,
  parseBoard,
  renderCell,
  describeStep,
  describeSteps,
  renderState,
  formatPos,
} from '../src/text.js';
import { cloneBoard } from '../src/board.js';
import { createGame } from '../src/game.js';
import { loadFixture, fixtureNames, seeds } from './helpers/fixtures.js';

test('every cell type renders to its two-character token', () => {
  expect(renderCell({ open: false })).toBe('..');
  expect(renderCell({ open: true })).toBe('__');
  expect(renderCell({ open: true, tangle: 3 })).toBe('#3');
  expect(renderCell({ open: true, tangle: 2, buried: true })).toBe('x2');
  expect(renderCell({ open: true, moth: true })).toBe('@.');
  expect(renderCell({ open: true, piece: { kind: 'frog' } })).toBe('F.');
  expect(renderCell({ open: true, piece: { kind: 'bead' } })).toBe('*.');
  expect(renderCell({ open: true, piece: { kind: 'yarn', color: 'olive' } })).toBe('o.');
  expect(renderCell({ open: true, piece: { kind: 'yarn', color: 'cocoa', knotted: true } })).toBe(
    'cK',
  );
  for (const [special, ch] of [
    ['puff', 'P'],
    ['bobble', 'B'],
    ['popcorn', 'C'],
    ['yarnbomb', 'Y'],
    ['hook', 'H'],
  ]) {
    expect(renderCell({ open: true, piece: { kind: 'yarn', color: 'lavender', special } })).toBe(
      `l${ch}`,
    );
  }
});

test('renderBoard joins rows and can add axes', () => {
  const board = parseBoard(['o. m.', 'b. r.']);
  expect(renderBoard(board)).toBe('o. m.\nb. r.');
  expect(renderBoard(board, { axes: true })).toBe('   0  1\n0  o. m.\n1  b. r.');
});

test("renderStitch shows layers and dots, and can take the board's axes geometry", () => {
  const board = parseBoard(['o. m. ..', 'b. r. l.'], ['1 2 .', '. . 1']);
  expect(renderStitch(board)).toBe('1 2 .\n. . 1');
  expect(renderStitch(board, { axes: true })).toBe('   0  1  2\n0  1  2  .\n1  .  .  1');
});

test('parseBoard(renderBoard(b), renderStitch(b)) round-trips every fixture over five seeds', () => {
  for (const name of fixtureNames()) {
    for (const seed of seeds(5)) {
      const board = createGame(loadFixture(name), `${name}/${seed}`).state().board;
      expect(parseBoard(renderBoard(board), renderStitch(board))).toStrictEqual(board);
    }
  }
});

test('parseBoard round-trips a board with every cell type, including stitch', () => {
  const rows = ['.. #1 @. oK x2', '__ F. *. lP mB', 'rC bY cH o. m.'];
  const stitch = ['. 1 . 2 .', '1 . . . .', '. . 2 1 .'];
  const board = parseBoard(rows, stitch);
  expect(renderBoard(board)).toBe(rows.join('\n'));
  expect(renderStitch(board)).toBe(stitch.join('\n'));
  expect(parseBoard(renderBoard(board), renderStitch(board))).toStrictEqual(board);
  expect(cloneBoard(board)).toStrictEqual(board);
});

test('parseBoard rejects bad tokens and mismatched stitch', () => {
  expect(() => parseBoard(['o. zz'])).toThrow(/unknown cell/);
  expect(() => parseBoard(['o. oZ'])).toThrow(/unknown modifier/);
  expect(() => parseBoard(['o.', 'o. o.'])).toThrow(/ragged/);
  expect(() => parseBoard(['o. o.'], ['1'])).toThrow(/stitch/);
});

test('describeStep gives one line per step type', () => {
  expect(describeStep({ type: 'swap', a: { x: 1, y: 2 }, b: { x: 2, y: 2 }, illegal: false })).toBe(
    'swap (1,2)<->(2,2)',
  );
  expect(describeStep({ type: 'swap', a: { x: 1, y: 2 }, b: { x: 2, y: 2 }, illegal: true })).toBe(
    'swap (1,2)<->(2,2) illegal',
  );
  expect(
    describeStep({
      type: 'clear',
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      created: [{ pos: { x: 3, y: 0 }, piece: { kind: 'yarn', color: 'olive', special: 'puff' } }],
      cascade: 1,
      points: 140,
    }),
  ).toBe('clear x1: 4 cells -> puff at (3,0) (+140)');
  expect(
    describeStep({ type: 'clear', cells: [1, 2, 3], created: [], cascade: 3, points: 180 }),
  ).toBe('clear x3: 3 cells (+180)  combo x3');
  expect(describeStep({ type: 'fall', moves: [{}, {}] })).toBe('fall: 2 pieces');
  expect(describeStep({ type: 'spawn', cells: [{}] })).toBe('spawn: 1 pieces');
  expect(describeStep({ type: 'shuffle', board: {} })).toBe('shuffle: untangling...');
  expect(describeStep({ type: 'yarnOver' })).toBe('yarnOver');
  expect(
    describeSteps([
      { type: 'fall', moves: [] },
      { type: 'spawn', cells: [] },
    ]),
  ).toEqual(['fall: 0 pieces', 'spawn: 0 pieces']);
});

test('renderState and formatPos', () => {
  expect(renderState({ moves: 3, score: 120, status: 'playing' })).toBe(
    'moves 3 · score 120 · playing',
  );
  expect(formatPos({ x: 4, y: 0 })).toBe('(4,0)');
});

test('describeStep names the firings, the meter and the drop', () => {
  const P = (x, y) => ({ x, y });
  expect(
    describeStep({
      type: 'blast',
      pos: P(2, 3),
      special: 'bobble',
      radius: 2,
      orientation: null,
      cells: [P(2, 3), P(2, 4)],
      cascade: 1,
      points: 80,
      combo: false,
    }),
  ).toBe('blast bobble at (2,3): 2 cells (+80)');
  expect(
    describeStep({
      type: 'blast',
      pos: P(0, 0),
      special: 'hook',
      radius: null,
      orientation: 'rows',
      cells: [],
      cascade: 2,
      points: 0,
      combo: true,
    }),
  ).toBe('blast hook rows combo at (0,0): 0 cells (+0)');
  expect(
    describeStep({
      type: 'frogRip',
      pos: P(1, 1),
      color: 'olive',
      cells: [P(1, 1)],
      cascade: 1,
      points: 520,
      combo: false,
    }),
  ).toBe('frogRip olive at (1,1): 1 cells (+520)');
  expect(describeStep({ type: 'meter', charge: 7, full: 10 })).toBe('meter: 7/10');
  expect(describeStep({ type: 'meterDrop', pos: P(3, 3), piece: { kind: 'frog' } })).toBe(
    'meterDrop: frog at (3,3)',
  );
});
