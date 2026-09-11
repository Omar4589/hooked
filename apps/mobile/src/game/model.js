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
    nextId: id,
  };
};

/**
 * A working copy for one move. Entries are replaced rather than mutated, so sharing them is
 * safe; `open` and `runTop` never change (holes are fixed for the level).
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
  nextId: model.nextId,
});

/** Is this an open cell of the board? @param {Model} model @param {{x: number, y: number}} pos */
export const inModel = (model, pos) =>
  pos.x >= 0 &&
  pos.y >= 0 &&
  pos.x < model.width &&
  pos.y < model.height &&
  model.open[pos.y][pos.x];

/** What the screen shows, in the engine's own piece shape. @param {Model} model */
export const projectPieces = (model) =>
  model.grid.map((row) => row.map((id) => (id === null ? null : model.pieces.get(id).piece)));

/** The same view of an engine board. @param {import('@hooked/engine').Board} board */
export const piecesOf = (board) => board.cells.map((row) => row.map((cell) => cell.piece ?? null));

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

/**
 * Where the screen and the engine disagree, for the dev-only check after every move; null when
 * they agree. Pieces only: holes, tangles and stitches do not move in phase 2.
 * @param {Model} model
 * @param {import('@hooked/engine').Board} board
 * @returns {string|null}
 */
export const describeDrift = (model, board) => {
  const mine = projectPieces(model);
  const theirs = piecesOf(board);
  const lines = [];
  for (let y = 0; y < model.height && lines.length < 5; y += 1) {
    for (let x = 0; x < model.width && lines.length < 5; x += 1) {
      if (!samePiece(mine[y][x], theirs[y][x])) {
        lines.push(
          `(${x},${y}): board shows ${describePiece(mine[y][x])}, engine has ${describePiece(theirs[y][x])}`,
        );
      }
    }
  }
  return lines.length === 0 ? null : lines.join('\n');
};
