// Fixture loading for tests. Fixtures are engine test and CLI inputs in ../../fixtures, not
// shipped levels (those live in packages/levels from phase 4). node: imports are fine here.

import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../../fixtures/', import.meta.url);

/** Every fixture name (file name without .json), sorted. */
export const fixtureNames = () =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();

/** A fresh parsed copy of one fixture. @param {string} name */
export const loadFixture = (name) => JSON.parse(readFileSync(new URL(`${name}.json`, dir), 'utf8'));

/** Seeds 1..n. @param {number} n */
export const seeds = (n) => Array.from({ length: n }, (_, i) => i + 1);
