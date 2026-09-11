// The animation system, all of it: a pure function from (track, time) to the four numbers a
// piece draws with. The board runs one clock per move and every piece samples it on the UI
// thread, so pieces in a column share the same instant and a stack can never drift apart the
// way chained per-piece animations do. Being pure, it is also testable in node.

import { FALL_OVERSHOOT } from './timings.js';

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
 * Where a piece is, how big and how visible, `t` milliseconds into its move.
 * @param {Track} track
 * @param {number} t
 * @returns {{ x: number, y: number, scale: number, opacity: number }}
 */
export const sampleTrack = (track, t) => {
  'worklet';
  return {
    x: sampleProp(track.x, track.initial.x, t),
    y: sampleProp(track.y, track.initial.y, t),
    scale: sampleProp(track.scale, track.initial.scale, t),
    opacity: sampleProp(track.opacity, track.initial.opacity, t),
  };
};
