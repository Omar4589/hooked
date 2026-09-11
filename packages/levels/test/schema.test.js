// One case per check validateLevel adds on top of the engine's normalizeLevel. Every message
// names the level, because the point of the schema is to find a broken file by reading one line.

import { COLORS } from '@hooked/engine';
import { validateLevel } from '../src/schema.js';
import { loadLevel } from '../src/index.js';

const stitchLevel = () => loadLevel(9903);
const beadLevel = () => loadLevel(9904);
const mothLevel = () => loadLevel(9905);

const bad = (json, re, name = 'dev/t') => expect(() => validateLevel(json, name)).toThrow(re);

test('an engine error is re-prefixed once, with our name for the level', () => {
  bad({ ...stitchLevel(), moves: 0 }, /^level dev\/t: moves must be a positive integer$/);
  bad({ ...stitchLevel(), cells: ['ooo', 'oo'] }, /^level dev\/t: cells row 1 has length 2/);
});

test('a level file names itself: id, name and book', () => {
  bad({ ...stitchLevel(), id: 0 }, /id must be a positive integer/);
  bad({ ...stitchLevel(), id: '9903' }, /id must be a positive integer/);
  bad({ ...stitchLevel(), name: '  ' }, /name must be a non-empty string/);
  bad({ ...stitchLevel(), book: -1 }, /book must be a non-negative integer/);
  bad({ ...stitchLevel(), book: undefined }, /book must be a non-negative integer/);
});

test('a level plays five or six colours (DESIGN.md §3)', () => {
  bad({ ...stitchLevel(), colors: COLORS.slice(0, 4) }, /colors lists 4, a level plays 5 to 6/);
  expect(() => validateLevel({ ...stitchLevel(), colors: [...COLORS] }, 'dev/t')).not.toThrow();
});

test('a shipped level asks for something; a development board need not', () => {
  bad({ ...stitchLevel(), goals: [] }, /goals must list at least one goal/, '001');
  expect(() => validateLevel({ ...stitchLevel(), goals: [] }, 'dev/t')).not.toThrow();
  bad(
    { ...stitchLevel(), goals: [{ type: 'stitch' }, { type: 'stitch' }] },
    /goal stitch is listed twice/,
  );
  const twoColours = [
    { type: 'collect', color: 'rust', count: 4 },
    { type: 'collect', color: 'olive', count: 4 },
  ];
  expect(() => validateLevel({ ...stitchLevel(), goals: twoColours }, 'dev/t')).not.toThrow();
});

test('a stitch goal needs squares to stitch', () => {
  bad({ ...stitchLevel(), stitch: undefined }, /a stitch goal needs a stitch grid/);
});

test('a collect goal needs a colour the level actually plays and refills', () => {
  const level = stitchLevel();
  bad({ ...level, goals: [{ type: 'collect', count: 10 }] }, /a collect goal needs a color/);
  bad(
    { ...level, goals: [{ type: 'collect', color: 'cocoa', count: 10 }] },
    /collect color "cocoa" is not one of the level's colors/,
  );
  bad(
    { ...level, goals: [{ type: 'collect', color: 'rust', count: 10 }], weights: { rust: 0 } },
    /collect color "rust" has weight 0 and never refills/,
  );
  bad({ ...level, goals: [{ type: 'collect', color: 'rust' }] }, /a collect goal needs a count/);
});

test('a beads goal and the board it ships have to agree', () => {
  const level = beadLevel();
  const cells = [...level.cells];
  const noBead = cells.map((row) => row.replace('b', 'o'));
  bad(
    { ...level, cells: noBead, beads: { total: 0, onBoard: 0, spawnEvery: 0 } },
    /a beads goal needs beads.total >= 1/,
  );
  bad({ ...level, beads: { total: 3, onBoard: 2, spawnEvery: 4 } }, /the grid has 1 "b" cells/);
  bad(
    { ...level, cells: noBead, beads: { total: 0, onBoard: 0, spawnEvery: 0 }, goals: level.goals },
    /beads.total >= 1/,
  );
  bad(
    {
      ...level,
      beads: { total: 1, onBoard: 1, spawnEvery: 0 },
      goals: [level.goals[0], { type: 'beads', count: 2 }],
    },
    /beads goal count 2 exceeds beads.total 1/,
  );
  bad(
    { ...level, beads: { total: 3, onBoard: 1, spawnEvery: 0 } },
    /beads.spawnEvery must be >= 1/,
  );
  bad({ ...level, goals: [level.goals[0]] }, /beads on the board need a beads goal/);
});

test('beads.total below what is already on the board is caught before the empty check', () => {
  const level = beadLevel();
  const twoBeads = level.cells.map((row, y) => (y === 2 ? 'obobooo' : row));
  bad(
    { ...level, cells: twoBeads, beads: { total: 1, onBoard: 2, spawnEvery: 4 } },
    /beads.total must be >= beads.onBoard/,
  );
  // and with no beads at all it is the empty check that fires, not a confusing count mismatch
  const noBead = level.cells.map((row) => row.replace('b', 'o'));
  bad(
    { ...level, cells: noBead, beads: { total: 0, onBoard: 0, spawnEvery: 0 } },
    /a beads goal needs beads.total >= 1/,
  );
});

test('a clear goal names a blocker the board holds, and a buried goal needs buttons', () => {
  const level = mothLevel();
  bad({ ...level, goals: [{ type: 'clear' }] }, /a clear goal needs a blocker/);
  bad(
    { ...level, goals: [{ type: 'clear', blocker: 'knot' }] },
    /clear goal names "knot" but the grid has none/,
  );
  bad(
    { ...stitchLevel(), goals: [{ type: 'buried' }] },
    /a buried goal needs at least one "x" cell/,
  );
  bad(
    { ...level, goals: [{ type: 'buried', count: 3 }] },
    /buried goal count 3 exceeds the 2 "x" cells/,
  );
});

test('validateLevel returns the normalized level, and names it by itself when nothing is passed', () => {
  const level = validateLevel(stitchLevel());
  expect(level.grid.length).toBe(7);
  expect(level.colors).toHaveLength(5);
  expect(() => validateLevel({ ...stitchLevel(), goals: [] })).toThrow(/^level Ring coaster: /);
});
