import { eligibleNeighbours, spreadCandidates, spreadMoth } from '../src/moth.js';
import { parseBoard, renderBoard } from '../src/text.js';
import { posKey } from '../src/board.js';

const P = (x, y) => ({ x, y });

/** Counts the draws so the "two picks, in this order" rule is pinned, not assumed. */
const fakeRng = (choose = 0) => {
  const draws = [];
  return {
    draws,
    pick: (items) => {
      draws.push(items.length);
      return items[choose];
    },
  };
};

test('a moth only eats a plain yarn ball beside it, and reads up, left, right, down', () => {
  const board = parseBoard(['o. o. o.', 'o. @. o.', 'o. o. o.']);
  expect(eligibleNeighbours(board, P(1, 1)).map(posKey)).toEqual(['1,0', '0,1', '2,1', '1,2']);
  const guarded = parseBoard(['o. oP o.', 'oK @. *.', 'o. #1 o.']);
  expect(eligibleNeighbours(guarded, P(1, 1))).toEqual([]);
  const empty = parseBoard(['__ @. F.']);
  expect(eligibleNeighbours(empty, P(1, 0))).toEqual([]);
});

test('candidates are the moths with something to eat, row-major', () => {
  const board = parseBoard(['@. o. @.', '__ o. #1'], ['. . .', '. . .']);
  // (0,0) can eat (1,0); (2,0) can eat (1,0) too; a moth walled in by a hole and a tangle cannot
  expect(spreadCandidates(board).map(posKey)).toEqual(['0,0', '2,0']);
  expect(spreadCandidates(parseBoard(['@. __'])).map(posKey)).toEqual([]);
});

test('a spread is two draws: which moth, then which neighbour — and the old moth stays', () => {
  const board = parseBoard(['@. o.', 'o. o.']);
  const rng = fakeRng();
  const step = spreadMoth(board, rng);
  expect(step).toEqual({ type: 'mothSpread', from: P(0, 0), to: P(1, 0) });
  expect(rng.draws).toEqual([1, 2]); // one candidate, then two neighbours
  expect(renderBoard(board)).toBe('@. @.\no. o.');
});

test('a board no moth can spread on costs no draws at all', () => {
  const board = parseBoard(['@. __', '__ #1']);
  const rng = fakeRng();
  expect(spreadMoth(board, rng)).toBeNull();
  expect(rng.draws).toEqual([]);
});
