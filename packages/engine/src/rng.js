// Seeded random numbers. Every random decision in the engine (board fill, presets, refill
// colors, shuffles) draws from one of these, in a fixed order, so the same seed and the same
// moves always give the same boards and steps (DESIGN.md §3 "Randomness").

/**
 * FNV-1a over `String(seed)`, so numbers and strings share one stream space:
 * createRng(42) behaves like createRng('42').
 * @param {number|string} seed
 * @returns {number} an unsigned 32-bit state
 */
export const hashSeed = (seed) => {
  let h = 0x811c9dc5;
  for (const ch of String(seed)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * @typedef {Object} Rng
 * @property {string} seed
 * @property {() => number} next               in [0, 1)
 * @property {(n: number) => number} int       integer in [0, n)
 * @property {<T>(items: readonly T[]) => T} pick
 * @property {<T>(items: readonly T[], weights: readonly number[]) => T} weighted
 * @property {<T>(items: T[]) => T[]} shuffle  in place, returns the same array
 */

/**
 * mulberry32 behind a small helper surface.
 * @param {number|string} seed
 * @returns {Rng}
 */
export const createRng = (seed) => {
  if (seed === undefined || seed === null || seed === '') {
    throw new Error('createRng: a seed is required');
  }
  let a = hashSeed(seed);

  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (n) => Math.floor(next() * n);

  const pick = (items) => items[int(items.length)];

  const weighted = (items, weights) => {
    let total = 0;
    for (let i = 0; i < items.length; i += 1) total += weights[i] > 0 ? weights[i] : 0;
    if (!(total > 0)) throw new Error('rng.weighted: no item has a positive weight');
    let r = next() * total;
    for (let i = 0; i < items.length; i += 1) {
      const w = weights[i] > 0 ? weights[i] : 0;
      if (w === 0) continue;
      if (r < w) return items[i];
      r -= w;
    }
    // Floating-point tail: return the last item with a positive weight.
    for (let i = items.length - 1; i >= 0; i -= 1) if (weights[i] > 0) return items[i];
    throw new Error('rng.weighted: unreachable');
  };

  const shuffle = (items) => {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      const t = items[i];
      items[i] = items[j];
      items[j] = t;
    }
    return items;
  };

  return { seed: String(seed), next, int, pick, weighted, shuffle };
};
