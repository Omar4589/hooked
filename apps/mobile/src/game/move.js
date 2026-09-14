// buildMove: one engine step stream in, the whole move's timeline out. It walks the steps
// exactly as applySteps does (packages/engine/src/replay.js) — that function is the contract
// for the phone's step player — and records, for every piece it touches, what that piece does
// and when — and, for every cell whose layers change, what that cell shows and when. Nothing
// here knows about React or Reanimated: the result is numbers.

import { METER_FULL } from '@hooked/engine';
import { buildModel, cloneModel } from './model.js';
import {
  BEAD_EXIT_DROP,
  BEAD_EXIT_MS,
  BLAST_MS,
  BLAST_SHAKE,
  BLOCKER_MS,
  BLOCKER_SHAKE,
  CELL_POP_SCALE,
  CLEAR_MS,
  CREATE_MS,
  FALL_MS,
  ILLEGAL_BACK_MS,
  ILLEGAL_OUT_MS,
  ILLEGAL_SLIDE,
  METER_DROP_MS,
  MOTH_LUNGE,
  MOTH_MS,
  POP_MS,
  POSE,
  PULSE_SCALE,
  PULSE_SHARE,
  RIP_MS,
  SHUFFLE_IN_MS,
  SHUFFLE_OUT_MS,
  SWAP_MS,
  YARN_OVER_PLACE_MS,
} from './timings.js';

/** @typedef {import('./model.js').Model} Model */
/** @typedef {import('./timings.js').Track} Track */
/** @typedef {import('./timings.js').CellTrack} CellTrack */

/**
 * @typedef {Object} Move
 * @property {Model} model       the board when the move has finished
 * @property {Map<number, Track>} tracks  what each touched piece does
 * @property {number[]} mounts   pieces first seen this move (spawned or created)
 * @property {{ id: number, x: number, y: number, piece: object }[]} removed  cleared pieces,
 *   captured where they died, so the board can keep drawing them until they have faded
 * @property {Map<string, CellTrack>} cells  what each touched cell's layer does, keyed `x,y`
 * @property {{ at: number, before: Model }|null} shuffle
 * @property {{ at: number, duration: number, amplitude: number }[]} shakes  board-wide wobbles
 * @property {{ at: number, charge: number, full: number }[]} meterFrames  what the readout
 *   shows and when: one frame per meter step, plus the zero the drop leaves behind. The engine
 *   zeroes the charge inside the same call that fills it, so state() never shows a full meter
 *   and these frames are the only place one is ever visible
 * @property {{ at: number, coins: number, moves: number, specials: number }|null} yarnOver
 * @property {number} total      how long the move lasts, in milliseconds
 */

/**
 * @param {Model} model  never mutated
 * @param {object[]} steps  one `game.swap()` result
 * @param {number} [base]  the clock value this move starts at
 * @returns {Move}
 */
