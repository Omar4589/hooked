// The phase-2 development board (levels/dev/sandbox-9x9.json): the only level the app plays
// until phase 4's loader exists. It is reached through this package's `exports` subpath and
// never listed by listLevels(). Generation is exercised through createGame, the engine's public
// surface (its exports map seals src/generate.js).

import { readFileSync } from 'node:fs';
import { COLORS, MAX_BOARD_SIZE, createGame, normalizeLevel } from '@hooked/engine';
import { listLevels } from '../src/index.js';

const read = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));
const sandbox = read('../levels/dev/sandbox-9x9.json');
const hookBoard = read('../levels/dev/sandbox-hook-9x9.json');

test('the sandbox is a full-size open board in every palette color, outside the fixture id range', () => {
  const level = normalizeLevel(sandbox);
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
  const level = normalizeLevel(hookBoard);
  expect(level.width).toBe(MAX_BOARD_SIZE);
  expect(level.meter).toBe('hook');
  expect(level.colors).toEqual([...COLORS]);
  expect(level.presets.map((p) => p.piece)).toEqual(['hook']);
  expect(level.id).not.toBe(normalizeLevel(sandbox).id);
});

test('both dev boards play for every seed: a board with a move on the first try', () => {
  for (const board of [sandbox, hookBoard]) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = createGame(board, `sandbox/${seed}`);
      const state = game.state();
      expect(state.status).toBe('playing');
      expect(state.board.cells.flat().every((c) => c.open && c.piece?.kind === 'yarn')).toBe(true);
      expect(game.validMoves().length).toBeGreaterThan(0);
      expect(state.meter.charge).toBe(0);
    }
  }
});

test('the app reaches dev boards through the exports subpath; the registry stays empty', () => {
  const pkg = read('../package.json');
  expect(pkg.exports['./levels/dev/*.json']).toBe('./levels/dev/*.json');
  expect(listLevels()).toEqual([]);
});
