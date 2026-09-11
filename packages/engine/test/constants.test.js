import {
  COLORS,
  SPECIALS,
  PIECE_KINDS,
  BLOCKERS,
  GOALS,
  MAX_BOARD_SIZE,
  ENGINE_VERSION,
} from '../src/index.js';

test('the six yarn colors, in palette order', () => {
  expect(COLORS).toEqual(['olive', 'mustard', 'blush', 'rust', 'lavender', 'cocoa']);
});

test('specials, piece kinds, blockers and goal types use the fixed names', () => {
  expect(SPECIALS).toEqual(['puff', 'bobble', 'popcorn', 'yarnbomb', 'hook']);
  expect(PIECE_KINDS).toEqual(['yarn', 'frog', 'bead']);
  expect(BLOCKERS).toEqual(['tangle', 'knot', 'moth']);
  expect(GOALS).toEqual(['stitch', 'collect', 'beads', 'clear', 'buried']);
});

test('the frog is a piece kind, never a special', () => {
  expect(SPECIALS).not.toContain('frog');
  expect(PIECE_KINDS).toContain('frog');
});

test('the name lists are frozen', () => {
  for (const list of [COLORS, SPECIALS, PIECE_KINDS, BLOCKERS, GOALS]) {
    expect(Object.isFrozen(list)).toBe(true);
  }
});

test('board ceiling and version', () => {
  expect(MAX_BOARD_SIZE).toBe(9);
  expect(typeof ENGINE_VERSION).toBe('string');
});
