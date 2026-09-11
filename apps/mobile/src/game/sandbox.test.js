// The app plays one development board until phase 4's loader exists. That import is a scaffold,
// so it lives in exactly one file and this test keeps it there.

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

test('only the sandbox scaffold imports a level file', () => {
  const importers = sources(src)
    .filter((url) => /from '@hooked\/levels\/levels\//.test(readFileSync(url, 'utf8')))
    .map((url) => url.pathname.slice(src.pathname.length));
  assert.deepEqual(importers, ['game/sandbox.js']);
});
