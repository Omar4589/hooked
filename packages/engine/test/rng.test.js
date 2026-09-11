import { createRng, hashSeed } from '../src/rng.js';

const draws = (rng, n) => Array.from({ length: n }, () => rng.next());

test('the same seed gives the same sequence', () => {
  expect(draws(createRng(7), 1000)).toEqual(draws(createRng(7), 1000));
  expect(draws(createRng('yarn'), 100)).toEqual(draws(createRng('yarn'), 100));
});

test('different seeds give different sequences', () => {
  expect(draws(createRng(1), 20)).not.toEqual(draws(createRng(2), 20));
  expect(hashSeed('a')).not.toBe(hashSeed('b'));
});

test('a number seed and its string form are the same seed', () => {
  expect(draws(createRng(42), 50)).toEqual(draws(createRng('42'), 50));
  expect(createRng(42).seed).toBe('42');
});

test('next stays in [0, 1) and int(n) covers 0..n-1 without ever reaching n', () => {
  const rng = createRng('range');
  const seen = new Set();
  for (let i = 0; i < 10000; i += 1) {
    const r = rng.next();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
    const k = rng.int(6);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThan(6);
    seen.add(k);
  }
  expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
});

test('pick is deterministic per seed', () => {
  const items = ['a', 'b', 'c', 'd'];
  const a = createRng('pick');
  const b = createRng('pick');
  for (let i = 0; i < 50; i += 1) expect(a.pick(items)).toBe(b.pick(items));
});

test('weighted never returns a zero-weight item and honours a 3:1 ratio over 10,000 draws', () => {
  const rng = createRng('weighted');
  const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 10000; i += 1) counts[rng.weighted(['a', 'b', 'c'], [3, 1, 0])] += 1;
  expect(counts.c).toBe(0);
  const ratio = counts.a / counts.b;
  expect(ratio).toBeGreaterThan(2.7);
  expect(ratio).toBeLessThan(3.3);
});

test('weighted throws when nothing has a positive weight', () => {
  expect(() => createRng('w').weighted(['a', 'b'], [0, 0])).toThrow(/positive weight/);
});

test('shuffle permutes in place, deterministically', () => {
  const rng = createRng('shuffle');
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const result = rng.shuffle(items);
  expect(result).toBe(items);
  expect([...items].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(items).toEqual(createRng('shuffle').shuffle([1, 2, 3, 4, 5, 6, 7, 8]));
  expect(items).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
});

test('a missing seed throws', () => {
  expect(() => createRng()).toThrow(/seed/);
  expect(() => createRng(null)).toThrow(/seed/);
  expect(() => createRng('')).toThrow(/seed/);
});
