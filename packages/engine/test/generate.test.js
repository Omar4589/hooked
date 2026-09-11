import {
  pickColor,
  excludedColors,
  fillBoard,
  placePresets,
  isPlayable,
  generateBoard,
  shuffleBoard,
  movablePositions,
} from '../src/generate.js';
import { normalizeLevel, buildBoard } from '../src/level.js';
import { createRng } from '../src/rng.js';
import { findMatches } from '../src/match.js';
import { listValidMoves } from '../src/moves.js';
import { forEachCell, posKey, pieceAt } from '../src/board.js';
import { parseBoard, renderBoard } from '../src/text.js';
import { loadFixture, fixtureNames, seeds } from './helpers/fixtures.js';

const levels = fixtureNames().map((name) => [name, normalizeLevel(loadFixture(name))]);

test('every fixture generates a match-free board with a valid move for seeds 1..40', () => {
  for (const [name, level] of levels) {
    for (const seed of seeds(40)) {
      const board = generateBoard(level, createRng(`${name}/${seed}`));
      expect({ name, seed, matches: findMatches(board).length }).toEqual({
        name,
        seed,
        matches: 0,
      });
      expect({ name, seed, moves: listValidMoves(board).length > 0 }).toEqual({
        name,
        seed,
        moves: true,
      });
    }
  }
});

test('fillBoard alone is match-free every time, by construction', () => {
  for (const [name, level] of levels) {
    for (const seed of seeds(40)) {
      const board = fillBoard(buildBoard(level), level, createRng(`fill/${name}/${seed}`));
      expect({ name, seed, matches: findMatches(board).length }).toEqual({
        name,
        seed,
        matches: 0,
      });
    }
  }
});

test('cell types are honoured: yarn where the level says, knots knotted, beads placed, blockers empty', () => {
  const level = normalizeLevel(loadFixture('blockers-mix'));
  const board = generateBoard(level, createRng(3));
  forEachCell(board, (cell, pos) => {
    const t = level.grid[pos.y][pos.x];
    if (
      t.fill === 'yarn' &&
      !level.presets.some((p) => p.x === pos.x && p.y === pos.y && p.piece === 'frog')
    ) {
      expect(cell.piece.kind).toBe('yarn');
      expect(level.colors).toContain(cell.piece.color);
      expect(cell.piece.knotted === true).toBe(t.knot === true);
    }
    if (t.fill === 'bead') expect(cell.piece).toEqual({ kind: 'bead' });
    if (t.tangle > 0 || t.moth || !t.open) expect(cell.piece).toBeUndefined();
  });
});

test('presets land on their cells and the board stays match-free', () => {
  const level = normalizeLevel(loadFixture('blockers-mix'));
  for (const seed of seeds(20)) {
    const board = generateBoard(level, createRng(seed));
    expect(pieceAt(board, { x: 6, y: 0 }).special).toBe('puff');
    expect(pieceAt(board, { x: 3, y: 2 }).special).toBe('bobble');
    expect(pieceAt(board, { x: 0, y: 6 })).toEqual({ kind: 'frog' });
    expect(findMatches(board)).toEqual([]);
  }
});

test('a frog preset that removes the only move makes the generator retry', () => {
  const level = normalizeLevel({
    id: 1,
    name: 'frog corner',
    moves: 5,
    colors: ['olive', 'mustard', 'blush'],
    cells: ['ooo', 'ooo', 'ooo'],
    presets: [{ x: 1, y: 1, piece: 'frog' }],
  });
  let retried = 0;
  for (const seed of seeds(60)) {
    let attempts = 0;
    const accept = (b) => {
      attempts += 1;
      return isPlayable(b);
    };
    const board = generateBoard(level, createRng(seed), { accept });
    expect(pieceAt(board, { x: 1, y: 1 })).toEqual({ kind: 'frog' });
    expect(listValidMoves(board).length).toBeGreaterThan(0);
    if (attempts > 1) retried += 1;
  }
  expect(retried).toBeGreaterThan(0);
});

test('the same seed gives the same board and different seeds differ', () => {
  const level = normalizeLevel(loadFixture('square-7x7'));
  expect(generateBoard(level, createRng('a'))).toStrictEqual(generateBoard(level, createRng('a')));
  expect(renderBoard(generateBoard(level, createRng('a')))).not.toBe(
    renderBoard(generateBoard(level, createRng('b'))),
  );
});

test('weights bias generation: lavender at 3 beats olive at 0.2 by more than two to one', () => {
  const level = normalizeLevel(loadFixture('spawners-weights'));
  let lavender = 0;
  let olive = 0;
  for (const seed of seeds(200)) {
    forEachCell(generateBoard(level, createRng(seed)), (cell) => {
      if (cell.piece?.color === 'lavender') lavender += 1;
      if (cell.piece?.color === 'olive') olive += 1;
    });
  }
  expect(lavender).toBeGreaterThan(2 * olive);
});

