import { firesOnSwap, canSwap, wouldMatch, isLegalSwap, listValidMoves } from '../src/moves.js';
import { parseBoard, renderBoard } from '../src/text.js';
import { findMatches } from '../src/match.js';

const P = (x, y) => ({ x, y });

test('canSwap rejects everything that is not two adjacent, unblocked, movable pieces', () => {
  const board = parseBoard(['o. m. .. #1', '@. __ oK b.', 'r. l. c. m.']);
  expect(canSwap(board, P(0, 0), P(1, 0))).toBe(true);
  expect(canSwap(board, P(0, 0), P(2, 0))).toBe(false); // not adjacent
  expect(canSwap(board, P(0, 0), P(0, 0))).toBe(false); // same cell
  expect(canSwap(board, P(3, 0), P(3, 1))).toBe(false); // tangle
  expect(canSwap(board, P(1, 0), P(2, 0))).toBe(false); // hole
  expect(canSwap(board, P(0, 1), P(0, 2))).toBe(false); // moth
  expect(canSwap(board, P(1, 1), P(1, 2))).toBe(false); // empty
  expect(canSwap(board, P(2, 1), P(2, 2))).toBe(false); // knot
  expect(canSwap(board, P(3, 2), P(4, 2))).toBe(false); // off board
  expect(canSwap(board, P(0.5, 0), P(1, 0))).toBe(false); // not an integer
});

test('wouldMatch answers for the swapped board and leaves the board unchanged', () => {
  const board = parseBoard(['o. o. m. o.', 'b. r. l. c.']);
  const before = renderBoard(board);
  expect(wouldMatch(board, P(2, 0), P(3, 0))).toBe(true);
  expect(wouldMatch(board, P(0, 1), P(1, 1))).toBe(false);
  expect(renderBoard(board)).toBe(before);
});

test('a special or the frog is legal to swap even without a match; a bead only when the other piece matches', () => {
  const board = parseBoard(['oP m. b.', 'F. r. l.', '*. c. o.', 'o. o. *.']);
  expect(firesOnSwap({ kind: 'yarn', color: 'olive', special: 'puff' })).toBe(true);
  expect(firesOnSwap({ kind: 'frog' })).toBe(true);
  expect(firesOnSwap({ kind: 'yarn', color: 'olive' })).toBe(false);
  expect(firesOnSwap(undefined)).toBe(false);
  expect(isLegalSwap(board, P(0, 0), P(1, 0))).toBe(true); // puff, no match
  expect(isLegalSwap(board, P(0, 1), P(1, 1))).toBe(true); // frog, no match
  expect(isLegalSwap(board, P(0, 2), P(1, 2))).toBe(false); // bead, no match
  expect(isLegalSwap(board, P(2, 3), P(2, 2))).toBe(true); // bead up, olive down completes o. o. o.
  expect(isLegalSwap(board, P(1, 2), P(2, 2))).toBe(false); // plain, no match
});

test('listValidMoves lists each match-making pair once, row-major, first position first', () => {
  const board = parseBoard(['o. o. m. o.', 'b. r. l. c.', 'o. m. b. r.']);
  expect(listValidMoves(board)).toEqual([[P(2, 0), P(3, 0)]]);
  const dead = parseBoard(['o. m. b.', 'm. b. o.', 'b. o. m.']);
  expect(listValidMoves(dead)).toEqual([]);
});

test('listValidMoves adds fire-on-swap pairs only when asked', () => {
  const board = parseBoard(['oP m. b.', 'r. l. c.']);
  expect(listValidMoves(board)).toEqual([]);
  expect(listValidMoves(board, { specials: true })).toEqual([
    [P(0, 0), P(1, 0)],
    [P(0, 0), P(0, 1)],
  ]);
});

test('listValidMoves never returns a swap through a hole, tangle, moth, empty cell or knot', () => {
  // match-free; the only swaps that would make a match all pass through a blocked column-2 cell
  const board = parseBoard(['o. m. .. o.', 'o. b. #1 o.', 'r. oK @. l.', 'm. b. __ c.']);
  expect(findMatches(board)).toEqual([]);
  expect(wouldMatch(board, { x: 1, y: 2 }, { x: 2, y: 2 })).toBe(false);
  expect(listValidMoves(board)).toEqual([]);
});
