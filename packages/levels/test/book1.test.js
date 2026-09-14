// Book 1 level 1 (docs/LEVELS-BOOK1.md row 1): "Coaster (olive)", the first project a player
// crochets. Its shape is asserted against that row, and the engine's random bot plays it out,
// on dev-levels.test.js's principle and with its harness: a level nobody can win and nobody can
// lose is not a level.
//
// LIVENESS, NOT DIFFICULTY TUNING. All the bot has to show here is that both endings are
// reachable. The §11 win-rate targets (easy 60-80 %, medium 35-50 %, hard 15-25 %) are measured
// with the greedy bot and phase 6's sims set them by tuning moves, colours and blocker density;
// nothing in this file is a balance number, and nothing here should be read as one.

import { createGame, createRandomBot, createRng } from '@hooked/engine';
import { loadLevel, validateLevel } from '../src/index.js';
import { REGISTRY } from '../src/registry.js';

/** Book 1 level 1. A level is one JSON file plus one registry line; its id is the handle. */
const LEVEL_ID = 1;

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
 * dev-levels.test.js's playthrough, pointed at a shipped level: a random legal swap when one
 * exists, else a tap on the first thing that fires. Every turn spends a move, so the game
 * always reaches `won` or `lost`.
 */
const playOut = (json, seed) => {
  const game = createGame(json, `book1/${json.id}/${seed}`);
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

test('level 1 loads as a fresh copy, validates, and is a shipped Book 1 level', () => {
  const json = loadLevel(LEVEL_ID);
  expect([json.id, json.book]).toEqual([1, 1]);
  expect(json.hidden).not.toBe(true); // the play sequence starts here; nothing hides level 1
  expect(loadLevel(LEVEL_ID)).not.toBe(json);
  expect(validateLevel(json).id).toBe(LEVEL_ID);
  // Book 1 is filed under levels/book1/, and the path is what makes a level shipped: the catalog
  // reads `dev/` off the registry name, and levels/README.md still documents a rival convention
  expect(REGISTRY.find((e) => e.json.id === LEVEL_ID)?.name.split('/')[0]).toBe('book1');
});

test('level 1 is LEVELS-BOOK1 row 1: Coaster (olive), 5x5 round-ish, 5 colours, 20 moves', () => {
  const json = loadLevel(LEVEL_ID);
  const level = validateLevel(json);
  expect(level.name).toBe('Coaster (olive)');
  // the project id the row's last paragraph fixes, read off the file itself because that is what
  // the illustration registry keys on: projectKeyOf takes the loaded JSON, not a normalized copy
  expect(json.project).toBe('coaster_olive');
  expect([level.width, level.height]).toEqual([5, 5]);
  expect(level.colors.length).toBe(5);
  expect(level.moves).toBe(20);
  expect(level.meter).toBe('none');
  expect(level.hard).toBe(false); // the row's Hard column is "–"; only level 12 is flagged
  expect(level.tutorial).toEqual(['swap', 'puff']); // "`swap`, then `puff`"
});

test('level 1 is round-ish, and its Goals column reads "Stitch, 1 layer"', () => {
  const level = validateLevel(loadLevel(LEVEL_ID));
  const cells = level.grid.flat();
  // "round-ish" on a 5x5 is the square with its four corners masked off: 21 playable cells
  expect([
    level.grid[0][0].open,
    level.grid[0][4].open,
    level.grid[4][0].open,
    level.grid[4][4].open,
  ]).toEqual([false, false, false, false]);
  expect(cells.filter((t) => t.open).length).toBe(21);
  // "Stitch, 1 layer": every playable square is marked, and every mark is a single layer
  const stitched = cells.filter((t) => t.stitch > 0);
  expect(stitched.length).toBe(21);
  expect([...new Set(stitched.map((t) => t.stitch))]).toEqual([1]);
  expect(level.goals).toEqual([{ type: 'stitch' }]);
});

test('level 1 starts with the goal total its board implies', () => {
  const goals = createGame(loadLevel(LEVEL_ID), 1)
    .state()
    .goals.map((g) => [g.type, g.total, g.remaining]);
  expect(goals).toEqual([['stitch', 21, 21]]);
});

test('the random bot both wins and loses level 1 over seeds 1-20', () => {
  const json = loadLevel(LEVEL_ID);
  const ends = seeds(20).map((seed) => ({ seed, ...playOut(json, seed) }));
  const statuses = ends.map((e) => e.status);
  expect(statuses).toContain('won');
  expect(statuses).toContain('lost');
  for (const end of ends) {
    const where = { id: LEVEL_ID, seed: end.seed };
    if (end.status === 'won') {
      expect({ ...where, moves: end.moves }).toEqual({ ...where, moves: 0 });
      expect({ ...where, left: end.goals.map((g) => g.remaining) }).toEqual({
        ...where,
        left: end.goals.map(() => 0),
      });
      expect(end.coins).toBeGreaterThanOrEqual(json.coins);
    } else {
      // out of moves with squares still unstitched
      const unfinished = end.goals.some((g) => g.remaining > 0);
      expect({ ...where, unfinished }).toEqual({ ...where, unfinished: true });
    }
  }
});
