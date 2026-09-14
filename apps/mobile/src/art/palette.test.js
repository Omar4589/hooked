// The palette is the one place a colour hex is allowed to live, so these tests guard the two
// things a hex tweak can silently break: the greyscale spread the art brief requires, and the
// colour names, which are owned by the engine's constants.js and only mirrored here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS } from '@hooked/engine';
import {
  COLOR_KEYS,
  CREAM,
  OAT,
  PALETTE,
  YARN_NAMES,
  assertGreyscaleSpread,
  greyValue,
  luminance,
} from './palette.js';

test('the greyscale spread clears the brief at its default and at 20', () => {
  assert.equal(assertGreyscaleSpread(), true);
  assert.equal(assertGreyscaleSpread(18), true);
  assert.equal(assertGreyscaleSpread(20), true);
});

test('a minimum gap of 30 fails and the message names the tightest pair', () => {
  // rust 100.4 and olive 124.2 are the closest neighbours, 23.8 apart.
  assert.throws(
    () => assertGreyscaleSpread(30),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /rust/);
      assert.match(err.message, /olive/);
      assert.match(err.message, /23\.8/);
      assert.match(err.message, /30/);
      return true;
    },
  );
});

test('the colour keys are the engine list, in the engine order', () => {
  assert.deepEqual([...COLOR_KEYS], [...COLORS]);
});

test('every colour has a hex and a display name, and neither table has extras', () => {
  assert.deepEqual(Object.keys(PALETTE).sort(), [...COLOR_KEYS].sort());
  assert.deepEqual(Object.keys(YARN_NAMES).sort(), [...COLOR_KEYS].sort());
  for (const key of COLOR_KEYS) {
    assert.match(PALETTE[key], /^#[0-9A-F]{6}$/i, key);
    assert.equal(typeof YARN_NAMES[key], 'string', key);
    assert.ok(YARN_NAMES[key].length > 0, key);
  }
});

test('oat is the name the art docs use for the same cream, and it is not a yarn', () => {
  assert.equal(OAT, CREAM);
  assert.match(CREAM, /^#[0-9A-F]{6}$/i);
  // Pieces are painted on cream, so it has to clear them the way they clear each other:
  // never a piece hex, and never close enough to merge with one in greyscale.
  for (const key of COLOR_KEYS) {
    assert.notEqual(PALETTE[key], CREAM, key);
    assert.ok(Math.abs(greyValue(PALETTE[key]) - greyValue(CREAM)) >= 18, key);
  }
});

test('both brightness measures run black to white across their own scale', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#FFFFFF'), 1);
  assert.equal(greyValue('#000000'), 0);
  assert.ok(Math.abs(greyValue('#FFFFFF') - 255) < 1e-9); // the channel weights sum to 1 - 1 ulp
  assert.ok(greyValue(PALETTE.cocoa) < greyValue(PALETTE.blush));
});
