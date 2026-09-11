// Level normalization: turns a parsed level JSON (DESIGN.md §10) into a typed level object and
// builds the empty board from it. Validates essentials only; the full schema is phase 4's job
// in packages/levels.

import {
  COLORS,
  BLOCKERS,
  GOALS,
  METERS,
  HARD_LABELS,
  PRESET_PIECES,
  MAX_BOARD_SIZE,
  CELL_LEGEND,
  STITCH_LEGEND,
} from './constants.js';
import { createBoard, columnRuns, posKey, inBounds as posInBounds } from './board.js';

/** @typedef {import('./constants.js').Color} Color */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Board} Board */

/**
 * What the level file says about a cell before any piece is placed.
 * @typedef {Object} CellTemplate
 * @property {boolean} open
 * @property {'yarn'|'bead'} [fill]   what generation puts here
 * @property {boolean} [knot]
 * @property {number} [tangle]
 * @property {boolean} [buried]
 * @property {boolean} [moth]
 * @property {number} [stitch]
 */

/**
 * @typedef {Object} Level
 * @property {number|string} id
 * @property {string} name
 * @property {number} width
 * @property {number} height
 * @property {string[]} cells
 * @property {CellTemplate[][]} grid
 * @property {Color[]} colors
 * @property {number} moves
 * @property {'none'|'frog'|'hook'} meter
 * @property {Record<string, number>} weights
 * @property {Pos[]} spawners
 * @property {Pos[]} exits
 * @property {{ total: number, onBoard: number, spawnEvery: number }} beads
 * @property {object[]} goals
 * @property {{ x: number, y: number, piece: string }[]} presets
 * @property {string[]} tutorial
 * @property {false|string} hard
 * @property {boolean} hidden
 * @property {number} coins
 */

const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPosPair = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isInteger);

const templateFor = (ch) => {
  switch (CELL_LEGEND[ch]) {
    case 'hole':
      return { open: false };
    case 'open':
      return { open: true, fill: 'yarn' };
    case 'tangle':
      return { open: true, tangle: Number(ch) };
    case 'knot':
      return { open: true, fill: 'yarn', knot: true };
    case 'moth':
      return { open: true, moth: true };
    case 'bead':
      return { open: true, fill: 'bead' };
    case 'buried':
      return { open: true, tangle: 2, buried: true };
    default:
      return null;
  }
};

/**
 * @param {object} json  the parsed level file
 * @returns {Level}
 */
