import { resolveMatches } from '../src/resolve.js';
import { columnRuns, posKey, pieceAt } from '../src/board.js';
import { findMatches } from '../src/match.js';
import { parseBoard, renderBoard } from '../src/text.js';

const P = (x, y) => ({ x, y });

const contextFor = (board, spawnColors) => {
  let i = 0;
  const scored = [];
  const runs = columnRuns(board);
  return {
    scored,
    ctx: {
      board,
      runs,
      spawnerKeys: new Set(runs.map((r) => posKey({ x: r.x, y: r.top }))),
      spawnPiece: () => {
        const color = spawnColors[i % spawnColors.length];
        i += 1;
        return { kind: 'yarn', color };
      },
      addScore: (n) => scored.push(n),
    },
  };
};

test('a swap-made 3-match: clear, no fall, spawn; sixty points; nothing left to match', () => {
  const board = parseBoard(['o. o. o. m.', 'b. r. l. c.', 'r. l. b. m.']);
  const { ctx, scored } = contextFor(board, ['blush', 'rust', 'lavender']);
  const steps = resolveMatches(ctx, [P(2, 0), P(2, 1)]);
  expect(steps.map((s) => s.type)).toEqual(['clear', 'spawn']);
  expect(steps[0]).toEqual({
    type: 'clear',
    cells: [P(0, 0), P(1, 0), P(2, 0)],
    created: [],
    cascade: 1,
    points: 60,
  });
  expect(steps[1].cells.map((c) => posKey(c.pos))).toEqual(['0,0', '1,0', '2,0']);
  expect(scored).toEqual([60]);
  expect(renderBoard(board)).toBe('b. r. l. m.\nb. r. l. c.\nr. l. b. m.');
  expect(findMatches(board)).toEqual([]);
});

test('a swap-made 4-match creates a puff at the swapped cell', () => {
  const board = parseBoard(['o. o. o. o. m.']);
  const { ctx } = contextFor(board, ['blush', 'rust', 'lavender']);
  const steps = resolveMatches(ctx, [P(3, 0)]);
  expect(steps[0].created).toEqual([
    { pos: P(3, 0), piece: { kind: 'yarn', color: 'olive', special: 'puff' } },
  ]);
  expect(steps[0].points).toBe(140);
  expect(pieceAt(board, P(3, 0))).toEqual({ kind: 'yarn', color: 'olive', special: 'puff' });
  expect(steps[0].created[0].piece).not.toBe(pieceAt(board, P(3, 0)));
  expect(renderBoard(board)).toBe('b. r. l. oP m.');
});

test('cascades number from one, a cascade-made even run spawns at its left middle, and the swapped hint is ignored after cascade one', () => {
  const board = parseBoard(['m. b. r. l.', 'o. o. o. c.']);
  const { ctx, scored } = contextFor(board, [
    'lavender',
    'lavender',
    'lavender',
    'mustard',
    'blush',
    'rust',
  ]);
  const steps = resolveMatches(ctx, [P(2, 1), P(3, 0)]);
  expect(steps.map((s) => s.type)).toEqual(['clear', 'fall', 'spawn', 'clear', 'spawn']);
  expect(steps[0].cascade).toBe(1);
  expect(steps[1].moves).toEqual([
    { from: P(0, 0), to: P(0, 1) },
    { from: P(1, 0), to: P(1, 1) },
    { from: P(2, 0), to: P(2, 1) },
  ]);
  expect(steps[3].cascade).toBe(2);
  expect(steps[3].cells).toEqual([P(0, 0), P(1, 0), P(2, 0), P(3, 0)]);
  expect(steps[3].created).toEqual([
    { pos: P(1, 0), piece: { kind: 'yarn', color: 'lavender', special: 'puff' } },
  ]);
  expect(steps[3].points).toBe(4 * 20 * 2 + 60);
  expect(scored).toEqual([60, 220]);
  expect(renderBoard(board)).toBe('m. lP b. r.\nm. b. r. c.');
  expect(findMatches(board)).toEqual([]);
});

test('two matches from one swap create two specials, each at its own swapped cell', () => {
  const board = parseBoard([
    'o. o. o. o. b.',
    'm. l. r. c. b.',
    'c. r. m. l. b.',
    'l. m. c. r. b.',
  ]);
  const { ctx } = contextFor(board, ['mustard', 'rust', 'lavender', 'cocoa', 'mustard', 'rust']);
  const steps = resolveMatches(ctx, [P(3, 0), P(4, 0)]);
  const clear = steps[0];
  expect(clear.cells).toHaveLength(8);
  expect(clear.created.map((c) => [posKey(c.pos), c.piece.color, c.piece.special])).toEqual([
    ['3,0', 'olive', 'puff'],
    ['4,0', 'blush', 'puff'],
  ]);
  for (const c of clear.created) expect(clear.cells).toContainEqual(c.pos);
  expect(clear.points).toBe(8 * 20 + 60 + 60);
  expect(pieceAt(board, P(4, 3))).toEqual({ kind: 'yarn', color: 'blush', special: 'puff' });
  expect(findMatches(board)).toEqual([]);
});

test('an L made by a cascade spawns at its corner', () => {
  const board = parseBoard(['o. b. r.', 'o. m. l.', 'o. o. o.']);
  const { ctx } = contextFor(board, ['blush', 'rust', 'lavender', 'mustard', 'cocoa']);
  const steps = resolveMatches(ctx, []);
  expect(steps[0].created).toEqual([
    { pos: P(0, 2), piece: { kind: 'yarn', color: 'olive', special: 'bobble' } },
  ]);
});

test('the step stream never shares objects with the board', () => {
  const board = parseBoard(['o. o. o. o. m.', 'b. r. l. c. r.']);
  const { ctx } = contextFor(board, ['blush', 'rust', 'lavender']);
  const steps = resolveMatches(ctx, [P(3, 0)]);
  const snapshot = JSON.parse(JSON.stringify(steps));
  pieceAt(board, P(3, 0)).color = 'cocoa';
  for (const s of steps.filter((x) => x.type === 'spawn')) {
    for (const { pos } of s.cells) pieceAt(board, pos).color = 'cocoa';
  }
  expect(steps).toStrictEqual(snapshot);
});

test('a constant-color refill hits the cascade bound and throws instead of looping forever', () => {
  const board = parseBoard(['m. b. r.', 'o. o. o.', 'l. c. m.']);
  const { ctx } = contextFor(board, ['olive']);
  expect(() => resolveMatches(ctx, [P(1, 1)])).toThrow(/more than 100 cascades/);
});

test('the reserved damage hook runs between the clear and the fall', () => {
  const board = parseBoard(['m. b. r.', 'o. o. o.']);
  const { ctx } = contextFor(board, ['blush', 'rust', 'lavender']);
  ctx.damage = (cleared) => [{ type: 'blocker', cells: cleared.length }];
  const steps = resolveMatches(ctx, [P(1, 1)]);
  expect(steps.map((s) => s.type)).toEqual(['clear', 'blocker', 'fall', 'spawn']);
});
