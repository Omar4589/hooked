// Schema validation (DESIGN.md §3, §6, §10). The engine's normalizeLevel checks the essentials
// it needs to run; this is the rest — the five-to-six colour range and every cross-check between
// a level's goals and the board it ships. Every error names the level, so a broken file is found
// without reading a stack trace.

import { normalizeLevel } from '@hooked/engine';

/** DESIGN.md §3: a level plays five or six of the six yarn colours. */
export const COLOR_COUNT = Object.freeze({ min: 5, max: 6 });

const goalKey = (goal) =>
  [goal.type, goal.color, goal.blocker].filter((part) => part !== undefined).join(':');

const holds = {
  tangle: (t) => t.tangle > 0, // an `x` cell is a tangle too
  knot: (t) => t.knot === true,
  moth: (t) => t.moth === true,
};

/**
 * @param {object} json  a parsed level file
 * @param {string} [name]  how errors name it; the loader passes the registry's `dev/…` label
 * @returns {object} the normalized level
 */
export const validateLevel = (json, name = String(json?.name ?? json?.id)) => {
  const fail = (msg) => {
    throw new Error(`level ${name}: ${msg}`);
  };
  let level;
  try {
    level = normalizeLevel(json);
  } catch (error) {
    fail(error.message.replace(/^level [^:]*: /, '')); // one prefix, ours
  }

  if (!Number.isInteger(json.id) || json.id <= 0) fail('id must be a positive integer');
  if (typeof json.name !== 'string' || json.name.trim() === '') {
    fail('name must be a non-empty string');
  }
  if (!Number.isInteger(json.book) || json.book < 0) fail('book must be a non-negative integer');
  if (level.colors.length < COLOR_COUNT.min || level.colors.length > COLOR_COUNT.max) {
    fail(
      `colors lists ${level.colors.length}, a level plays ${COLOR_COUNT.min} to ${COLOR_COUNT.max}`,
    );
  }
  // A development board is a place to try the rules out, so it is allowed to have no goals; a
  // level a player is given has to ask for something.
  if (level.goals.length === 0 && !name.startsWith('dev/')) {
    fail('goals must list at least one goal');
  }
  const seen = new Set();
  for (const goal of level.goals) {
    if (seen.has(goalKey(goal))) fail(`goal ${goalKey(goal)} is listed twice`);
    seen.add(goalKey(goal));
  }

  const templates = level.grid.flat();
  const count = (pred) => templates.filter(pred).length;
  const beadCells = count((t) => t.fill === 'bead');
  const buriedCells = count((t) => t.buried === true);

  for (const goal of level.goals) {
    if (goal.type === 'stitch' && count((t) => t.stitch > 0) === 0) {
      fail('a stitch goal needs a stitch grid with at least one layer');
    }
    if (goal.type === 'collect') {
      if (goal.color === undefined) fail('a collect goal needs a color');
      if (!level.colors.includes(goal.color)) {
        fail(`collect color "${goal.color}" is not one of the level's colors`);
      }
      if (!(level.weights[goal.color] > 0)) {
        fail(`collect color "${goal.color}" has weight 0 and never refills`);
      }
      if (goal.count === undefined) fail('a collect goal needs a count');
    }
    if (goal.type === 'beads') {
      const { total, onBoard, spawnEvery } = level.beads;
      if (onBoard !== beadCells) {
        fail(`beads.onBoard is ${onBoard} but the grid has ${beadCells} "b" cells`);
      }
      if (total < onBoard) fail('beads.total must be >= beads.onBoard');
      if (total === 0) fail('a beads goal needs beads.total >= 1 or a "b" cell');
      if (total > onBoard && spawnEvery === 0) {
        fail('beads.spawnEvery must be >= 1 when beads.total > beads.onBoard');
      }
      if (goal.count !== undefined && goal.count > total) {
        fail(`beads goal count ${goal.count} exceeds beads.total ${total}`);
      }
    }
    if (goal.type === 'clear') {
      if (goal.blocker === undefined) fail('a clear goal needs a blocker');
      if (count(holds[goal.blocker]) === 0) {
        fail(`clear goal names "${goal.blocker}" but the grid has none`);
      }
    }
    if (goal.type === 'buried') {
      if (buriedCells === 0) fail('a buried goal needs at least one "x" cell');
      if (goal.count !== undefined && goal.count > buriedCells) {
        fail(`buried goal count ${goal.count} exceeds the ${buriedCells} "x" cells`);
      }
    }
  }
  if ((beadCells > 0 || level.beads.total > 0) && !level.goals.some((g) => g.type === 'beads')) {
    fail('beads on the board need a beads goal');
  }
  return level;
};
