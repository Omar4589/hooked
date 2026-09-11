// Match detection: runs of 3+ same-colored yarn in a row or column, grouped into matches when
// runs share a cell (so an L, T or plus counts by total pieces, DESIGN.md §3).

import { COLORS, MATCH_SPECIALS } from './constants.js';
import { comparePos, posKey, samePos } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Cell} Cell */
/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Color} Color */
/** @typedef {import('./constants.js').Special} Special */
/** @typedef {{ dir: 'h'|'v', cells: Pos[] }} MatchRun */
/** @typedef {{ color: Color, size: number, cells: Pos[], runs: MatchRun[] }} Match */

/**
 * The color a cell contributes to matching, or null (holes, empties, blockers, beads, frog).
 * @param {Cell} cell
 */
export const matchColor = (cell) =>
  cell.open && cell.piece !== undefined && cell.piece.kind === 'yarn' ? cell.piece.color : null;

/**
 * Every horizontal and vertical run of 3+ same-colored yarn.
 * @param {Board} board
 * @returns {MatchRun[]}
 */
export const findRuns = (board) => {
  const runs = [];
  for (let y = 0; y < board.height; y += 1) {
    let x = 0;
    while (x < board.width) {
      const color = matchColor(board.cells[y][x]);
      if (color === null) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < board.width && matchColor(board.cells[y][end]) === color) end += 1;
      if (end - x >= 3) {
        runs.push({
          dir: 'h',
          cells: Array.from({ length: end - x }, (_, i) => ({ x: x + i, y })),
        });
      }
      x = end;
    }
  }
  for (let x = 0; x < board.width; x += 1) {
    let y = 0;
    while (y < board.height) {
      const color = matchColor(board.cells[y][x]);
      if (color === null) {
        y += 1;
        continue;
      }
      let end = y + 1;
      while (end < board.height && matchColor(board.cells[end][x]) === color) end += 1;
      if (end - y >= 3) {
        runs.push({
          dir: 'v',
          cells: Array.from({ length: end - y }, (_, i) => ({ x, y: y + i })),
        });
      }
      y = end;
    }
  }
  return runs;
};

/**
 * Runs grouped by shared cells. Each match lists its cells once, sorted row-major; matches are
 * sorted by their first cell.
 * @param {Board} board
 * @returns {Match[]}
 */
export const findMatches = (board) => {
  const runs = findRuns(board);
  const parent = runs.map((_, i) => i);
  const find = (i) => {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    let n = i;
    while (parent[n] !== r) {
      const next = parent[n];
      parent[n] = r;
      n = next;
    }
    return r;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const owner = new Map();
  runs.forEach((run, i) => {
    run.cells.forEach((p) => {
      const k = posKey(p);
      if (owner.has(k)) union(owner.get(k), i);
      else owner.set(k, i);
    });
  });
  const groups = new Map();
  runs.forEach((run, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(run);
  });
  const matches = [...groups.values()].map((groupRuns) => {
    const seen = new Set();
    const cells = [];
    for (const run of groupRuns) {
      for (const p of run.cells) {
        const k = posKey(p);
        if (!seen.has(k)) {
          seen.add(k);
          cells.push({ x: p.x, y: p.y });
        }
      }
    }
    cells.sort(comparePos);
    const first = groupRuns[0].cells[0];
    return {
      color: matchColor(board.cells[first.y][first.x]),
      size: cells.length,
      cells,
      runs: groupRuns,
    };
  });
  matches.sort((a, b) => comparePos(a.cells[0], b.cells[0]));
  return matches;
};

/**
 * True when a straight line of 3+ same-colored yarn passes through `pos`. Allocation-free.
 * @param {Board} board
 * @param {Pos} pos
 */
export const matchThrough = (board, pos) => {
  const color = matchColor(board.cells[pos.y][pos.x]);
  if (color === null) return false;
  const count = (dx, dy) => {
    let n = 0;
    let x = pos.x + dx;
    let y = pos.y + dy;
    while (x >= 0 && y >= 0 && x < board.width && y < board.height) {
      if (matchColor(board.cells[y][x]) !== color) break;
      n += 1;
      x += dx;
      y += dy;
    }
    return n;
  };
  return count(-1, 0) + count(1, 0) >= 2 || count(0, -1) + count(0, 1) >= 2;
};

/** @param {number} size @returns {Special|null} */
export const specialForSize = (size) => {
  if (size >= 7) return MATCH_SPECIALS[7];
  return MATCH_SPECIALS[size] === undefined ? null : MATCH_SPECIALS[size];
};

/**
 * Where a match's special spawns (DESIGN.md §3 and the phase 1 conventions): a swapped cell that
 * belongs to the match; else the corner of an L/T/plus (the cell in the most runs, ties by
 * row-major order); else the middle of the run, the left/top one for even lengths.
 * @param {Match} match
 * @param {Pos[]} [swapped]
 * @returns {Pos}
 */
export const spawnCellFor = (match, swapped = []) => {
  for (const s of swapped) {
    if (match.cells.some((p) => samePos(p, s))) return { x: s.x, y: s.y };
  }
  if (match.runs.length > 1) {
    const counts = new Map();
    for (const run of match.runs) {
      for (const p of run.cells) counts.set(posKey(p), (counts.get(posKey(p)) || 0) + 1);
    }
    let best = match.cells[0];
    let bestCount = 0;
    for (const p of match.cells) {
      const n = counts.get(posKey(p));
      if (n > bestCount) {
        best = p;
        bestCount = n;
      }
    }
    return { x: best.x, y: best.y };
  }
  const { cells } = match.runs[0];
  const p = cells[Math.floor((cells.length - 1) / 2)];
  return { x: p.x, y: p.y };
};

/**
 * How many balls of each color are on the board, in palette order. Knotted balls and balls
 * carrying a special count; beads and the frog have no color and do not.
 * @param {Board} board
 * @returns {Map<Color, number>}
 */
export const colorCounts = (board) => {
  const counts = new Map();
  for (const color of COLORS) counts.set(color, 0);
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const color = matchColor(board.cells[y][x]);
      if (color !== null) counts.set(color, counts.get(color) + 1);
    }
  }
  return counts;
};

/**
 * The `n` most common colors on the board, ties broken by palette order so the frog is
 * deterministic without spending an rng draw. Colors with no ball are never returned.
 * @param {Board} board
 * @param {number} [n]
 * @returns {Color[]}
 */
export const mostCommonColors = (board, n = 1) => {
  const counts = colorCounts(board);
  const present = [];
  for (const color of COLORS) {
    if (counts.get(color) > 0) present.push(color);
  }
  present.sort((a, b) => counts.get(b) - counts.get(a) || COLORS.indexOf(a) - COLORS.indexOf(b));
  return present.slice(0, n);
};
