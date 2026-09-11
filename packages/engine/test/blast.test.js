import { parseBoard, renderBoard } from '../src/text.js';
import {
  blastArea,
  comboRadius,
  hookLines,
  isTakeable,
  openCells,
  plusArea,
  ripArea,
  roundedSquare,
  specialForRadius,
  takeableIn,
} from '../src/blast.js';
import { cellAt } from '../src/board.js';
import { loadFixture } from './helpers/fixtures.js';
import { normalizeLevel, buildBoard } from '../src/level.js';

const P = (x, y) => ({ x, y });
const keys = (cells) => cells.map((p) => `${p.x},${p.y}`);
const open = (w, h) => parseBoard(Array.from({ length: h }, () => Array(w).fill('o.').join(' ')));
const boardOf = (name) => buildBoard(normalizeLevel(loadFixture(name)));
const big = open(9, 9);

test('a rounded square is the square minus its four corners: 21, 45 and 77 on an open board', () => {
  expect(roundedSquare(big, P(4, 4), 2).length).toBe(21);
  expect(roundedSquare(big, P(4, 4), 3).length).toBe(45);
  expect(roundedSquare(big, P(4, 4), 4).length).toBe(77);
  // the four cells a 5x5 loses
  const at2 = new Set(keys(roundedSquare(big, P(4, 4), 2)));
  for (const corner of ['2,2', '6,2', '2,6', '6,6']) expect(at2.has(corner)).toBe(false);
  for (const edge of ['2,4', '4,2', '6,4', '4,6']) expect(at2.has(edge)).toBe(true);
});

test('a blast at the board edge is clipped, not shifted inward', () => {
  expect(roundedSquare(big, P(0, 0), 2).length).toBe(8);
  expect(roundedSquare(big, P(0, 0), 3).length).toBe(15);
  expect(roundedSquare(big, P(0, 0), 4).length).toBe(24);
  expect(roundedSquare(big, P(4, 0), 2).length).toBe(13);
  expect(roundedSquare(big, P(4, 0), 4).length).toBe(43);
});

test('every area is in bounds, open, unique and row-major, wherever it is centred', () => {
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      for (let r = 1; r <= 5; r += 1) {
        const cells = roundedSquare(big, P(x, y), r);
        const seen = keys(cells);
        expect(new Set(seen).size).toBe(seen.length);
        expect([...seen].sort()).toEqual(
          [...keys([...cells].sort((a, b) => a.y - b.y || a.x - b.x))].sort(),
        );
        for (const p of cells) {
          expect(p.x >= 0 && p.y >= 0 && p.x < 9 && p.y < 9).toBe(true);
          expect(cellAt(big, p).open).toBe(true);
        }
      }
    }
  }
});

test('a blast passes over a hole: the hole is skipped and the cells beyond it are still hit', () => {
  // a ring of holes around the centre; a radius-2 blast must reach past it
  const board = parseBoard([
    'o. o. o. o. o.',
    'o. .. .. .. o.',
    'o. .. o. .. o.',
    'o. .. .. .. o.',
    'o. o. o. o. o.',
  ]);
  const cells = keys(roundedSquare(board, P(2, 2), 2));
  expect(cells).not.toContain('1,1');
  expect(cells).not.toContain('2,1');
  expect(cells).toContain('2,0'); // beyond the ring
  expect(cells).toContain('0,2');
  expect(cells).toContain('2,2');
});

test('a shaped board never leaks a blast outside itself', () => {
  for (const name of ['holes-split', 'scarf-5x9', 'coaster-5x5']) {
    const board = boardOf(name);
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        if (!cellAt(board, P(x, y)).open) continue;
        for (const r of [2, 4]) {
          for (const p of roundedSquare(board, P(x, y), r)) {
            expect({ name, open: cellAt(board, p).open }).toEqual({ name, open: true });
          }
        }
      }
    }
  }
});

test('a puff is a plus of five, clipped at the edges', () => {
  expect(plusArea(big, P(4, 4)).length).toBe(5);
  expect(plusArea(big, P(4, 0)).length).toBe(4);
  expect(plusArea(big, P(0, 0)).length).toBe(3);
  expect(keys(plusArea(big, P(4, 4)))).toEqual(['4,3', '3,4', '4,4', '5,4', '4,5']);
  const holed = parseBoard(['o. .. o.', 'o. o. o.', 'o. o. o.']);
  expect(keys(plusArea(holed, P(1, 1)))).toEqual(['0,1', '1,1', '2,1', '1,2']);
});

