import { placeYarnOver } from '../src/yarnover.js';
import { parseBoard, renderBoard } from '../src/text.js';
import { findPiece, posKey } from '../src/board.js';

/** Records every draw so the order (which ball, then which special) is pinned. */
const fakeRng = () => {
  const draws = [];
  return {
    draws,
    int: (n) => {
      draws.push(`int:${n}`);
      return 0;
    },
    pick: (items) => {
      draws.push(`pick:${items.length}`);
      return items[0];
    },
  };
};

test('one special per unused move, riding the ball it lands on, drawn without replacement', () => {
  const board = parseBoard(['o. m. b.']);
  const rng = fakeRng();
  const placed = placeYarnOver(board, rng, 2);
  expect(placed.map((p) => [posKey(p.pos), p.piece.color, p.piece.special])).toEqual([
    ['0,0', 'olive', 'puff'],
    ['1,0', 'mustard', 'puff'],
  ]);
  expect(rng.draws).toEqual(['int:3', 'pick:2', 'int:2', 'pick:2']);
  expect(renderBoard(board)).toBe('oP mP b.');
  // the caller finds them again by identity, after a cascade has moved them around
  for (const { piece, pos } of placed) expect(findPiece(board, piece)).toEqual(pos);
});

test('specials, knots, beads, the frog and blockers are never chosen, and the board may run out', () => {
  const board = parseBoard(['oP oK *. F. #1 o.']);
  const placed = placeYarnOver(board, fakeRng(), 5);
  expect(placed.map((p) => posKey(p.pos))).toEqual(['5,0']);
  expect(renderBoard(board)).toBe('oP oK *. F. #1 oP');
});

test('winning on the last move places nothing and draws nothing', () => {
  const board = parseBoard(['o. m.']);
  const rng = fakeRng();
  expect(placeYarnOver(board, rng, 0)).toEqual([]);
  expect(rng.draws).toEqual([]);
  expect(renderBoard(board)).toBe('o. m.');
});
