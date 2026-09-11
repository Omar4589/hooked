// Text rendering for play.js and tests. Two characters per cell (TEXT_LEGEND) so the render is
// lossless: parseBoard(renderBoard(board), renderStitch(board)) rebuilds the board exactly.

import { TEXT_LEGEND, COLORS, SPECIALS } from './constants.js';
import { createBoard } from './board.js';

/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Cell} Cell */
/** @typedef {import('./constants.js').Pos} Pos */

const L = TEXT_LEGEND;
const colorByChar = Object.fromEntries(COLORS.map((c) => [L.color[c], c]));
const specialByChar = Object.fromEntries(SPECIALS.map((s) => [L.special[s], s]));

/** @param {Pos} pos */
export const formatPos = ({ x, y }) => `(${x},${y})`;

/** @param {Cell} cell @returns {string} two characters */
export const renderCell = (cell) => {
  if (!cell.open) return L.hole + L.none;
  if (cell.tangle > 0) return (cell.buried ? L.buried : L.tangle) + String(cell.tangle);
  if (cell.moth) return L.moth + L.none;
  const { piece } = cell;
  if (piece === undefined) return L.empty + L.empty;
  if (piece.kind === 'frog') return L.frog + L.none;
  if (piece.kind === 'bead') return L.bead + L.none;
  const modifier = piece.knotted ? L.knotted : piece.special ? L.special[piece.special] : L.none;
  return L.color[piece.color] + modifier;
};

/**
 * @param {Board} board
 * @param {{ axes?: boolean }} [options]
 * @returns {string} rows joined by newlines; with `axes`, a column header and row numbers
 */
export const renderBoard = (board, { axes = false } = {}) => {
  const rows = board.cells.map((row) => row.map(renderCell).join(' '));
  if (!axes) return rows.join('\n');
  return [axesHeader(board.width), ...rows.map((r, y) => `${String(y).padEnd(2)} ${r}`)].join('\n');
};

const axesHeader = (width) =>
  ('   ' + Array.from({ length: width }, (_, x) => String(x).padEnd(2)).join(' ')).trimEnd();

/**
 * The stitch layers as a grid of `.`, `1`, `2` (holes render as `.`). With `axes` the grid
 * takes the same geometry as renderBoard (display only; parseBoard reads the plain form).
 * @param {Board} board
 * @param {{ axes?: boolean }} [options]
 */
export const renderStitch = (board, { axes = false } = {}) => {
  const cell = (c) => (c.stitch > 0 ? String(c.stitch) : '.');
  if (!axes) return board.cells.map((row) => row.map(cell).join(' ')).join('\n');
  const rows = board.cells.map((row, y) =>
    `${String(y).padEnd(2)} ${row.map((c) => cell(c).padEnd(2)).join(' ')}`.trimEnd(),
  );
  return [axesHeader(board.width), ...rows].join('\n');
};

const parseCell = (token, x, y) => {
  if (token.length !== 2) throw new Error(`parseBoard: bad cell "${token}" at (${x},${y})`);
  const [c1, c2] = token;
  if (c1 === L.hole) return { open: false };
  if (c1 === L.empty) return { open: true };
  if (c1 === L.tangle || c1 === L.buried) {
    const layers = Number(c2);
    if (!(layers >= 1 && layers <= 3)) throw new Error(`parseBoard: bad tangle "${token}"`);
    const cell = { open: true, tangle: layers };
    if (c1 === L.buried) cell.buried = true;
    return cell;
  }
  if (c1 === L.moth) return { open: true, moth: true };
  if (c1 === L.frog) return { open: true, piece: { kind: 'frog' } };
  if (c1 === L.bead) return { open: true, piece: { kind: 'bead' } };
  const color = colorByChar[c1];
  if (!color) throw new Error(`parseBoard: unknown cell "${token}" at (${x},${y})`);
  const piece = { kind: 'yarn', color };
  if (c2 === L.knotted) piece.knotted = true;
  else if (c2 !== L.none) {
    const special = specialByChar[c2];
    if (!special) throw new Error(`parseBoard: unknown modifier "${token}" at (${x},${y})`);
    piece.special = special;
  }
  return { open: true, piece };
};

/**
 * Inverse of renderBoard (+ renderStitch). Rows may come as one string per row or one string
 * with newlines; cells are whitespace-separated two-character tokens.
 * @param {string|string[]} rows
 * @param {string|string[]} [stitchRows]  single characters per cell, spaces optional
 * @returns {Board}
 */
export const parseBoard = (rows, stitchRows) => {
  const lines = (Array.isArray(rows) ? rows : rows.split('\n')).filter((r) => r.trim() !== '');
  const tokens = lines.map((line) => line.trim().split(/\s+/));
  const width = tokens[0].length;
  if (tokens.some((t) => t.length !== width)) throw new Error('parseBoard: ragged rows');
  const board = createBoard(width, tokens.length, (x, y) => parseCell(tokens[y][x], x, y));
  if (stitchRows !== undefined) {
    const sLines = (Array.isArray(stitchRows) ? stitchRows : stitchRows.split('\n'))
      .filter((r) => r.trim() !== '')
      .map((r) => r.replace(/\s+/g, ''));
    if (sLines.length !== board.height || sLines.some((r) => r.length !== width)) {
      throw new Error('parseBoard: stitch grid shape does not match the board');
    }
    sLines.forEach((line, y) => {
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        const layers = Number(ch);
        if (!(layers === 1 || layers === 2)) throw new Error(`parseBoard: bad stitch "${ch}"`);
        board.cells[y][x].stitch = layers;
      });
    });
  }
  return board;
};

const describeCreated = (created) =>
  created.map(({ pos, piece }) => `${piece.special ?? piece.kind} at ${formatPos(pos)}`).join(', ');

/** One line per step, for logs. @param {object} step */
export const describeStep = (step) => {
  switch (step.type) {
    case 'swap':
      return `swap ${formatPos(step.a)}<->${formatPos(step.b)}${step.illegal ? ' illegal' : ''}`;
    case 'clear': {
      const made = step.created.length ? ` -> ${describeCreated(step.created)}` : '';
      const combo = step.cascade >= 2 ? `  combo x${step.cascade}` : '';
      return `clear x${step.cascade}: ${step.cells.length} cells${made} (+${step.points})${combo}`;
    }
    case 'fall':
      return `fall: ${step.moves.length} pieces`;
    case 'spawn':
      return `spawn: ${step.cells.length} pieces`;
    case 'blast': {
      const shape = step.special === 'hook' ? ` ${step.orientation}` : '';
      const combo = step.combo ? ' combo' : '';
      const where = formatPos(step.pos);
      return `blast ${step.special}${shape}${combo} at ${where}: ${step.cells.length} cells (+${step.points})`;
    }
    case 'frogRip': {
      const where = formatPos(step.pos);
      return `frogRip ${step.color} at ${where}: ${step.cells.length} cells (+${step.points})`;
    }
    case 'meter':
      return `meter: ${step.charge}/${step.full}`;
    case 'meterDrop':
      return `meterDrop: ${step.piece.special ?? step.piece.kind} at ${formatPos(step.pos)}`;
    case 'shuffle':
      return 'shuffle: untangling...';
    default:
      return step.type;
  }
};

/** @param {object[]} steps @returns {string[]} */
export const describeSteps = (steps) => steps.map(describeStep);

/** @param {{ moves: number, score: number, status: string }} state */
export const renderState = ({ moves, score, status }) =>
  `moves ${moves} · score ${score} · ${status}`;
