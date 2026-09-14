// The animation system, all of it: a pure function from (track, time) to the five numbers a
// piece draws with — where it is, how big, how visible, and which picture of itself it shows. The board runs one clock per move and every piece samples it on the UI
// thread, so pieces in a column share the same instant and a stack can never drift apart the
// way chained per-piece animations do. Being pure, it is also testable in node.

import { FALL_OVERSHOOT, SHAKE_STEP_MS } from './timings.js';

/** @typedef {import('./timings.js').Segment} Segment */
/** @typedef {import('./timings.js').Track} Track */

/**
 * Easing by name, clamped outside [0, 1]. `outBack` overshoots its target and settles back.
 * @param {Segment['easing']} name
 * @param {number} u
 * @returns {number}
 */
export const ease = (name, u) => {
  'worklet';
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (name === 'linear') return u;
  if (name === 'in') return u * u;
  if (name === 'out') return 1 - (1 - u) * (1 - u);
  if (name === 'inOut') return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
  if (name === 'outBack') {
    const v = 1 - u;
    return 1 - v * v * ((FALL_OVERSHOOT + 1) * v - FALL_OVERSHOOT);
  }
  return u;
};

/**
 * One property at time `t`: its initial value until the first segment, the eased blend inside
 * one, and the last value reached after them.
 * @param {Segment[]} segments
 * @param {number} initial
 * @param {number} t
 * @returns {number}
 */
export const sampleProp = (segments, initial, t) => {
  'worklet';
  let from = initial;
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i];
    if (t < s.at) return from;
    if (t < s.at + s.duration)
      return from + (s.to - from) * ease(s.easing, (t - s.at) / s.duration);
    from = s.to;
  }
  return from;
};

/**
 * Where a piece is, how big and how visible, `t` milliseconds into its move — and which picture
 * it is drawn as. A pose names a drawing rather than a distance, so it is only ever one of the
 * values its track was given: its sets are all zero-duration, and those never blend.
 * @param {Track} track
 * @param {number} t
 * @returns {{ x: number, y: number, scale: number, opacity: number, pose: number }}
 */
export const sampleTrack = (track, t) => {
  'worklet';
  return {
    x: sampleProp(track.x, track.initial.x, t),
    y: sampleProp(track.y, track.initial.y, t),
    scale: sampleProp(track.scale, track.initial.scale, t),
    opacity: sampleProp(track.opacity, track.initial.opacity, t),
    pose: sampleProp(track.pose, track.initial.pose, t),
  };
};

/**
 * What a cell shows `t` milliseconds into its move: where it is nudged to, how big it is, and
 * how much of each layer is still drawn.
 * @param {import('./timings.js').CellTrack} track
 * @param {number} t
 * @returns {{ x: number, y: number, scale: number, layers: number, moth: number,
 *   stitch: number, button: number }}
 */
export const sampleCell = (track, t) => {
  'worklet';
  return {
    x: sampleProp(track.x, track.initial.x, t),
    y: sampleProp(track.y, track.initial.y, t),
    scale: sampleProp(track.scale, track.initial.scale, t),
    layers: sampleProp(track.layers, track.initial.layers, t),
    moth: sampleProp(track.moth, track.initial.moth, t),
    stitch: sampleProp(track.stitch, track.initial.stitch, t),
    button: sampleProp(track.button, track.initial.button, t),
  };
};

/**
 * How far the whole board is pushed sideways at time `t`, in cells. A blast wobbles the board
 * either side of centre and settles back to nothing, so the shake never moves a piece relative
 * to its neighbours and never needs a track of its own.
 * @param {{ at: number, duration: number, amplitude: number }[]} shakes
 * @param {number} t
 * @returns {number}
 */
export const sampleShake = (shakes, t) => {
  'worklet';
  let offset = 0;
  for (let i = 0; i < shakes.length; i += 1) {
    const shake = shakes[i];
    if (t < shake.at || t >= shake.at + shake.duration) continue;
    const u = (t - shake.at) / shake.duration;
    // a sine wobble that decays to nothing by the end of the window
    const wobbles = Math.max(1, Math.round(shake.duration / SHAKE_STEP_MS));
    offset += shake.amplitude * (1 - u) * Math.sin(u * wobbles * Math.PI);
  }
  return offset;
};
