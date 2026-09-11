// sampleTrack is the whole animation system: one pure function from (track, time) to the four
// animated numbers. Everything the board does on screen is tested here and in move.test.js,
// with no device involved.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ease, sampleCell, sampleProp, sampleShake, sampleTrack } from './animate.js';
import { FALL_OVERSHOOT } from './timings.js';

const NAMES = ['linear', 'in', 'out', 'inOut', 'outBack'];
const track = (over = {}) => ({
  base: 0,
  initial: { x: 1, y: 2, scale: 1, opacity: 1 },
  x: [],
  y: [],
  scale: [],
  opacity: [],
  ...over,
});

test('every easing runs 0 -> 1 and clamps outside the unit interval', () => {
  for (const name of NAMES) {
    assert.equal(ease(name, 0), 0, name);
    assert.equal(ease(name, 1), 1, name);
    assert.equal(ease(name, -0.5), 0, name);
    assert.equal(ease(name, 1.5), 1, name);
  }
});

test('quad out is quad in mirrored, and inOut is symmetric about the middle', () => {
  for (const u of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    assert.ok(Math.abs(ease('out', u) - (1 - ease('in', 1 - u))) < 1e-12);
    assert.ok(Math.abs(ease('inOut', u) + ease('inOut', 1 - u) - 1) < 1e-12);
  }
  assert.ok(ease('in', 0.5) < 0.5 && ease('out', 0.5) > 0.5);
});

test('ease-out-back overshoots past 1 by 4s^3 / 27(s+1)^2 and never dips below 0', () => {
  const s = FALL_OVERSHOOT;
  const expected = 1 + (4 * s ** 3) / (27 * (s + 1) ** 2);
  let peak = 0;
  for (let i = 0; i <= 1000; i += 1) {
    const v = ease('outBack', i / 1000);
    assert.ok(v >= 0);
    if (v > peak) peak = v;
  }
  assert.ok(Math.abs(peak - expected) < 1e-3, `${peak} vs ${expected}`);
});

test('sampleProp holds the initial value before the first segment', () => {
  assert.equal(sampleProp([{ at: 100, duration: 50, to: 9, easing: 'linear' }], 3, 0), 3);
  assert.equal(sampleProp([{ at: 100, duration: 50, to: 9, easing: 'linear' }], 3, 99), 3);
});

test('sampleProp interpolates inside a segment and holds its end after it', () => {
  const segs = [{ at: 0, duration: 100, to: 10, easing: 'linear' }];
  assert.equal(sampleProp(segs, 0, 50), 5);
  assert.equal(sampleProp(segs, 0, 100), 10);
  assert.equal(sampleProp(segs, 0, 1000), 10);
});

test('sampleProp holds the previous end across a gap and chains from it', () => {
  const segs = [
    { at: 0, duration: 100, to: 10, easing: 'linear' },
    { at: 200, duration: 100, to: 20, easing: 'linear' },
  ];
  assert.equal(sampleProp(segs, 0, 150), 10);
  assert.equal(sampleProp(segs, 0, 250), 15);
  assert.equal(sampleProp(segs, 0, 300), 20);
});

test('a zero-duration segment is an instant set at its time', () => {
  const segs = [{ at: 120, duration: 0, to: 1, easing: 'linear' }];
  assert.equal(sampleProp(segs, 0, 119), 0);
  assert.equal(sampleProp(segs, 0, 120), 1);
});

test('sampleTrack samples the four properties and leaves untouched ones at their initial', () => {
  const t = track({ y: [{ at: 0, duration: 200, to: 5, easing: 'linear' }] });
  assert.deepEqual(sampleTrack(t, 0), { x: 1, y: 2, scale: 1, opacity: 1 });
  assert.deepEqual(sampleTrack(t, 100), { x: 1, y: 3.5, scale: 1, opacity: 1 });
  assert.deepEqual(sampleTrack(t, 200), { x: 1, y: 5, scale: 1, opacity: 1 });
});

test('the sampling functions carry the worklet directive and import no react code', () => {
  for (const fn of [ease, sampleProp, sampleTrack, sampleCell]) {
    assert.ok(fn.toString().includes("'worklet'"), fn.name);
  }
  const src = readFileSync(new URL('./animate.js', import.meta.url), 'utf8');
  assert.ok(!/from '(react|react-native)/.test(src));
  assert.equal((src.match(/^import /gm) ?? []).length, 1); // timings only
});

test('the board shake starts and ends at rest and never exceeds its amplitude', () => {
  const shakes = [{ at: 100, duration: 250, amplitude: 0.1 }];
  assert.equal(sampleShake(shakes, 0), 0);
  assert.equal(sampleShake(shakes, 99), 0);
  assert.equal(sampleShake(shakes, 100), 0);
  assert.equal(sampleShake(shakes, 350), 0);
  assert.equal(sampleShake(shakes, 1000), 0);
  let peak = 0;
  for (let t = 100; t < 350; t += 1) peak = Math.max(peak, Math.abs(sampleShake(shakes, t)));
  assert.ok(peak > 0 && peak <= 0.1, `${peak}`);
});

test('overlapping shakes add, and an empty list is still rest', () => {
  assert.equal(sampleShake([], 50), 0);
  const two = [
    { at: 0, duration: 200, amplitude: 0.1 },
    { at: 0, duration: 200, amplitude: 0.1 },
  ];
  assert.ok(Math.abs(sampleShake(two, 40)) > Math.abs(sampleShake(two.slice(0, 1), 40)));
});

test('sampleShake carries the worklet directive', () => {
  assert.ok(sampleShake.toString().includes("'worklet'"));
});

test('sampleCell reads the seven numbers a cell draws with', () => {
  const track = {
    base: 0,
    initial: { x: 0, y: 0, scale: 1, layers: 2, moth: 0, stitch: 1, button: 1 },
    x: [],
    y: [],
    scale: [],
    layers: [{ at: 0, duration: 150, to: 1, easing: 'linear' }],
    moth: [],
    stitch: [],
    button: [{ at: 0, duration: 150, to: 0, easing: 'linear' }],
  };
  assert.deepEqual(sampleCell(track, 0), track.initial);
  assert.equal(sampleCell(track, 75).layers, 1.5);
  assert.equal(sampleCell(track, 150).layers, 1);
  assert.equal(sampleCell(track, 150).button, 0);
  assert.equal(sampleCell(track, 999).stitch, 1); // untouched properties hold their initial
});