export const buildMove = (model, steps, base = 0) => {
  const fail = (msg) => {
    throw new Error(`buildMove: ${msg}`);
  };
  let m = cloneModel(model);
  const tracks = new Map();
  const cells = new Map();
  const mounts = [];
  const removed = [];
  const shakes = [];
  const meterFrames = [];
  // A drop empties the readout, but the engine's `meterDrop` step carries no `full` of its own,
  // so it borrows the one this move's meter steps used, or the constant when it charged nothing.
  let meterFull = METER_FULL;
  let shuffle = null;
  let yarnOver = null;
  let t = 0;
  let dropped = false;
  // Damage and bead exits come in runs: a cascade that strips four tangles is one event on
  // screen, not four, so consecutive steps of a kind share the window the first one opened.
  let blockerAt = null;
  let beadExitAt = null;

  // Falls and spawns of one cascade start together and take the same time, so the clock only
  // advances past them when something else needs to happen.
  const settle = () => {
    if (!dropped) return;
    t += FALL_MS;
    dropped = false;
  };

  const at = (pos, what) => {
    if (pos.x < 0 || pos.y < 0 || pos.x >= m.width || pos.y >= m.height) {
      fail(`${what} (${pos.x},${pos.y}) is off the board`);
    }
    return m.grid[pos.y][pos.x];
  };
  const idAt = (pos, what) => {
    const id = at(pos, what);
    if (id === null) fail(`${what} (${pos.x},${pos.y}) holds no piece`);
    return id;
  };
  const emptyOpen = (pos, what) => {
    if (at(pos, what) !== null) fail(`${what} (${pos.x},${pos.y}) is occupied`);
    if (!m.open[pos.y][pos.x]) fail(`${what} (${pos.x},${pos.y}) is a hole`);
  };

  /** A piece's track, created on first touch so `initial` is where it started the move. */
  const trackOf = (id) => {
    const existing = tracks.get(id);
    if (existing !== undefined) return existing;
    const entry = m.pieces.get(id);
    const track = {
      base,
      initial: { x: entry.x, y: entry.y, scale: 1, opacity: 1, pose: POSE.rest },
      x: [],
      y: [],
      scale: [],
      opacity: [],
      pose: [],
    };
    tracks.set(id, track);
    return track;
  };
  /** A cell's track, created on first touch so `initial` is what it showed at the start. */
  const cellTrackOf = (pos) => {
    const key = `${pos.x},${pos.y}`;
    const existing = cells.get(key);
    if (existing !== undefined) return existing;
    const track = {
      base,
      initial: {
        x: 0,
        y: 0,
        scale: 1,
        layers: m.tangle[pos.y][pos.x],
        moth: m.moth[pos.y][pos.x] ? 1 : 0,
        stitch: m.stitch[pos.y][pos.x],
        button: m.buried[pos.y][pos.x] ? 1 : 0,
      },
      x: [],
      y: [],
      scale: [],
      layers: [],
      moth: [],
      stitch: [],
      button: [],
    };
    cells.set(key, track);
    return track;
  };
  const endOf = (segments) =>
    segments.length === 0
      ? -1
      : segments[segments.length - 1].at + segments[segments.length - 1].duration;
  /** A shove out and back, once per window: a cell hit twice still only wobbles once. */
  const nudge = (track, axis, amount, at, ms) => {
    if (endOf(track[axis]) > at) return;
    track[axis].push({ at, duration: ms / 2, to: amount, easing: 'out' });
    track[axis].push({ at: at + ms / 2, duration: ms / 2, to: 0, easing: 'outBack' });
  };
  const popCell = (track, at, ms) => {
    if (endOf(track.scale) > at) return;
    track.scale.push({ at, duration: ms / 2, to: CELL_POP_SCALE, easing: 'out' });
    track.scale.push({ at: at + ms / 2, duration: ms / 2, to: 1, easing: 'in' });
  };
  /**
   * A pose is a picture swap, not a tween: one instant set, and nothing drawn in between. A set
   * landing at or before the start of the move writes `initial` instead of pushing a segment,
   * because sampleProp already reads a zero-duration segment at `at = 0` as its target at t = 0
   * — a segment there would leave sampleTrack(track, 0) disagreeing with track.initial, the
   * start-of-move invariant oracle.test.js holds every move of every board to.
   */
  const poseTo = (track, at, to) => {
    if (at <= 0) track.initial.pose = to;
    else track.pose.push({ at, duration: 0, to, easing: 'linear' });
  };
  /** Two layers off one cell in one window are one slide, not two. */
  const stepTo = (segments, at, ms, to) => {
    const last = segments[segments.length - 1];
    if (last !== undefined && last.at === at) last.to = to;
    else segments.push({ at, duration: ms, to, easing: 'linear' });
  };

  const place = (id, pos) => {
    m.pieces.set(id, { id, x: pos.x, y: pos.y, piece: m.pieces.get(id).piece });
    m.grid[pos.y][pos.x] = id;
  };
  const mount = (piece, pos, initial) => {
    const id = m.nextId;
    m.nextId += 1;
    m.pieces.set(id, { id, x: pos.x, y: pos.y, piece: { ...piece } });
    m.grid[pos.y][pos.x] = id;
    mounts.push(id);
    tracks.set(id, {
      base,
      initial: { ...initial, pose: POSE.rest },
      x: [],
      y: [],
      scale: [],
      opacity: [],
      pose: [],
    });
    return id;
  };

  steps.forEach((step, index) => {
    // "Consecutive" means literally next to each other in the stream.
    if (step.type !== 'blocker') blockerAt = null;
    if (step.type !== 'beadExit') beadExitAt = null;
    switch (step.type) {
      case 'swap': {
        if (index !== 0) fail('a swap must be the first step of its move');
        const axis = step.a.x === step.b.x ? 'y' : 'x';
        if (step.illegal) {
          // applySteps checks nothing on an illegal swap, and neither do we: the engine calls a
          // swap into a hole, a blocker or an empty cell illegal, so one or both sides may hold
          // no piece. Whatever is there slides out and bounces back.
          if (steps.length !== 1) fail('an illegal swap must be the only step of its move');
          let animated = 0;
          for (const [own, other] of [
            [step.a, step.b],
            [step.b, step.a],
          ]) {
            const id = at(own, 'swap cell');
            if (id === null) continue;
            const track = trackOf(id);
            const home = axis === 'x' ? own.x : own.y;
            const toward = axis === 'x' ? other.x : other.y;
            track[axis].push({
              at: 0,
              duration: ILLEGAL_OUT_MS,
              to: home + (toward - home) * ILLEGAL_SLIDE,
              easing: 'out',
            });
            track[axis].push({
              at: ILLEGAL_OUT_MS,
              duration: ILLEGAL_BACK_MS,
              to: home,
              easing: 'outBack',
            });
            animated += 1;
          }
          t = animated === 0 ? 0 : ILLEGAL_OUT_MS + ILLEGAL_BACK_MS;
          break;
        }
        const a = idAt(step.a, 'swap cell');
        const b = idAt(step.b, 'swap cell');
        const trackA = trackOf(a);
        const trackB = trackOf(b);
        const of = (pos) => (axis === 'x' ? pos.x : pos.y);
        trackA[axis].push({ at: 0, duration: SWAP_MS, to: of(step.b), easing: 'inOut' });
        trackB[axis].push({ at: 0, duration: SWAP_MS, to: of(step.a), easing: 'inOut' });
        m.grid[step.a.y][step.a.x] = null;
        m.grid[step.b.y][step.b.x] = null;
        place(a, step.b);
        place(b, step.a);
        t = SWAP_MS;
        break;
      }
      case 'clear': {
        settle();
        const cleared = new Set();
        for (const pos of step.cells) {
          const id = idAt(pos, 'clear cell');
          cleared.add(`${pos.x},${pos.y}`);
          const track = trackOf(id);
          track.scale.push({ at: t, duration: CLEAR_MS, to: 0, easing: 'in' });
          track.opacity.push({ at: t, duration: CLEAR_MS, to: 0, easing: 'linear' });
          const entry = m.pieces.get(id);
          removed.push({ id, x: entry.x, y: entry.y, piece: entry.piece });
          m.pieces.delete(id);
          m.grid[pos.y][pos.x] = null;
        }
        for (const { pos, piece } of step.created) {
          if (!cleared.has(`${pos.x},${pos.y}`)) {
            fail(`created special at (${pos.x},${pos.y}) is not among the cleared cells`);
          }
          emptyOpen(pos, 'created special');
          const id = mount(piece, pos, { x: pos.x, y: pos.y, scale: 0, opacity: 1 });
          tracks.get(id).scale.push({ at: t, duration: CREATE_MS, to: 1, easing: 'outBack' });
        }
        t += CLEAR_MS;
        break;
      }
      case 'fall': {
        // A batch, exactly like applySteps: lift every piece before placing any, or a chain in
        // one column would overwrite itself.
        const lifted = step.moves.map(({ from }) => {
          const id = idAt(from, 'fall from');
          trackOf(id);
          m.grid[from.y][from.x] = null;
          return id;
        });
        step.moves.forEach(({ from, to }, i) => {
          if (to.x !== from.x || to.y <= from.y) {
            fail(`fall (${from.x},${from.y}) to (${to.x},${to.y}) is not straight down`);
          }
          emptyOpen(to, 'fall to');
          place(lifted[i], to);
          tracks.get(lifted[i]).y.push({ at: t, duration: FALL_MS, to: to.y, easing: 'outBack' });
        });
        dropped = true;
        break;
      }
      case 'spawn': {
        // Per vertical run: the engine fills the empty prefix from the run's top, so the i-th of
        // n enters n rows above it and the stack falls in together. Below a hole there is no room
        // above, so they enter through the hole cell instead of sliding through the run above it.
        const runs = new Map();
        for (const cell of step.cells) {
          at(cell.pos, 'spawn cell');
          const top = m.runTop[cell.pos.y][cell.pos.x];
          const key = `${cell.pos.x}/${top}`;
          if (!runs.has(key)) runs.set(key, { top, cells: [] });
          runs.get(key).cells.push(cell);
        }
        for (const run of runs.values()) {
          const n = run.cells.length;
          run.cells.forEach(({ pos, piece }, i) => {
            emptyOpen(pos, 'spawn cell');
            const entry = run.top === 0 ? -(n - i) : run.top - 1;
            const id = mount(piece, pos, { x: pos.x, y: entry, scale: 1, opacity: 0 });
            const track = tracks.get(id);
            track.opacity.push({ at: t, duration: 0, to: 1, easing: 'linear' });
            track.y.push({ at: t, duration: FALL_MS, to: pos.y, easing: 'outBack' });
          });
        }
        dropped = true;
        break;
      }
      case 'blast':
      case 'frogRip': {
        // The whole firing fits one window: the special swells, then the balls pop one ring at a
        // time outward from it, the furthest landing exactly as the window closes. A firing that
        // finds its area already empty has nothing to show and costs no time.
        if (step.cells.length === 0) break;
        settle();
        const duration = step.type === 'blast' ? BLAST_MS[step.special] : RIP_MS;
        const reach = (pos) => Math.max(Math.abs(pos.x - step.pos.x), Math.abs(pos.y - step.pos.y));
        let furthest = 0;
        for (const pos of step.cells) furthest = Math.max(furthest, reach(pos));
        const spread = Math.max(0, duration - POP_MS);
        const pulse = Math.round(duration * PULSE_SHARE);
        for (const pos of step.cells) {
          const id = idAt(pos, `${step.type} cell`);
          const entry = m.pieces.get(id);
          const track = trackOf(id);
          const origin = pos.x === step.pos.x && pos.y === step.pos.y;
          if (origin) {
            track.scale.push({ at: t, duration: pulse, to: PULSE_SCALE, easing: 'out' });
            track.scale.push({ at: t + pulse, duration: duration - pulse, to: 0, easing: 'in' });
            track.opacity.push({
              at: t + pulse,
              duration: duration - pulse,
              to: 0,
              easing: 'linear',
            });
            // The tongue belongs to the piece, not to the step: only a frog rips by flicking one
            // out, and a frog a blast already took is not among these cells to be posed at all.
            if (entry.piece.kind === 'frog') poseTo(track, t, POSE.tongue);
          } else {
            const at = t + (furthest === 0 ? 0 : (spread * reach(pos)) / furthest);
            track.scale.push({ at, duration: POP_MS, to: 0, easing: 'in' });
            track.opacity.push({ at, duration: POP_MS, to: 0, easing: 'linear' });
          }
          removed.push({ id, x: entry.x, y: entry.y, piece: entry.piece });
          m.pieces.delete(id);
          m.grid[pos.y][pos.x] = null;
        }
        const amplitude = step.type === 'blast' ? BLAST_SHAKE[step.special] : BLAST_SHAKE.popcorn;
        if (amplitude > 0) shakes.push({ at: t, duration, amplitude });
        t += duration;
        break;
      }
      case 'meterDrop': {
        settle();
        const id = idAt(step.pos, 'meterDrop cell');
        const track = trackOf(id);
        track.scale.push({ at: t, duration: CLEAR_MS, to: 0, easing: 'in' });
        track.opacity.push({ at: t, duration: CLEAR_MS, to: 0, easing: 'linear' });
        const entry = m.pieces.get(id);
        removed.push({ id, x: entry.x, y: entry.y, piece: entry.piece });
        m.pieces.delete(id);
        m.grid[step.pos.y][step.pos.x] = null;
        const landed = mount(step.piece, step.pos, {
          x: step.pos.x,
          y: step.pos.y,
          scale: 0,
          opacity: 1,
        });
        tracks.get(landed).scale.push({ at: t, duration: METER_DROP_MS, to: 1, easing: 'outBack' });
        if (step.piece.kind === 'frog') {
          // the frog hops off the meter onto its cell and settles; the hook simply arrives
          poseTo(tracks.get(landed), t, POSE.hop);
          poseTo(tracks.get(landed), t + METER_DROP_MS, POSE.rest);
        }
        meterFrames.push({ at: t, charge: 0, full: meterFull });
        t += METER_DROP_MS;
        break;
      }
      case 'meter': {
        // The readout lives outside the board and runs off its own clock, so the meter costs the
        // move no time at all. The frame is the whole sighting: this charge is gone from the
        // engine's own state by the time the move finishes, full or not.
        meterFull = step.full;
        meterFrames.push({ at: t, charge: step.charge, full: step.full });
        break;
      }
      case 'shuffle': {
        if (index !== steps.length - 1) fail('a shuffle must be the last step of its move');
        settle();
        shuffle = { at: t, before: m };
        m = buildModel(step.board, m.nextId);
        break;
      }
      case 'blocker': {
        const { x, y } = step.pos;
        at(step.pos, 'blocker cell');
        if (step.kind === 'knot') {
          // Credit only, and nothing to draw: the knotted ball left through the step that took
          // it, and a special this cascade created may already be standing on its cell.
          const id = m.grid[y][x];
          if (id !== null && m.pieces.get(id).piece.knotted === true) {
            fail(`knot blocker at (${x},${y}) whose knotted ball is still there`);
          }
          break;
        }
        if (blockerAt === null) {
          settle();
          blockerAt = t;
          t += BLOCKER_MS;
        }
        const window = blockerAt;
        const track = cellTrackOf(step.pos);
        if (step.kind === 'tangle') {
          if (m.tangle[y][x] !== step.layersLeft + 1) {
            fail(`tangle at (${x},${y}) has ${m.tangle[y][x]} layers, not ${step.layersLeft + 1}`);
          }
          nudge(track, 'x', BLOCKER_SHAKE, window, BLOCKER_MS);
          stepTo(track.layers, window, BLOCKER_MS, step.layersLeft);
          m.tangle[y][x] = step.layersLeft;
          if (step.layersLeft === 0) {
            if (m.buried[y][x]) {
              track.button.push({ at: window, duration: BLOCKER_MS, to: 0, easing: 'in' });
              popCell(track, window, BLOCKER_MS);
            }
            m.buried[y][x] = false;
          }
        } else if (step.kind === 'moth') {
          if (!m.moth[y][x]) fail(`moth blocker at (${x},${y}), which holds no moth`);
          nudge(track, 'x', BLOCKER_SHAKE, window, BLOCKER_MS);
          track.moth.push({ at: window, duration: BLOCKER_MS, to: 0, easing: 'in' });
          m.moth[y][x] = false;
        } else if (step.kind === 'stitch') {
          if (m.stitch[y][x] !== step.layersLeft + 1) {
            fail(`stitch at (${x},${y}) has ${m.stitch[y][x]} layers, not ${step.layersLeft + 1}`);
          }
          stepTo(track.stitch, window, BLOCKER_MS, step.layersLeft);
          popCell(track, window, BLOCKER_MS);
          m.stitch[y][x] = step.layersLeft;
        } else {
          fail(`unknown blocker kind '${step.kind}'`);
        }
        break;
      }
      case 'mothSpread': {
        settle();
        const { from, to } = step;
        at(from, 'mothSpread from');
        if (!m.moth[from.y][from.x]) fail(`mothSpread from (${from.x},${from.y}) with no moth`);
        if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) !== 1) {
          fail(`mothSpread to (${to.x},${to.y}) is not adjacent`);
        }
        const id = idAt(to, 'mothSpread to');
        const eaten = m.pieces.get(id).piece;
        if (eaten.kind !== 'yarn' || eaten.special !== undefined || eaten.knotted === true) {
          fail(`mothSpread onto (${to.x},${to.y}), which holds no plain yarn ball`);
        }
        const ball = trackOf(id);
        ball.scale.push({ at: t, duration: CLEAR_MS, to: 0, easing: 'in' });
        ball.opacity.push({ at: t, duration: CLEAR_MS, to: 0, easing: 'linear' });
        removed.push({ id, x: to.x, y: to.y, piece: eaten });
        m.pieces.delete(id);
        m.grid[to.y][to.x] = null;
        cellTrackOf(to).moth.push({ at: t, duration: MOTH_MS, to: 1, easing: 'outBack' });
        // the moth doing the eating leans into its meal, so it reads as one thing, not two
        const axis = from.x === to.x ? 'y' : 'x';
        const toward = Math.sign(to[axis] - from[axis]) * MOTH_LUNGE;
        nudge(cellTrackOf(from), axis, toward, t, MOTH_MS);
        m.moth[to.y][to.x] = true;
        t += MOTH_MS;
        break;
      }
      case 'beadExit': {
        const id = idAt(step.pos, 'beadExit cell');
        if (m.pieces.get(id).piece.kind !== 'bead') {
          fail(`beadExit at (${step.pos.x},${step.pos.y}), which holds no bead`);
        }
        if (beadExitAt === null) {
          settle();
          beadExitAt = t;
          t += BEAD_EXIT_MS;
        }
        const entry = m.pieces.get(id);
        trackOf(id).y.push({
          at: beadExitAt,
          duration: BEAD_EXIT_MS,
          to: m.height + BEAD_EXIT_DROP,
          easing: 'in',
        });
        removed.push({ id, x: entry.x, y: entry.y, piece: entry.piece });
        m.pieces.delete(id);
        m.grid[step.pos.y][step.pos.x] = null;
        break;
      }
      case 'yarnOver': {
        // The bonus places every special at once and then fires them, so they pop in one after
        // another inside one window. Each is a fresh piece over the ghost of the ball it
        // replaced, the same shape a created special takes, so its letter appears when it pops
        // rather than a second early.
        settle();
        const n = step.specials.length;
        const span = n <= 1 ? CREATE_MS : YARN_OVER_PLACE_MS;
        const seen = new Set();
        step.specials.forEach(({ pos, piece }, i) => {
          const key = `${pos.x},${pos.y}`;
          if (seen.has(key)) fail(`yarnOver names (${pos.x},${pos.y}) twice`);
          seen.add(key);
          const id = idAt(pos, 'yarnOver cell');
          const was = m.pieces.get(id).piece;
          if (was.kind !== 'yarn' || was.special !== undefined || was.knotted === true) {
            fail(`yarnOver onto (${pos.x},${pos.y}), which holds no plain yarn ball`);
          }
          if (piece.special === undefined || piece.color !== was.color) {
            fail(`yarnOver at (${pos.x},${pos.y}) must place a special riding the same ball`);
          }
          const start = t + (n <= 1 ? 0 : ((span - CREATE_MS) * i) / (n - 1));
          const old = trackOf(id);
          old.scale.push({ at: start, duration: CREATE_MS, to: 0, easing: 'in' });
          old.opacity.push({ at: start, duration: CREATE_MS, to: 0, easing: 'linear' });
          removed.push({ id, x: pos.x, y: pos.y, piece: was });
          m.pieces.delete(id);
          m.grid[pos.y][pos.x] = null;
          const fresh = mount(piece, pos, { x: pos.x, y: pos.y, scale: 0, opacity: 1 });
          tracks.get(fresh).scale.push({
            at: start,
            duration: CREATE_MS,
            to: 1,
            easing: 'outBack',
          });
        });
        yarnOver = { at: t, coins: step.coins, moves: step.moves, specials: n };
        if (n > 0) t += span;
        break;
      }
      default:
        fail(`unsupported step type '${step.type}'`);
    }
  });

  settle();
  return {
    model: m,
    tracks,
    cells,
    mounts,
    removed,
    shakes,
    meterFrames,
    yarnOver,
    shuffle,
    total: shuffle === null ? t : shuffle.at + SHUFFLE_OUT_MS + SHUFFLE_IN_MS,
  };
};

/**
 * The cells a move leaves completely alone: same piece before and after, and that piece does not
 * so much as wobble. They are the only cells a swipe made during playback can safely mean, since
 * what the player is aiming at there is exactly what they will get when the board settles.
 * @param {Model} previous  the model the move started from
 * @param {Move} move
 * @returns {Set<string>} `${x},${y}` keys
 */
export const quietCells = (previous, move) => {
  const quiet = new Set();
  if (move.shuffle !== null) return quiet; // every piece is about to be replaced
  for (let y = 0; y < previous.height; y += 1) {
    for (let x = 0; x < previous.width; x += 1) {
      const id = previous.grid[y][x];
      if (id === null || move.model.grid[y][x] !== id || move.tracks.has(id)) continue;
      if (move.cells.has(`${x},${y}`)) continue; // its layer moved, even if its piece did not
      quiet.add(`${x},${y}`);
    }
  }
  return quiet;
};
