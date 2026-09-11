import { normalizeLevel } from '../src/level.js';
import { generateBoard } from '../src/generate.js';
import { createRng } from '../src/rng.js';
import { loadFixture, fixtureNames, seeds } from './helpers/fixtures.js';

test('the ten fixtures exist with numeric ids in the 9001 range', () => {
  const names = fixtureNames();
  expect(names).toEqual([
    'blockers-mix',
    'coaster-5x5',
    'dead-prone-5x5',
    'holes-split',
    'hook-meter',
    'scarf-5x9',
    'spawners-weights',
    'specials-holes',
    'square-6x6',
    'square-7x7',
  ]);
  const ids = names.map((n) => loadFixture(n).id).sort();
  expect(ids).toEqual([9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010]);
  for (const n of names) {
    const f = loadFixture(n);
    expect(typeof f.name).toBe('string');
    expect(typeof f.coins).toBe('number');
    expect(typeof f.meter).toBe('string');
  }
});

test('every fixture normalizes and generates for seeds 1..50', () => {
  for (const name of fixtureNames()) {
    const level = normalizeLevel(loadFixture(name));
    for (const seed of seeds(50)) {
      expect(() => generateBoard(level, createRng(`${name}#${seed}`))).not.toThrow();
    }
  }
});
