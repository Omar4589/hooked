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

test('the §16 firing durations: puff 150, bobble 250, popcorn 350, yarn bomb 450, hook 250', () => {
  assert.deepEqual(T.BLAST_MS, {
    puff: 150,
    bobble: 250,
    popcorn: 350,
    yarnbomb: 450,
    hook: 250,
  });
  assert.equal(T.RIP_MS, 400);
  assert.equal(T.METER_DROP_MS, 300);
  assert.equal(T.METER_MS, 150);
});

test('a pop fits inside every firing window, so the last ball lands as it closes', () => {
  for (const ms of Object.values(T.BLAST_MS)) assert.ok(ms >= T.POP_MS, `${ms}`);
  assert.ok(T.RIP_MS >= T.POP_MS);
  assert.ok(T.PULSE_SHARE > 0 && T.PULSE_SHARE < 1);
  assert.ok(T.PULSE_SCALE > 1);
});

test('a puff does not shake the board; the bigger blasts shake harder', () => {
  assert.equal(T.BLAST_SHAKE.puff, 0);
  assert.ok(T.BLAST_SHAKE.bobble < T.BLAST_SHAKE.popcorn);
  assert.ok(T.BLAST_SHAKE.popcorn < T.BLAST_SHAKE.yarnbomb);
  assert.ok(T.BLAST_SHAKE.yarnbomb < 0.5); // never enough to read as a piece moving
});
