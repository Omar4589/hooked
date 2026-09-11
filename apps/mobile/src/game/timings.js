// Every duration the step player uses, from docs/DESIGN.md §16 ("starting values; tune by
// feel"). They live here alone so the phone pass is a one-file edit.

/**
 * One property's move over time, in grid units. `at` is milliseconds from the start of the move
 * (not from the previous segment): a move is one absolute timeline, sampled by
 * ./animate.js. A property's segments are sorted and never overlap; `duration` may be 0 for an
 * instant set.
 * @typedef {Object} Segment
 * @property {number} at
 * @property {number} duration
 * @property {number} to
 * @property {'linear'|'in'|'out'|'inOut'|'outBack'} easing
 */

/**
 * What one piece does during one move. `base` is the clock value its `at = 0` sits at, so a
 * piece needs nothing but its track and the board's clock to draw itself.
 * @typedef {Object} Track
 * @property {number} base
 * @property {{ x: number, y: number, scale: number, opacity: number }} initial
 * @property {Segment[]} x
 * @property {Segment[]} y
 * @property {Segment[]} scale
 * @property {Segment[]} opacity
 */

/** Both pieces slide to each other's cell. */
export const SWAP_MS = 150;

/** An illegal swap slides out and bounces back: 120 out, 120 back. */
export const ILLEGAL_OUT_MS = 120;
export const ILLEGAL_BACK_MS = 120;

/** How far out an illegal swap slides, as a fraction of a cell (1 = all the way). */
export const ILLEGAL_SLIDE = 1;

/** Cleared pieces scale to 0 and fade; a special created by that clear pops in over the same. */
export const CLEAR_MS = 120;
export const CREATE_MS = CLEAR_MS;

/** Falls and spawns run together, with a slight overshoot. */
export const FALL_MS = 200;

/** `s` of the ease-out-back curve: peak overshoot is 4s^3 / 27(s+1)^2 of the distance. */
export const FALL_OVERSHOOT = 1;

/** "Untangling…": the board fades out, is rebuilt from the snapshot, fades back in. */
export const SHUFFLE_OUT_MS = 200;
export const SHUFFLE_IN_MS = 200;

/** How late the JS safety net fires when the UI clock's own callback never arrives. */
export const FINISH_SLACK_MS = 250;
