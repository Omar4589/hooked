import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSeed } from './seed.js';

test('a seed is a fresh non-empty string', () => {
  const before = Date.now();
  const seed = newSeed();
  assert.match(seed, /^\d+$/);
  assert.ok(Number(seed) >= before && Number(seed) <= Date.now());
});