export const normalizeLevel = (json) => {
  if (!isPlainObject(json)) throw new Error('level: expected an object');
  const id = json.id === undefined ? 0 : json.id;
  const fail = (msg) => {
    throw new Error(`level ${id}: ${msg}`);
  };

  // cells
  const { cells } = json;
  if (!Array.isArray(cells) || cells.length === 0 || !cells.every((r) => typeof r === 'string')) {
    fail('cells must be a non-empty array of strings');
  }
  const height = cells.length;
  const width = cells[0].length;
  if (width === 0) fail('cells rows must not be empty');
  if (width > MAX_BOARD_SIZE || height > MAX_BOARD_SIZE) {
    fail(`board is ${width}x${height}, the ceiling is ${MAX_BOARD_SIZE}x${MAX_BOARD_SIZE}`);
  }
  cells.forEach((row, y) => {
    if (row.length !== width) fail(`cells row ${y} has length ${row.length}, expected ${width}`);
  });
  const grid = cells.map((row, y) =>
    [...row].map((ch, x) => {
      const t = templateFor(ch);
      if (t === null) fail(`unknown cell character "${ch}" at (${x},${y})`);
      return t;
    }),
  );

  // stitch
  if (json.stitch !== undefined) {
    const { stitch } = json;
    if (
      !Array.isArray(stitch) ||
      stitch.length !== height ||
      stitch.some((r) => r.length !== width)
    ) {
      fail('stitch must have the same shape as cells');
    }
    stitch.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const layers = STITCH_LEGEND[ch];
        if (layers === undefined) fail(`unknown stitch character "${ch}" at (${x},${y})`);
        if (layers > 0) {
          if (!grid[y][x].open) fail(`stitch at (${x},${y}) sits on a hole`);
          grid[y][x].stitch = layers;
        }
      });
    });
  }

  // colors
  const { colors } = json;
  if (!Array.isArray(colors) || colors.length < 2) fail('colors must list at least two colors');
  colors.forEach((c) => {
    if (!COLORS.includes(c)) fail(`unknown color "${c}"`);
  });
  if (new Set(colors).size !== colors.length) fail('colors must not repeat');

  // moves
  if (!Number.isInteger(json.moves) || json.moves <= 0) fail('moves must be a positive integer');

  // meter
  const meter = json.meter === undefined ? 'frog' : json.meter;
  if (!METERS.includes(meter)) fail(`unknown meter "${meter}"`);

  // weights
  const weights = {};
  const rawWeights = json.weights === undefined ? {} : json.weights;
  if (!isPlainObject(rawWeights)) fail('weights must be an object');
  for (const c of colors) {
    const w = rawWeights[c] === undefined ? 1 : rawWeights[c];
    if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) fail(`weight for ${c} must be >= 0`);
    weights[c] = w;
  }
  if (colors.filter((c) => weights[c] > 0).length < 2) {
    fail('weights must leave at least two colors with a positive weight');
  }

  // runs, spawners, exits
  const runs = columnRuns({ width, height, cells: grid });
  const runTops = new Set(runs.map((r) => posKey({ x: r.x, y: r.top })));
  const inBounds = (pos) => posInBounds({ width, height }, pos);
  let spawners;
  if (json.spawners === undefined) {
    spawners = runs.map((r) => ({ x: r.x, y: r.top }));
  } else {
    if (!Array.isArray(json.spawners)) fail('spawners must be an array of [x, y]');
    const seen = new Set();
    spawners = [];
    json.spawners.forEach((entry) => {
      if (!isPosPair(entry)) fail(`spawner ${JSON.stringify(entry)} is not an [x, y] pair`);
      const pos = { x: entry[0], y: entry[1] };
      if (!inBounds(pos)) fail(`spawner (${pos.x},${pos.y}) is off the board`);
      if (!runTops.has(posKey(pos))) {
        fail(`spawner (${pos.x},${pos.y}) is not the top cell of a vertical run`);
      }
      if (!seen.has(posKey(pos))) {
        seen.add(posKey(pos));
        spawners.push(pos);
      }
    });
  }
  let exits;
  if (json.exits === undefined || json.exits === 'bottom') {
    exits = [];
    for (let x = 0; x < width; x += 1) {
      for (let y = height - 1; y >= 0; y -= 1) {
        if (grid[y][x].open) {
          exits.push({ x, y });
          break;
        }
      }
    }
  } else {
    if (!Array.isArray(json.exits)) fail('exits must be "bottom" or an array of [x, y]');
    exits = json.exits.map((entry) => {
      if (!isPosPair(entry)) fail(`exit ${JSON.stringify(entry)} is not an [x, y] pair`);
      const pos = { x: entry[0], y: entry[1] };
      if (!inBounds(pos) || !grid[pos.y][pos.x].open)
        fail(`exit (${pos.x},${pos.y}) is not an open cell`);
      return pos;
    });
  }

  // beads
  const beadCells = grid.flat().filter((t) => t.fill === 'bead').length;
  const rawBeads = json.beads === undefined ? {} : json.beads;
  if (!isPlainObject(rawBeads)) fail('beads must be an object');
  const beads = {
    total: rawBeads.total === undefined ? beadCells : rawBeads.total,
    onBoard: rawBeads.onBoard === undefined ? beadCells : rawBeads.onBoard,
    spawnEvery: rawBeads.spawnEvery === undefined ? 0 : rawBeads.spawnEvery,
  };
  for (const [k, v] of Object.entries(beads)) {
    if (!Number.isInteger(v) || v < 0) fail(`beads.${k} must be a non-negative integer`);
  }

  // goals
  const rawGoals = json.goals === undefined ? [] : json.goals;
  if (!Array.isArray(rawGoals)) fail('goals must be an array');
  const goals = rawGoals.map((g) => {
    if (!isPlainObject(g) || !GOALS.includes(g.type)) fail(`unknown goal ${JSON.stringify(g)}`);
    const goal = { type: g.type };
    if (g.color !== undefined) {
      if (!COLORS.includes(g.color)) fail(`goal color "${g.color}" is unknown`);
      goal.color = g.color;
    }
    if (g.count !== undefined) {
      if (!Number.isInteger(g.count) || g.count <= 0) fail('goal count must be a positive integer');
      goal.count = g.count;
    }
    if (g.blocker !== undefined) {
      if (!BLOCKERS.includes(g.blocker)) fail(`goal blocker "${g.blocker}" is unknown`);
      goal.blocker = g.blocker;
    }
    if (g.sprite !== undefined) {
      if (typeof g.sprite !== 'string') fail('goal sprite must be a string');
      goal.sprite = g.sprite;
    }
    return goal;
  });

  // presets
  const rawPresets = json.presets === undefined ? [] : json.presets;
  if (!Array.isArray(rawPresets)) fail('presets must be an array');
  const presetKeys = new Set();
  const presets = rawPresets.map((p) => {
    if (!isPlainObject(p) || !Number.isInteger(p.x) || !Number.isInteger(p.y)) {
      fail(`preset ${JSON.stringify(p)} needs integer x and y`);
    }
    if (!PRESET_PIECES.includes(p.piece)) fail(`preset piece "${p.piece}" is unknown`);
    const pos = { x: p.x, y: p.y };
    if (!inBounds(pos)) fail(`preset (${pos.x},${pos.y}) is off the board`);
    const t = grid[pos.y][pos.x];
    if (!t.open || t.fill !== 'yarn' || t.knot) {
      fail(`preset (${pos.x},${pos.y}) must sit on an open "o" cell`);
    }
    if (presetKeys.has(posKey(pos))) fail(`two presets at (${pos.x},${pos.y})`);
    presetKeys.add(posKey(pos));
    return { x: pos.x, y: pos.y, piece: p.piece };
  });

  // tutorial, hard, hidden, coins, name
  let tutorial;
  if (json.tutorial === undefined) tutorial = [];
  else if (typeof json.tutorial === 'string') tutorial = [json.tutorial];
  else if (Array.isArray(json.tutorial) && json.tutorial.every((t) => typeof t === 'string')) {
    tutorial = [...json.tutorial];
  } else fail('tutorial must be a string or an array of strings');
  const hard = json.hard === undefined ? false : json.hard;
  if (!HARD_LABELS.includes(hard)) fail(`unknown hard label "${hard}"`);
  const hidden = json.hidden === undefined ? false : json.hidden;
  if (typeof hidden !== 'boolean') fail('hidden must be a boolean');
  const coins = json.coins === undefined ? 0 : json.coins;
  if (typeof coins !== 'number' || !Number.isFinite(coins) || coins < 0) fail('coins must be >= 0');
  const name = json.name === undefined ? '' : String(json.name);

  return {
    ...json,
    id,
    name,
    width,
    height,
    cells: [...cells],
    grid,
    colors: [...colors],
    moves: json.moves,
    meter,
    weights,
    spawners,
    exits,
    beads,
    goals,
    presets,
    tutorial,
    hard,
    hidden,
    coins,
  };
};

/**
 * The board a level starts from, before any piece is placed.
 * @param {Level} level
 * @returns {Board}
 */
export const buildBoard = (level) =>
  createBoard(level.width, level.height, (x, y) => {
    const t = level.grid[y][x];
    const cell = { open: t.open };
    if (t.tangle > 0) cell.tangle = t.tangle;
    if (t.buried) cell.buried = true;
    if (t.moth) cell.moth = true;
    if (t.stitch > 0) cell.stitch = t.stitch;
    return cell;
  });
