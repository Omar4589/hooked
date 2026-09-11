import {
  COLORS,
  SPECIALS,
  PIECE_KINDS,
  BLOCKERS,
  GOALS,
  MAX_BOARD_SIZE,
  ENGINE_VERSION,
  SCORE,
  MAX_CASCADE_MULTIPLIER,
  MAX_CASCADES,
  METER_FULL,
  METERS,
  HARD_LABELS,
  MATCH_SPECIALS,
  PRESET_PIECES,
  STEP_TYPES,
  CELL_LEGEND,
  STITCH_LEGEND,
  TEXT_LEGEND,
  BLAST_RADII,
  COMBO_BOARD_RADIUS,
  HOOK_ORIENTATIONS,
  METER_CHARGE,
  METER_MULTI_BONUS,
  MAX_BLAST_WAVES,
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
  expect(PRESET_PIECES).toEqual([...SPECIALS, 'frog']);
});

test('engine version is 0.3.0 and the board ceiling is 9', () => {
  expect(ENGINE_VERSION).toBe('0.3.0');
  expect(MAX_BOARD_SIZE).toBe(9);
});

test('score table and cascade cap match DESIGN.md §7 and §3', () => {
  expect(SCORE).toEqual({
    yarn: 20,
    puff: 60,
    bobble: 120,
    popcorn: 250,
    yarnbomb: 500,
    frogRip: 500,
    stitch: 1000,
    blockerLayer: 200,
    bead: 2000,
    coinsPerMove: 20,
  });
  expect(MAX_CASCADE_MULTIPLIER).toBe(5);
  expect(MAX_CASCADES).toBeGreaterThanOrEqual(50);
  expect(METER_FULL).toBe(10);
});

test('match sizes map to specials, 7 or more makes a yarn bomb', () => {
  expect(MATCH_SPECIALS).toEqual({ 4: 'puff', 5: 'bobble', 6: 'popcorn', 7: 'yarnbomb' });
});

test('meters and hard labels', () => {
  expect(METERS).toEqual(['none', 'frog', 'hook']);
  expect(HARD_LABELS).toEqual([false, 'tricky', 'tangled', 'nightmare']);
});

test('the thirteen step types of DESIGN.md §11, by name', () => {
  expect(STEP_TYPES).toEqual([
    'swap',
    'clear',
    'blast',
    'frogRip',
    'meter',
    'meterDrop',
    'blocker',
    'fall',
    'spawn',
    'mothSpread',
    'beadExit',
    'shuffle',
    'yarnOver',
  ]);
});

test('legends cover every level character and every color has a distinct render letter', () => {
  expect(Object.keys(CELL_LEGEND).sort()).toEqual(['.', '1', '2', '3', 'b', 'k', 'm', 'o', 'x']);
  expect(STITCH_LEGEND).toEqual({ '.': 0, 1: 1, 2: 2 });
  const letters = COLORS.map((c) => TEXT_LEGEND.color[c]);
  expect(new Set(letters).size).toBe(6);
  for (const s of SPECIALS) expect(typeof TEXT_LEGEND.special[s]).toBe('string');
});

test('the name lists and tables are frozen', () => {
  for (const v of [
    COLORS,
    SPECIALS,
    PIECE_KINDS,
    BLOCKERS,
    GOALS,
    SCORE,
    METERS,
    HARD_LABELS,
    MATCH_SPECIALS,
    PRESET_PIECES,
    STEP_TYPES,
    CELL_LEGEND,
    STITCH_LEGEND,
    TEXT_LEGEND,
  ]) {
    expect(Object.isFrozen(v)).toBe(true);
  }
});

test('the blast radii, the combo ceiling and the meter rates are the §4 numbers', () => {
  expect(BLAST_RADII).toEqual({ puff: 1, bobble: 2, popcorn: 3, yarnbomb: 4 });
  expect(COMBO_BOARD_RADIUS).toBe(5);
  expect(HOOK_ORIENTATIONS).toEqual(['rows', 'cols', 'both']);
  expect(METER_CHARGE).toEqual({ puff: 1, bobble: 2, popcorn: 3, yarnbomb: 4, hook: 0 });
  expect(METER_MULTI_BONUS).toBe(2);
  expect(MAX_BLAST_WAVES).toBe(MAX_BOARD_SIZE * MAX_BOARD_SIZE);
  for (const table of [BLAST_RADII, HOOK_ORIENTATIONS, METER_CHARGE]) {
    expect(Object.isFrozen(table)).toBe(true);
  }
});