test('the hook sweeps three rows, three columns, or both through its own cell', () => {
  expect(hookLines(big, P(4, 4), 'rows').length).toBe(27);
  expect(hookLines(big, P(4, 0), 'rows').length).toBe(18);
  expect(hookLines(big, P(0, 4), 'cols').length).toBe(18);
  expect(hookLines(big, P(4, 4), 'both').length).toBe(45);
  expect(hookLines(big, P(0, 0), 'both').length).toBe(32);
  expect(keys(hookLines(big, P(4, 4), 'rows'))).toContain('4,4');
  expect(keys(hookLines(big, P(4, 4), 'rows'))).toContain('0,3');
  expect(keys(hookLines(big, P(4, 4), 'rows'))).not.toContain('0,2');
});

test('a hook line skips holes but keeps sweeping past them', () => {
  const board = parseBoard(['o. .. o.', 'o. .. o.', 'o. .. o.']);
  const cells = keys(hookLines(board, P(0, 1), 'rows'));
  expect(cells).toContain('2,1');
  expect(cells).not.toContain('1,1');
});

test('past a yarn bomb a combo takes the whole board, which is not a radius-5 square', () => {
  expect(openCells(big).length).toBe(81);
  expect(roundedSquare(big, P(0, 0), 5).length).toBe(35);
  expect(
    blastArea(big, { pos: P(0, 0), special: 'yarnbomb', radius: 5, orientation: null }).length,
  ).toBe(81);
  expect(openCells(boardOf('coaster-5x5')).length).toBe(21);
});

test('blastArea dispatches on the spec alone', () => {
  const at = (special, radius, orientation = null) =>
    blastArea(big, { pos: P(4, 4), special, radius, orientation }).length;
  expect(at('puff', 1)).toBe(5);
  expect(at('bobble', 2)).toBe(21);
  expect(at('popcorn', 3)).toBe(45);
  expect(at('yarnbomb', 4)).toBe(77);
  expect(at('hook', null, 'rows')).toBe(27);
  expect(at('hook', null, 'both')).toBe(45);
});

test('a combo is one blast of radius max + 1, a puff counting as one', () => {
  expect(comboRadius('puff', 'puff')).toBe(2);
  expect(comboRadius('puff', 'bobble')).toBe(3);
  expect(comboRadius('bobble', 'bobble')).toBe(3);
  expect(comboRadius('bobble', 'popcorn')).toBe(4);
  expect(comboRadius('popcorn', 'popcorn')).toBe(4);
  expect(comboRadius('yarnbomb', 'puff')).toBe(5);
  expect(comboRadius('yarnbomb', 'yarnbomb')).toBe(5);
  expect(specialForRadius(2)).toBe('bobble');
  expect(specialForRadius(3)).toBe('popcorn');
  expect(specialForRadius(4)).toBe('yarnbomb');
  expect(specialForRadius(5)).toBe('yarnbomb');
});

test('a blast takes balls, knots, specials and the frog, but never a bead', () => {
  const board = parseBoard(['o. oK oP F. *. __']);
  const take = (x) => isTakeable(cellAt(board, P(x, 0)));
  expect([take(0), take(1), take(2), take(3)]).toEqual([true, true, true, true]);
  expect(take(4)).toBe(false); // bead
  expect(take(5)).toBe(false); // empty
  expect(keys(takeableIn(board, [P(0, 0), P(4, 0), P(5, 0), P(3, 0)]))).toEqual(['0,0', '3,0']);
});

test('a bead survives a blast of every size sitting at its centre', () => {
  const board = open(9, 9);
  board.cells[4][4].piece = { kind: 'bead' };
  for (const r of [1, 2, 3, 4]) {
    const taken = takeableIn(board, roundedSquare(board, P(4, 4), r));
    expect(keys(taken)).not.toContain('4,4');
  }
});

test('a rip takes every ball of its color plus the frog that fired it', () => {
  const board = parseBoard(['o. m. o.', 'F. o. m.', 'oK m. *.']);
  const cells = keys(ripArea(board, 'olive', P(0, 1)));
  expect(cells).toEqual(['0,0', '2,0', '0,1', '1,1', '0,2']);
  // the knotted olive at (0,2) is taken; the frog's own cell is in the set
  expect(cells).toContain('0,1');
  expect(cells).toContain('0,2');
  const mustard = keys(ripArea(board, 'mustard', P(0, 1)));
  expect(mustard).toEqual(['1,0', '0,1', '2,1', '1,2']);
});

test('a rip whose frog has already been taken names only the color', () => {
  const board = parseBoard(['o. m. o.', '__ o. m.']);
  expect(keys(ripArea(board, 'olive', P(0, 1)))).toEqual(['0,0', '2,0', '1,1']);
});

test('the areas never alias the board and never mutate it', () => {
  const board = parseBoard(['o. m. o.', 'o. o. m.']);
  const before = renderBoard(board);
  roundedSquare(board, P(1, 1), 2);
  plusArea(board, P(0, 0));
  hookLines(board, P(1, 1), 'both');
  ripArea(board, 'olive', P(0, 0));
  openCells(board);
  expect(renderBoard(board)).toBe(before);
});
