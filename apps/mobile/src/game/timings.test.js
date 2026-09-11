// The §16 durations are the one place the step player's feel is tuned; this pins them so a
// change is deliberate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from './timings.js';

test('the §16 table: swap 150 (illegal 2x120), clear 120, fall and spawn 200, shuffle 200+200', () => {
  assert.equal(T.SWAP_MS, 150);
  assert.equal(T.ILLEGAL_OUT_MS, 120);
  assert.equal(T.ILLEGAL_BACK_MS, 120);
  assert.equal(T.CLEAR_MS, 120);
  assert.equal(T.CREATE_MS, T.CLEAR_MS);
  assert.equal(T.FALL_MS, 200);
  assert.equal(T.SHUFFLE_OUT_MS, 200);
  assert.equal(T.SHUFFLE_IN_MS, 200);
});

test('the tuning knobs are numbers the phone pass can move', () => {
  assert.equal(typeof T.FALL_OVERSHOOT, 'number');
  assert.equal(typeof T.ILLEGAL_SLIDE, 'number');
  assert.ok(T.FINISH_SLACK_MS > 0);
});
