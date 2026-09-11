import { findRuns, findMatches, matchThrough, specialForSize, spawnCellFor } from '../src/match.js';
import { parseBoard } from '../src/text.js';

const sizes = (board) => findMatches(board).map((m) => m.size);

test('a match-free board has no runs and no matches', () => {
  const board = parseBoard(['o. m. o.', 'm. o. m.', 'o. m. o.']);
  expect(findRuns(board)).toEqual([]);
  expect(findMatches(board)).toEqual([]);
});

test('horizontal and vertical runs of 3 are matches of size 3 with no special', () => {
  const h = parseBoard(['o. o. o. m.', 'm. b. r. l.']);
  expect(findMatches(h)).toEqual([
    {
      color: 'olive',
      size: 3,
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      runs: [
        {
          dir: 'h',
          cells: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
          ],
        },
      ],
    },
  ]);
  const v = parseBoard(['m. b.', 'm. r.', 'm. l.', 'o. b.']);
  expect(findMatches(v)[0].runs[0].dir).toBe('v');
  expect(sizes(v)).toEqual([3]);
  expect(specialForSize(3)).toBeNull();
});

test('runs of 4, 5, 6 and 7+ create puff, bobble, popcorn and yarn bomb', () => {
  expect(sizes(parseBoard(['o. o. o. o. m.']))).toEqual([4]);
  expect(sizes(parseBoard(['o. o. o. o. o. m.']))).toEqual([5]);
  expect(sizes(parseBoard(['o. o. o. o. o. o. m.']))).toEqual([6]);
  expect(sizes(parseBoard(['o. o. o. o. o. o. o.']))).toEqual([7]);
  expect([4, 5, 6, 7, 8, 9].map(specialForSize)).toEqual([
    'puff',
    'bobble',
    'popcorn',
    'yarnbomb',
    'yarnbomb',
    'yarnbomb',
  ]);
});

test('an L, a T and a plus are one match each, counted by total pieces', () => {
  const L = parseBoard(['o. m. b.', 'o. m. b.', 'o. o. o.']);
  const [l] = findMatches(L);
  expect(l.size).toBe(5);
  expect(l.runs.map((r) => r.dir).sort()).toEqual(['h', 'v']);
  const T = parseBoard(['o. o. o.', 'm. o. b.', 'm. o. b.']);
  expect(sizes(T)).toEqual([5]);
  const plus = parseBoard(['m. o. b.', 'o. o. o.', 'm. o. b.']);
  expect(sizes(plus)).toEqual([5]);
  expect(findMatches(plus)[0].cells).toEqual([
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
  ]);
});

test('two parallel same-colored runs are two matches; a 3x3 block is one match of nine', () => {
  const parallel = parseBoard(['o. o. o.', 'm. b. r.', 'o. o. o.']);
  expect(sizes(parallel)).toEqual([3, 3]);
  const block = parseBoard(['o. o. o.', 'o. o. o.', 'o. o. o.']);
  expect(sizes(block)).toEqual([9]);
  expect(findMatches(block)[0].runs).toHaveLength(6);
});

test('specials and knotted balls count toward matches; everything else breaks runs', () => {
  expect(sizes(parseBoard(['o. oP oK m.']))).toEqual([3]);
  for (const breaker of ['__', '..', '#1', 'x2', '@.', '*.', 'F.']) {
    expect(sizes(parseBoard([`o. o. ${breaker} o. o.`]))).toEqual([]);
  }
});

test('matchThrough sees a line through a position and nothing through blockers', () => {
  const board = parseBoard(['o. o. m.', 'b. o. r.', 'l. o. c.', 'F. *. #1']);
  expect(matchThrough(board, { x: 1, y: 1 })).toBe(true);
  expect(matchThrough(board, { x: 1, y: 0 })).toBe(true);
  expect(matchThrough(board, { x: 0, y: 0 })).toBe(false);
  expect(matchThrough(board, { x: 0, y: 3 })).toBe(false);
  expect(matchThrough(board, { x: 2, y: 3 })).toBe(false);
});

test('matches and their cells come in row-major order', () => {
  const board = parseBoard([
    'm. b. r. l. c.',
    'o. o. o. m. b.',
    'r. l. c. m. o.',
    'b. r. l. m. o.',
  ]);
  const matches = findMatches(board);
  expect(matches.map((m) => m.color)).toEqual(['olive', 'mustard']);
  expect(matches[1].cells).toEqual([
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
  ]);
});

test('spawnCellFor: a swapped cell in the match wins', () => {
  const [m] = findMatches(parseBoard(['o. o. o. o. m.']));
  expect(
    spawnCellFor(m, [
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ]),
  ).toEqual({ x: 3, y: 0 });
  expect(spawnCellFor(m, [{ x: 4, y: 0 }])).toEqual({ x: 1, y: 0 });
});

test('spawnCellFor: cascade-made runs use the middle, the left/top one for even lengths', () => {
  expect(spawnCellFor(findMatches(parseBoard(['o. o. o. m.']))[0])).toEqual({ x: 1, y: 0 });
  expect(spawnCellFor(findMatches(parseBoard(['o. o. o. o. m.']))[0])).toEqual({ x: 1, y: 0 });
  expect(spawnCellFor(findMatches(parseBoard(['o. o. o. o. o. m.']))[0])).toEqual({ x: 2, y: 0 });
  expect(spawnCellFor(findMatches(parseBoard(['o. o. o. o. o. o. m.']))[0])).toEqual({
    x: 2,
    y: 0,
  });
  const vertical = findMatches(parseBoard(['o. m.', 'o. b.', 'o. r.', 'o. l.']))[0];
  expect(spawnCellFor(vertical)).toEqual({ x: 0, y: 1 });
});

test('spawnCellFor: an L, T or plus made by a cascade spawns at the corner', () => {
  const L = findMatches(parseBoard(['o. m. b.', 'o. m. b.', 'o. o. o.']))[0];
  expect(spawnCellFor(L)).toEqual({ x: 0, y: 2 });
  const T = findMatches(parseBoard(['o. o. o.', 'm. o. b.', 'm. o. b.']))[0];
  expect(spawnCellFor(T)).toEqual({ x: 1, y: 0 });
  const plus = findMatches(parseBoard(['m. o. b.', 'o. o. o.', 'm. o. b.']))[0];
  expect(spawnCellFor(plus)).toEqual({ x: 1, y: 1 });
  // every cell of a 3x3 block is in exactly two runs: the tie goes to the first in row-major order
  const block = findMatches(parseBoard(['o. o. o.', 'o. o. o.', 'o. o. o.']))[0];
  expect(spawnCellFor(block)).toEqual({ x: 0, y: 0 });
});
