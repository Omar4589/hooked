// buildMove: one engine step stream in, the whole move's timeline out. It walks the steps
// exactly as applySteps does (packages/engine/src/replay.js) — that function is the contract
// for the phone's step player — and records, for every piece it touches, what that piece does
// and when. Nothing here knows about React or Reanimated: the result is numbers.

import { buildModel, cloneModel } from './model.js';
import {
  BLAST_MS,
  BLAST_SHAKE,
  CLEAR_MS,
  CREATE_MS,
  FALL_MS,
  ILLEGAL_BACK_MS,
  ILLEGAL_OUT_MS,
  ILLEGAL_SLIDE,
  METER_DROP_MS,
  POP_MS,
  PULSE_SCALE,
  PULSE_SHARE,
  RIP_MS,
  SHUFFLE_IN_MS,
  SHUFFLE_OUT_MS,
  SWAP_MS,
} from './timings.js';

/** @typedef {import('./model.js').Model} Model */
/** @typedef {import('./timings.js').Track} Track */

/**
 * @typedef {Object} Move
 * @property {Model} model       the board when the move has finished
 * @property {Map<number, Track>} tracks  what each touched piece does
 * @property {number[]} mounts   pieces first seen this move (spawned or created)
 * @property {{ id: number, x: number, y: number, piece: object }[]} removed  cleared pieces,
 *   captured where they died, so the board can keep drawing them until they have faded
 * @property {{ at: number, before: Model }|null} shuffle
 * @property {{ at: number, duration: number, amplitude: number }[]} shakes  board-wide wobbles
 * @property {number|null} meter  the charge this move ended on, when it changed
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
  const mounts = [];
  const removed = [];
  const shakes = [];
  let meter = null;
  let shuffle = null;
  let t = 0;
  let dropped = false;

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
      initial: { x: entry.x, y: entry.y, scale: 1, opacity: 1 },
      x: [],
      y: [],
      scale: [],
      opacity: [],
    };
    tracks.set(id, track);
    return track;
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
    tracks.set(id, { base, initial, x: [], y: [], scale: [], opacity: [] });
    return id;
  };

  steps.forEach((step, index) => {
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
          } else {
            const at = t + (furthest === 0 ? 0 : (spread * reach(pos)) / furthest);
            track.scale.push({ at, duration: POP_MS, to: 0, easing: 'in' });
            track.opacity.push({ at, duration: POP_MS, to: 0, easing: 'linear' });
          }
          const entry = m.pieces.get(id);
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
        t += METER_DROP_MS;
        break;
      }
      case 'meter': {
        // The readout lives outside the board and runs off its own clock, so the meter costs the
        // move no time at all.
        meter = step.charge;
        break;
      }
      case 'shuffle': {
        if (index !== steps.length - 1) fail('a shuffle must be the last step of its move');
        settle();
        shuffle = { at: t, before: m };
        m = buildModel(step.board, m.nextId);
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
    mounts,
    removed,
    shakes,
    meter,
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
      quiet.add(`${x},${y}`);
    }
  }
  return quiet;
};
