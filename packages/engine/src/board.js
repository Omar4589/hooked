// Board data and accessors. The engine mutates one board in place inside the game closure and
// clones at its boundaries; optional cell keys are deleted, never set to undefined.

/** @typedef {import('./constants.js').Pos} Pos */
/** @typedef {import('./constants.js').Piece} Piece */
/** @typedef {import('./constants.js').Cell} Cell */
/** @typedef {import('./constants.js').Board} Board */
/** @typedef {import('./constants.js').Run} Run */

/**
 * @param {number} width
 * @param {number} height
 * @param {(x: number, y: number) => Cell} [makeCell]
 * @returns {Board}
 */
export const createBoard = (width, height, makeCell = () => ({ open: true })) => ({
  width,
  height,
  cells: Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => makeCell(x, y)),
  ),
});

/** @param {Board} board @param {Pos} pos */
export const inBounds = (board, { x, y }) =>
  Number.isInteger(x) &&
  Number.isInteger(y) &&
  x >= 0 &&
  y >= 0 &&
  x < board.width &&
  y < board.height;

/** Caller guarantees inBounds. @param {Board} board @param {Pos} pos @returns {Cell} */
export const cellAt = (board, { x, y }) => board.cells[y][x];

/** @param {Board} board @param {Pos} pos @returns {Piece|undefined} */
export const pieceAt = (board, pos) => cellAt(board, pos).piece;

/**
 * Sets or, when `piece` is undefined, removes the piece.
 * @param {Board} board
 * @param {Pos} pos
 * @param {Piece} [piece]
 */
export const setPiece = (board, pos, piece) => {
  const cell = cellAt(board, pos);
  if (piece === undefined) delete cell.piece;
  else cell.piece = piece;
};

/** @param {Board} board @param {Pos} pos @returns {Piece|undefined} the removed piece */
export const removePiece = (board, pos) => {
  const cell = cellAt(board, pos);
  const piece = cell.piece;
  delete cell.piece;
  return piece;
};

/** @param {Board} board @param {Pos} a @param {Pos} b */
export const swapPieces = (board, a, b) => {
  const pa = pieceAt(board, a);
  const pb = pieceAt(board, b);
  setPiece(board, a, pb);
  setPiece(board, b, pa);
};

/** Manhattan distance 1. @param {Pos} a @param {Pos} b */
export const isAdjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

/** @param {Pos} a @param {Pos} b */
export const samePos = (a, b) => a.x === b.x && a.y === b.y;

/** @param {Pos} pos */
export const posKey = ({ x, y }) => `${x},${y}`;

/** Row-major order: top row first, left to right. @param {Pos} a @param {Pos} b */
export const comparePos = (a, b) => a.y - b.y || a.x - b.x;

/** @param {Board} board @param {(cell: Cell, pos: Pos) => void} fn */
export const forEachCell = (board, fn) => {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) fn(board.cells[y][x], { x, y });
  }
};

/**
 * Nothing falls through a floor: a hole, a tangle, a moth, or a knotted ball.
 * @param {Cell} cell
 */
export const isFloor = (cell) =>
  !cell.open ||
  cell.tangle > 0 ||
  cell.moth === true ||
  (cell.piece !== undefined && cell.piece.knotted === true);

/** An open cell that can receive a falling or spawned piece. @param {Cell} cell */
export const isEmptyOpen = (cell) =>
  cell.open === true && cell.piece === undefined && !(cell.tangle > 0) && cell.moth !== true;

/**
 * A yarn ball with nothing on it: what the meter drops onto, what a moth eats, and what Yarn
 * Over turns into a special. Specials, knots, beads and the frog are all left alone.
 * @param {Piece} [piece]
 */
export const isPlainBall = (piece) =>
  piece !== undefined &&
  piece.kind === 'yarn' &&
  piece.special === undefined &&
  piece.knotted !== true;

/**
 * Where this exact piece object sits now, or null once it has left the board. Identity, not
 * equality: gravity and the wave move the same object around, which is how Yarn Over finds a
 * special it placed several cascades ago.
 * @param {Board} board
 * @param {Piece} piece
 * @returns {Pos|null}
 */
export const findPiece = (board, piece) => {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (board.cells[y][x].piece === piece) return { x, y };
    }
  }
  return null;
};

/** @param {Piece} piece @returns {Piece} */
export const clonePiece = (piece) => ({ ...piece });

/** @param {Cell} cell @returns {Cell} */
export const cloneCell = (cell) => {
  const copy = { ...cell };
  if (copy.piece !== undefined) copy.piece = clonePiece(copy.piece);
  return copy;
};

/**
 * Typed deep copy (no structuredClone: Hermes support is uncertain and this is faster).
 * @param {Board} board
 * @returns {Board}
 */
export const cloneBoard = (board) => ({
  width: board.width,
  height: board.height,
  cells: board.cells.map((row) => row.map(cloneCell)),
});

/**
 * Maximal vertical groups of non-hole cells, sorted by x then top. Blockers do not split a
 * run; they are floors inside it (DESIGN.md §11 conventions, phase 1).
 * @param {{ width: number, height: number, cells: { open: boolean }[][] }} grid
 * @returns {Run[]}
 */
export const columnRuns = (grid) => {
  const runs = [];
  for (let x = 0; x < grid.width; x += 1) {
    let y = 0;
    while (y < grid.height) {
      if (!grid.cells[y][x].open) {
        y += 1;
        continue;
      }
      const top = y;
      const cells = [];
      while (y < grid.height && grid.cells[y][x].open) {
        cells.push({ x, y });
        y += 1;
      }
      runs.push({ x, top, bottom: y - 1, cells });
    }
  }
  return runs;
};
