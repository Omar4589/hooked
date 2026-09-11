// Levels reach the app only through @hooked/levels' loader (CLAUDE.md "Never hardcode a level
// in code"). The phase-2 scaffold that named a level file is gone; this test keeps every file
// under src/ from naming one again, by package subpath or by relative path.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const src = new URL('../', import.meta.url);

const sources = (dir, found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
    if (entry.isDirectory()) sources(url, found);
    else if (/\.jsx?$/.test(entry.name) && !entry.name.endsWith('.test.js')) found.push(url);
  }
  return found;
};

test('no app file names a level file: levels come from the loader', () => {
  const importers = sources(src)
    .filter((url) =>
      /from '(@hooked\/levels\/levels\/|(\.\.\/)+packages\/levels\/)/.test(
        readFileSync(url, 'utf8'),
      ),
    )
    .map((url) => url.pathname.slice(src.pathname.length));
  assert.deepEqual(importers, []);
});
