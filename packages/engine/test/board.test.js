import {
  createBoard,
  inBounds,
  cellAt,
  pieceAt,
  setPiece,
  removePiece,
  swapPieces,
  isAdjacent,
  samePos,
  posKey,
  comparePos,
  forEachCell,
  isFloor,
  isEmptyOpen,
  cloneBoard,
  columnRuns,
} from '../src/board.js';
import { parseBoard } from '../src/text.js';

const hasUndefinedValue = (obj) =>
  Object.values(obj).some(
    (v) => v === undefined || (v && typeof v === 'object' && hasUndefinedValue(v)),
  );

test('createBoard builds width x height cells indexed [y][x]', () => {
  const board = createBoard(3, 2, (x, y) => ({ open: true, tag: `${x},${y}` }));
  expect(board.width).toBe(3);
  expect(board.height).toBe(2);
  expect(board.cells[1][2].tag).toBe('2,1');
});

test('inBounds rejects non-integers and off-board positions', () => {
  const board = createBoard(3, 3);
  expect(inBounds(board, { x: 0, y: 0 })).toBe(true);
  expect(inBounds(board, { x: 2, y: 2 })).toBe(true);
  expect(inBounds(board, { x: 3, y: 0 })).toBe(false);
  expect(inBounds(board, { x: -1, y: 0 })).toBe(false);
  expect(inBounds(board, { x: 1.5, y: 0 })).toBe(false);
});

test('setPiece with undefined removes the key; removePiece returns the piece', () => {
  const board = createBoard(2, 1);
  const piece = { kind: 'yarn', color: 'olive' };
  setPiece(board, { x: 0, y: 0 }, piece);
  expect(pieceAt(board, { x: 0, y: 0 })).toBe(piece);
  setPiece(board, { x: 0, y: 0 }, undefined);
  expect(Object.keys(cellAt(board, { x: 0, y: 0 }))).toEqual(['open']);
  setPiece(board, { x: 1, y: 0 }, piece);
  expect(removePiece(board, { x: 1, y: 0 })).toBe(piece);
  expect(Object.keys(cellAt(board, { x: 1, y: 0 }))).toEqual(['open']);
});

test('swapPieces exchanges pieces, including with an empty cell', () => {
  const board = parseBoard(['o. m.', '__ b.']);
  swapPieces(board, { x: 0, y: 0 }, { x: 1, y: 0 });
  expect(pieceAt(board, { x: 0, y: 0 }).color).toBe('mustard');
  expect(pieceAt(board, { x: 1, y: 0 }).color).toBe('olive');
  swapPieces(board, { x: 0, y: 1 }, { x: 1, y: 1 });
  expect(pieceAt(board, { x: 0, y: 1 }).color).toBe('blush');
  expect(pieceAt(board, { x: 1, y: 1 })).toBeUndefined();
  expect(Object.keys(cellAt(board, { x: 1, y: 1 }))).toEqual(['open']);
});

test('adjacency, equality, keys and row-major ordering', () => {
  expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
  expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 0 })).toBe(true);
  expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
  expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(false);
  expect(samePos({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(true);
  expect(posKey({ x: 3, y: 4 })).toBe('3,4');
  const sorted = [
    { x: 2, y: 1 },
    { x: 0, y: 1 },
    { x: 5, y: 0 },
  ].sort(comparePos);
  expect(sorted).toEqual([
    { x: 5, y: 0 },
    { x: 0, y: 1 },
    { x: 2, y: 1 },
  ]);
});

test('forEachCell visits every cell row-major with its position', () => {
  const board = createBoard(2, 2);
  const visited = [];
  forEachCell(board, (cell, pos) => visited.push(posKey(pos)));
  expect(visited).toEqual(['0,0', '1,0', '0,1', '1,1']);
});

test('floors and empty-open cells per cell type', () => {
  const board = parseBoard(['.. #1 @. oK', 'x2 __ o. *.']);
  const at = (x, y) => cellAt(board, { x, y });
  expect(isFloor(at(0, 0))).toBe(true); // hole
  expect(isFloor(at(1, 0))).toBe(true); // tangle
  expect(isFloor(at(2, 0))).toBe(true); // moth
  expect(isFloor(at(3, 0))).toBe(true); // knotted ball
  expect(isFloor(at(0, 1))).toBe(true); // buried tangle
  expect(isFloor(at(1, 1))).toBe(false); // empty
  expect(isFloor(at(2, 1))).toBe(false); // plain ball
  expect(isFloor(at(3, 1))).toBe(false); // bead
  expect(isEmptyOpen(at(1, 1))).toBe(true);
  for (const [x, y] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [0, 1],
    [2, 1],
    [3, 1],
  ]) {
    expect(isEmptyOpen(at(x, y))).toBe(false);
  }
});

test('cloneBoard is deep and leaves no undefined-valued keys', () => {
  const board = parseBoard(['o. #2 ..', 'F. *. lP']);
  const copy = cloneBoard(board);
  expect(copy).toStrictEqual(board);
  expect(copy).not.toBe(board);
  expect(copy.cells[0][0].piece).not.toBe(board.cells[0][0].piece);
  copy.cells[0][0].piece.color = 'rust';
  expect(board.cells[0][0].piece.color).toBe('olive');
  expect(hasUndefinedValue(copy)).toBe(false);
});

test('columnRuns splits columns at holes only, sorted by x then top', () => {
  const board = parseBoard(['o. o. o.', 'o. .. #1', 'o. o. o.', '.. o. o.']);
  const runs = columnRuns(board);
  expect(runs.map((r) => [r.x, r.top, r.bottom])).toEqual([
    [0, 0, 2],
    [1, 0, 0],
    [1, 2, 3],
    [2, 0, 3],
  ]);
  expect(runs[2].cells).toEqual([
    { x: 1, y: 2 },
    { x: 1, y: 3 },
  ]);
});
