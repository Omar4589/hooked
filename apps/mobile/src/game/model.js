// The view model: the engine's board plus one stable id per piece. Ids matter because a piece
// on screen is a mounted component with its own animation; if the board were keyed by cell,
// every fall would unmount and remount a row of pieces instead of moving them.

import { columnRuns } from '@hooked/engine';

/** @typedef {import('@hooked/engine').Piece} Piece */
/** @typedef {{ id: number, x: number, y: number, piece: Piece }} Entry */

/**
 * @typedef {Object} Model
 * @property {number} width
 * @property {number} height
 * @property {boolean[][]} open      [y][x]; false is a hole
 * @property {(number|null)[][]} runTop  the top row of each cell vertical run, null on holes
 * @property {Map<number, Entry>} pieces  in ascending id order
 * @property {(number|null)[][]} grid  [y][x] piece id
 * @property {number[][]} tangle    layers left, 0 where there is none
 * @property {boolean[][]} moth
 * @property {number[][]} stitch    unstitched layers, 0 where the square is done or absent
 * @property {boolean[][]} buried   a button still under its tangle
 * @property {number} nextId
 */

/**
 * Reads a board snapshot into a model. Ids are handed out row-major from `nextId`; pass the
 * previous model's `nextId` when rebuilding so a fresh piece never takes the key of one still
 * on screen.
 * @param {import('@hooked/engine').Board} board
 * @param {number} [nextId]
 * @returns {Model}
 */
export const buildModel = (board, nextId = 1) => {
  const runTop = board.cells.map((row) => row.map(() => null));
  for (const run of columnRuns(board)) {
    for (const pos of run.cells) runTop[pos.y][pos.x] = run.top;
  }
  const pieces = new Map();
  const grid = board.cells.map((row) => row.map(() => null));
  let id = nextId;
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const piece = board.cells[y][x].piece;
      if (piece === undefined) continue;
      pieces.set(id, { id, x, y, piece: { ...piece } });
      grid[y][x] = id;
      id += 1;
    }
  }
  return {
    width: board.width,
    height: board.height,
    open: board.cells.map((row) => row.map((cell) => cell.open === true)),
    runTop,
    pieces,
    grid,
    tangle: board.cells.map((row) => row.map((cell) => cell.tangle ?? 0)),
    moth: board.cells.map((row) => row.map((cell) => cell.moth === true)),
    stitch: board.cells.map((row) => row.map((cell) => cell.stitch ?? 0)),
    buried: board.cells.map((row) => row.map((cell) => cell.buried === true)),
    nextId: id,
  };
};

/**
 * A working copy for one move. Entries are replaced rather than mutated, so sharing them is
 * safe; `open` and `runTop` never change (holes are fixed for the level), but the layer grids
 * do, so they are copied like `grid`.
 * @param {Model} model
 * @returns {Model}
 */
export const cloneModel = (model) => ({
  width: model.width,
  height: model.height,
  open: model.open,
  runTop: model.runTop,
  pieces: new Map(model.pieces),
  grid: model.grid.map((row) => [...row]),
  tangle: model.tangle.map((row) => [...row]),
  moth: model.moth.map((row) => [...row]),
  stitch: model.stitch.map((row) => [...row]),
  buried: model.buried.map((row) => [...row]),
  nextId: model.nextId,
});

/** Is this an open cell of the board? @param {Model} model @param {{x: number, y: number}} pos */
export const inModel = (model, pos) =>
  pos.x >= 0 &&
  pos.y >= 0 &&
  pos.x < model.width &&
  pos.y < model.height &&
  model.open[pos.y][pos.x];

/**
 * Can the player pick this cell up? The client's mirror of the engine's `canSwap`, so a swipe
 * from a knot, a tangle or a moth is ignored instead of sliding a piece that cannot move.
 * @param {Model} model
 * @param {{x: number, y: number}} pos
 */
export const inPlay = (model, pos) => {
  if (!inModel(model, pos)) return false;
  if (model.tangle[pos.y][pos.x] > 0 || model.moth[pos.y][pos.x]) return false;
  const id = model.grid[pos.y][pos.x];
  return id !== null && model.pieces.get(id).piece.knotted !== true;
};

/** What the screen shows, in the engine's own piece shape. @param {Model} model */
export const projectPieces = (model) =>
  model.grid.map((row) => row.map((id) => (id === null ? null : model.pieces.get(id).piece)));

/** The same view of an engine board. @param {import('@hooked/engine').Board} board */
export const piecesOf = (board) => board.cells.map((row) => row.map((cell) => cell.piece ?? null));

