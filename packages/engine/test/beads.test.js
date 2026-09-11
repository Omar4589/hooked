import { beadsOnExits, emptySpawnerTops, isBeadDue } from '../src/beads.js';
import { parseBoard } from '../src/text.js';
import { posKey } from '../src/board.js';

const P = (x, y) => ({ x, y });
const keys = (positions) => positions.map(posKey);

test('only beads resting on an exit are leaving, row-major', () => {
  const board = parseBoard(['*. o. *.', '*. *. o.']);
  const exits = new Set(['0,1', '1,1', '2,0']);
  expect(keys(beadsOnExits(board, exits))).toEqual(['2,0', '0,1', '1,1']);
  expect(keys(beadsOnExits(board, new Set()))).toEqual([]);
});

test('the empty spawner tops are the runs a refill is about to fill', () => {
  const board = parseBoard(['__ o. __ #1', 'o. o. o. o.']);
  const spawners = [P(0, 0), P(1, 0), P(2, 0), P(3, 0)];
  expect(keys(emptySpawnerTops(board, spawners))).toEqual(['0,0', '2,0']);
  expect(keys(emptySpawnerTops(board, [P(1, 0)]))).toEqual([]);
});

test('a bead is due every spawnEvery moves until the level total is accounted for', () => {
  const beads = { total: 3, onBoard: 1, spawnEvery: 2 };
  expect(isBeadDue(beads, 2, 0)).toBe(true);
  expect(isBeadDue(beads, 4, 1)).toBe(true);
  expect(isBeadDue(beads, 1, 0)).toBe(false);
  expect(isBeadDue(beads, 3, 1)).toBe(false);
  expect(isBeadDue(beads, 6, 2)).toBe(false); // both spawns are accounted for
  expect(isBeadDue({ total: 2, onBoard: 2, spawnEvery: 0 }, 4, 0)).toBe(false);
  expect(isBeadDue(beads, 0, 0)).toBe(false);
});
