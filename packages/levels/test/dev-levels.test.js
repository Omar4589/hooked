// The development boards: the two sandboxes phases 2 and 3 played, and the three test levels
// phase 4 added. Each of the three is played out by the engine's random bot, because a level
// nobody can win and nobody can lose is not a level.

import {
  COLORS,
  MAX_BOARD_SIZE,
  createGame,
  createRandomBot,
  createRng,
  normalizeLevel,
} from '@hooked/engine';
import { listDevLevels, loadLevel } from '../src/index.js';

const seeds = (n) => Array.from({ length: n }, (_, i) => i + 1);
const fires = (piece) =>
  piece !== undefined && (piece.special !== undefined || piece.kind === 'frog');

/** The first cell a double-tap would fire: the engine keeps this predicate to itself. */
const firstFireable = (board) => {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = board.cells[y][x];
      if (cell.open && !(cell.tangle > 0) && cell.moth !== true && fires(cell.piece)) {
        return { x, y };
      }
    }
  }
  return null;
};

/**
 * A random legal swap when one exists, else a tap on the first thing that fires. Every turn
 * spends a move, so the game always reaches `won` or `lost`.
 */
const playOut = (json, seed) => {
  const game = createGame(json, `dev/${json.id}/${seed}`);
  const pick = createRandomBot(createRng(`bot/${json.id}/${seed}`), { specials: true });
  for (let turn = 0; game.state().status === 'playing'; turn += 1) {
    expect({ id: json.id, seed, turn: turn < 400 }).toEqual({ id: json.id, seed, turn: true });
    const move = pick(game);
    if (move !== null) {
      game.swap(...move);
      continue;
    }
    const target = firstFireable(game.state().board);
    expect({ id: json.id, seed, stuck: target === null }).toEqual({
      id: json.id,
      seed,
      stuck: false,
    });
    expect(game.tap(target).steps.length).toBeGreaterThan(0);
  }
  return game.state();
};

test('the sandbox is a full-size open board in every palette color, outside the fixture id range', () => {
  const level = normalizeLevel(loadLevel(9901));
  expect(level.width).toBe(MAX_BOARD_SIZE);
  expect(level.height).toBe(MAX_BOARD_SIZE);
  expect(level.grid.flat().every((t) => t.open)).toBe(true);
  expect(level.colors).toEqual([...COLORS]);
  expect(level.meter).toBe('frog');
  expect(level.goals).toEqual([]);
  expect(level.moves).toBe(999);
  expect(level.id).toBeGreaterThanOrEqual(9900);
  // one of each blast, so every row of the §4 table is reachable in the first few moves
  expect(level.presets.map((p) => p.piece).sort()).toEqual([
    'bobble',
    'popcorn',
    'puff',
    'yarnbomb',
  ]);
});

test('the hook board is the same board on the hook meter', () => {
  const level = normalizeLevel(loadLevel(9902));
  expect(level.width).toBe(MAX_BOARD_SIZE);
  expect(level.meter).toBe('hook');
  expect(level.colors).toEqual([...COLORS]);
  expect(level.presets.map((p) => p.piece)).toEqual(['hook']);
  expect(level.id).not.toBe(9901);
});

test('both sandboxes play for every seed: a board with a move on the first try', () => {
  for (const id of [9901, 9902]) {
    for (const seed of seeds(20)) {
      const game = createGame(loadLevel(id), `sandbox/${seed}`);
      const state = game.state();
      expect(state.status).toBe('playing');
      expect(state.board.cells.flat().every((c) => c.open && c.piece?.kind === 'yarn')).toBe(true);
      expect(game.validMoves().length).toBeGreaterThan(0);
      expect(state.meter.charge).toBe(0);
    }
  }
});

test('the three test levels start with the goal totals their boards imply', () => {
  const totals = (id) =>
    createGame(loadLevel(id), 1)
      .state()
      .goals.map((g) => [g.type, g.blocker ?? g.color, g.total, g.remaining]);
  expect(totals(9903)).toEqual([['stitch', undefined, 17, 17]]);
  expect(totals(9904)).toEqual([
    ['collect', 'rust', 30, 30],
    ['beads', undefined, 3, 3],
  ]);
  expect(totals(9905)).toEqual([
    ['clear', 'moth', 2, 2],
    ['clear', 'tangle', 4, 4],
    ['buried', undefined, 2, 2],
  ]);
});

test.each([[9903], [9904], [9905]])(
  'dev level %i: the random bot both wins and loses it over seeds 1-20',
  (id) => {
    const json = loadLevel(id);
    const ends = seeds(20).map((seed) => ({ seed, ...playOut(json, seed) }));
    const statuses = ends.map((e) => e.status);
    expect(statuses).toContain('won');
    expect(statuses).toContain('lost');
    for (const end of ends) {
      const where = { id, seed: end.seed };
      if (end.status === 'won') {
        expect({ ...where, moves: end.moves }).toEqual({ ...where, moves: 0 });
        expect({ ...where, left: end.goals.map((g) => g.remaining) }).toEqual({
          ...where,
          left: end.goals.map(() => 0),
        });
        expect(end.coins).toBeGreaterThanOrEqual(json.coins);
      } else {
        // out of moves with something still to do, or a board no shuffle could save
        const unfinished = end.goals.some((g) => g.remaining > 0);
        expect({ ...where, unfinished }).toEqual({ ...where, unfinished: true });
      }
    }
  },
);

test('the dev list and the loader agree on what exists', () => {
  expect(listDevLevels().map((l) => l.name)).toEqual([
    'Sandbox 9x9',
    'Sandbox 9x9 (hook)',
    'Ring coaster',
    'Charm tail',
    'Moths in the stash',
  ]);
});
