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

/**
 * What one *cell* does during one move: a tangle losing a layer, a moth arriving or going, a
 * stitch square flipping, a button coming out. Same shape and same clock as a Track, but the
 * values are what the cell shows rather than where a piece is — `x` and `y` are a nudge in
 * place, never a move.
 * @typedef {Object} CellTrack
 * @property {number} base
 * @property {{ x: number, y: number, scale: number, layers: number, moth: number,
 *   stitch: number, button: number }} initial
 * @property {Segment[]} x
 * @property {Segment[]} y
 * @property {Segment[]} scale
 * @property {Segment[]} layers   tangle layers drawn
 * @property {Segment[]} moth     0 to 1, the moth's presence
 * @property {Segment[]} stitch   unstitched layers drawn
 * @property {Segment[]} button   0 to 1, the buried button's presence
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

/**
 * A blast takes as long as its size (§16). The whole firing fits in this window: the special
 * pulses, then the balls pop one ring at a time outward from it, the furthest landing exactly at
 * the end.
 */
export const BLAST_MS = Object.freeze({
  puff: 150,
  bobble: 250,
  popcorn: 350,
  yarnbomb: 450,
  hook: 250,
});

/** "every ball of that color pops in a wave outward from the frog" (§16). */
export const RIP_MS = 400;

/** How long one ball takes to pop inside a wave. */
export const POP_MS = CLEAR_MS;

/** How far into a firing the special itself swells before it goes, as a fraction of the window. */
export const PULSE_SHARE = 1 / 3;

/** How big that swell is. */
export const PULSE_SCALE = 1.25;

/**
 * How hard the board shakes for each size, in cells. A puff is a pop, not an explosion, so it
 * does not shake at all; the bigger blasts do, which is §16's "bigger radius, bigger ring,
 * longer shake" without a ring to draw yet.
 */
export const BLAST_SHAKE = Object.freeze({
  puff: 0,
  bobble: 0.06,
  popcorn: 0.1,
  yarnbomb: 0.16,
  hook: 0.08,
});

/** How long one shake wobble takes; the blast's window holds as many as it fits. */
export const SHAKE_STEP_MS = 50;

/** The frog or the hook hops onto its cell (§16). */
export const METER_DROP_MS = 300;

/** The meter readout fills a notch (§16). It runs off the board's own clock, not the move's. */
export const METER_MS = 150;

/** How late the JS safety net fires when the UI clock's own callback never arrives. */
export const FINISH_SLACK_MS = 250;

/** A tangle, moth or knot shakes and loses a layer; a stitch square flips (§16). */
export const BLOCKER_MS = 150;

/** How far a tangle or a moth nudges sideways as it is hit, in cells. */
export const BLOCKER_SHAKE = 0.08;

/** The scale pop of a stitch square flipping, and of a button coming out of its tangle. */
export const CELL_POP_SCALE = 1.15;

/** A moth eats the ball beside it and a new one grows there (§16 `mothSpread`). */
export const MOTH_MS = 250;

/** How far the moth that is eating lunges toward its meal, in cells. */
export const MOTH_LUNGE = 0.2;

/** A bead drops off the bottom edge (§16 `beadExit`). */
export const BEAD_EXIT_MS = 250;

/** How far past the edge it drops before the board's clip takes it, in cells. */
export const BEAD_EXIT_DROP = 0.5;

/** Yarn Over places its specials inside this window, one after another (§16 `yarnOver`). */
export const YARN_OVER_PLACE_MS = 400;