/** What the screen shows of the cells themselves. @param {Model} model */
export const projectCells = (model) =>
  model.tangle.map((row, y) =>
    row.map((tangle, x) => ({
      tangle,
      moth: model.moth[y][x],
      stitch: model.stitch[y][x],
      buried: model.buried[y][x],
    })),
  );

/** The same view of an engine board. @param {import('@hooked/engine').Board} board */
export const cellsOf = (board) =>
  board.cells.map((row) =>
    row.map((cell) => ({
      tangle: cell.tangle ?? 0,
      moth: cell.moth === true,
      stitch: cell.stitch ?? 0,
      buried: cell.buried === true,
    })),
  );

/**
 * Which squares the level's pattern covers, read once from the board it starts on: the engine
 * deletes `stitch` when the last layer goes, so a stitched square is only knowable by having
 * seen it unstitched.
 * @param {import('@hooked/engine').Board} board
 * @returns {boolean[][]}
 */
export const stitchPattern = (board) => board.cells.map((row) => row.map((c) => c.stitch > 0));

/**
 * The cells worth drawing: anything with a layer on it, any square of the pattern, and any cell
 * this move touches — a tangle that fades to nothing is gone from the model but still has an
 * animation to finish, exactly like a cleared piece's ghost.
 * @param {Model} model
 * @param {boolean[][]} pattern
 * @param {Map<string, object>} tracked
 */
export const cellEntries = (model, pattern, tracked) => {
  const entries = [];
  for (let y = 0; y < model.height; y += 1) {
    for (let x = 0; x < model.width; x += 1) {
      const key = `${x},${y}`;
      const drawn =
        model.tangle[y][x] > 0 ||
        model.moth[y][x] ||
        model.stitch[y][x] > 0 ||
        pattern[y][x] === true ||
        tracked.has(key);
      if (!drawn) continue;
      entries.push({
        key,
        x,
        y,
        tangle: model.tangle[y][x],
        moth: model.moth[y][x],
        stitch: model.stitch[y][x],
        buried: model.buried[y][x],
        stitched: pattern[y][x] === true,
      });
    }
  }
  return entries;
};

const describePiece = (piece) => {
  if (piece === null) return 'nothing';
  const special = piece.special === undefined ? '' : ` ${piece.special}`;
  return `${piece.color ?? piece.kind}${special}${piece.knotted ? ' knotted' : ''}`;
};

const samePiece = (a, b) =>
  a === null || b === null
    ? a === b
    : a.kind === b.kind &&
      a.color === b.color &&
      a.special === b.special &&
      a.knotted === b.knotted;

const sameCell = (a, b) =>
  a.tangle === b.tangle && a.moth === b.moth && a.stitch === b.stitch && a.buried === b.buried;

const describeCell = (cell) => {
  const parts = [];
  if (cell.tangle > 0) parts.push(`tangle ${cell.tangle}${cell.buried ? ' buried' : ''}`);
  if (cell.moth) parts.push('moth');
  if (cell.stitch > 0) parts.push(`stitch ${cell.stitch}`);
  return parts.join(' ');
};

const describeAt = (piece, cell) => {
  const layers = describeCell(cell);
  if (layers === '') return describePiece(piece);
  return piece === null ? layers : `${describePiece(piece)} on ${layers}`;
};

/**
 * Where the screen and the engine disagree, for the dev-only check after every move; null when
 * they agree. Pieces and the cell layer both: a tangle drawn with a layer it has already lost is
 * exactly the drift this check exists to catch.
 * @param {Model} model
 * @param {import('@hooked/engine').Board} board
 * @returns {string|null}
 */
export const describeDrift = (model, board) => {
  const mine = projectPieces(model);
  const theirs = piecesOf(board);
  const myCells = projectCells(model);
  const theirCells = cellsOf(board);
  const lines = [];
  for (let y = 0; y < model.height && lines.length < 5; y += 1) {
    for (let x = 0; x < model.width && lines.length < 5; x += 1) {
      if (samePiece(mine[y][x], theirs[y][x]) && sameCell(myCells[y][x], theirCells[y][x]))
        continue;
      const shows = describeAt(mine[y][x], myCells[y][x]);
      const has = describeAt(theirs[y][x], theirCells[y][x]);
      lines.push(`(${x},${y}): board shows ${shows}, engine has ${has}`);
    }
  }
  return lines.length === 0 ? null : lines.join('\n');
};