test('pickColor respects the exclusion set and falls back when everything is excluded', () => {
  const rng = createRng('pick');
  const colors = ['olive', 'mustard', 'blush'];
  const weights = { olive: 1, mustard: 1, blush: 0 };
  for (let i = 0; i < 50; i += 1)
    expect(pickColor(colors, weights, rng, new Set(['olive']))).toBe('mustard');
  for (let i = 0; i < 50; i += 1)
    expect(['olive', 'mustard']).toContain(
      pickColor(colors, weights, rng, new Set(['olive', 'mustard'])),
    );
  for (let i = 0; i < 50; i += 1) expect(pickColor(colors, weights, rng)).not.toBe('blush');
});

test('excludedColors looks both ways along the row and the column', () => {
  const board = parseBoard(['o. o. __ m. m.', '__ __ b. __ __', '__ __ b. __ __']);
  expect([...excludedColors(board, { x: 2, y: 0 })].sort()).toEqual(['blush', 'mustard', 'olive']);
  const column = parseBoard(['__ r.', '__ r.', '__ __', '__ r.']);
  expect([...excludedColors(column, { x: 1, y: 2 })]).toEqual(['rust']);
  const straddle = parseBoard(['l. __ l.']);
  expect([...excludedColors(straddle, { x: 1, y: 0 })]).toEqual(['lavender']);
  expect([...excludedColors(board, { x: 0, y: 2 })]).toEqual([]);
});

test('fillBoard keeps pieces that are already on the board', () => {
  const level = normalizeLevel({
    id: 2,
    name: 'kept',
    moves: 5,
    colors: ['olive', 'mustard', 'blush'],
    cells: ['ooo', 'ooo', 'ooo'],
  });
  const board = buildBoard(level);
  board.cells[1][1].piece = { kind: 'yarn', color: 'olive', special: 'bobble' };
  fillBoard(board, level, createRng(1));
  expect(pieceAt(board, { x: 1, y: 1 })).toEqual({
    kind: 'yarn',
    color: 'olive',
    special: 'bobble',
  });
  expect(findMatches(board)).toEqual([]);
});

test('generateBoard throws a descriptive error when no acceptable board exists', () => {
  const level = normalizeLevel({
    id: 77,
    name: 'tiny',
    moves: 1,
    colors: ['olive', 'mustard'],
    cells: ['oo'],
  });
  expect(() => generateBoard(level, createRng(1))).toThrow(
    /level 77: no acceptable board after 200 attempts/,
  );
  expect(() => generateBoard(level, createRng(1), { attempts: 3 })).toThrow(/after 3 attempts/);
});

test('generateBoard honours a custom accept predicate', () => {
  const level = normalizeLevel(loadFixture('square-6x6'));
  const board = generateBoard(level, createRng(9), {
    accept: (b) => listValidMoves(b).length >= 8,
  });
  expect(listValidMoves(board).length).toBeGreaterThanOrEqual(8);
});

test('shuffleBoard makes a dead board playable, keeping the multiset and the fixed pieces', () => {
  const dead = parseBoard(['o. m. b. r.', 'm. b. r. o.', 'b. r. oK m.', 'r. *. m. F.']);
  expect(isPlayable(dead)).toBe(false);
  const level = normalizeLevel({
    id: 3,
    name: 'dead',
    moves: 5,
    colors: ['olive', 'mustard', 'blush', 'rust'],
    cells: ['oooo', 'oooo', 'ooko', 'obob'],
  });
  const before = movablePositions(dead)
    .map((p) => JSON.stringify(pieceAt(dead, p)))
    .sort();
  shuffleBoard(dead, level, createRng('shuffle'));
  expect(isPlayable(dead)).toBe(true);
  expect(
    movablePositions(dead)
      .map((p) => JSON.stringify(pieceAt(dead, p)))
      .sort(),
  ).toEqual(before);
  expect(pieceAt(dead, { x: 2, y: 2 })).toEqual({ kind: 'yarn', color: 'olive', knotted: true });
  expect(pieceAt(dead, { x: 1, y: 3 })).toEqual({ kind: 'bead' });
  expect(pieceAt(dead, { x: 3, y: 3 })).toEqual({ kind: 'frog' });
});

test('shuffleBoard throws when no permutation is playable', () => {
  const stuck = parseBoard(['o. m.', 'm. o.']);
  const level = normalizeLevel({
    id: 4,
    name: 'stuck',
    moves: 5,
    colors: ['olive', 'mustard'],
    cells: ['oo', 'oo'],
  });
  const before = renderBoard(stuck);
  expect(() => shuffleBoard(stuck, level, createRng(1))).toThrow(/level 4: cannot shuffle/);
  // giving up leaves the board as it was found, so the step stream still describes it exactly
  expect(renderBoard(stuck)).toBe(before);
});

test('movablePositions lists unknotted yarn only, row-major', () => {
  const board = parseBoard(['oP mK', '*. F.', 'b. #1']);
  expect(movablePositions(board).map(posKey)).toEqual(['0,0', '0,2']);
});
