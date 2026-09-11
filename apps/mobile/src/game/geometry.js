// Board geometry. The board is laid out against a measured arena view, never the window
// (docs/DESIGN.md §11), so dropping the landscape lock or adding the phase-4 side panels is a
// layout change and not a rewrite. cellAt runs inside the pan worklet on the UI thread.

/** Cream margin kept between the board and the arena edge. */
export const BOARD_PAD = 8;

/**
 * The largest whole-pixel cell that fits the arena, and the board size it makes. Null until the
 * arena has been measured (a View reports 0x0 before its first layout) or when it is too small
 * to draw; the caller renders nothing until then.
 * @param {{ width: number, height: number }} arena
 * @param {{ width: number, height: number }} board  columns and rows
 * @param {number} [pad]
 * @returns {{ cell: number, width: number, height: number, columns: number, rows: number }|null}
 */
export const fitBoard = (arena, board, pad = BOARD_PAD) => {
  const cell = Math.floor(
    Math.min((arena.width - 2 * pad) / board.width, (arena.height - 2 * pad) / board.height),
  );
  if (!(cell >= 1)) return null;
  return {
    cell,
    width: cell * board.width,
    height: cell * board.height,
    columns: board.width,
    rows: board.height,
  };
};

/**
 * The cell under a point in board coordinates (the gesture detector wraps the board itself), or
 * null when the touch is outside it. Plain numbers, so the worklet closure stays flat.
 * @param {number} x
 * @param {number} y
 * @param {number} cell
 * @param {number} columns
 * @param {number} rows
 * @returns {{ x: number, y: number }|null}
 */
export const cellAt = (x, y, cell, columns, rows) => {
  'worklet';
  if (x < 0 || y < 0) return null;
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  if (cx >= columns || cy >= rows) return null;
  return { x: cx, y: cy };
};
