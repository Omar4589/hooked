import { parseBoard, renderBoard } from '../src/text.js';
import { columnRuns, posKey } from '../src/board.js';
import { matchOrders, orderFor, runFire, swapOrders, tapOrders } from '../src/fire.js';
import { mostCommonColors } from '../src/match.js';

const P = (x, y) => ({ x, y });
const keys = (cells) => cells.map((p) => `${p.x},${p.y}`);
const contextFor = (board) => {
  const scored = [];
  const runs = columnRuns(board);
  return {
    scored,
    ctx: {
      board,
      runs,
      spawnerKeys: new Set(runs.map((r) => posKey({ x: r.x, y: r.top }))),
      spawnPiece: () => ({ kind: 'yarn', color: 'olive' }),
      addScore: (n) => scored.push(n),
    },
  };
};

test('orderFor reads what a piece fires with, and nothing from a plain ball', () => {
  const board = parseBoard(['oP oB oC oY oH F. o. *. __']);
  const at = (x) => orderFor(board, P(x, 0), board.cells[0][x].piece);
  expect(at(0)).toMatchObject({ type: 'blast', special: 'puff', radius: 1, orientation: null });
  expect(at(1)).toMatchObject({ type: 'blast', special: 'bobble', radius: 2 });
  expect(at(2)).toMatchObject({ type: 'blast', special: 'popcorn', radius: 3 });
  expect(at(3)).toMatchObject({ type: 'blast', special: 'yarnbomb', radius: 4 });
  expect(at(4)).toMatchObject({
    type: 'blast',
    special: 'hook',
    radius: null,
    orientation: 'rows',
  });
  expect(at(5)).toMatchObject({ type: 'rip', color: 'olive' });
  expect(at(6)).toBe(null);
  expect(at(7)).toBe(null);
  expect(at(8)).toBe(null);
  expect(at(0).sources).toEqual(['puff']);
  expect(at(0).combo).toBe(false);
});

test('swapping two blasts fires one bigger blast from the cell swiped into', () => {
  const board = parseBoard(['oP oB o.', 'o. o. o.']);
  const orders = swapOrders(board, P(0, 0), P(1, 0));
  expect(orders.length).toBe(1);
  expect(orders[0]).toMatchObject({
    type: 'blast',
    pos: P(1, 0),
    special: 'popcorn',
    radius: 3,
    combo: true,
  });
  expect(orders[0].sources.slice().sort()).toEqual(['bobble', 'puff']);
});

test('a combo past a yarn bomb takes the whole board', () => {
  const board = parseBoard(['oY oP o.', 'o. o. o.']);
  const [order] = swapOrders(board, P(0, 0), P(1, 0));
  expect(order.radius).toBe(5);
  expect(order.special).toBe('yarnbomb');
});

test('hook plus hook sweeps rows and columns at once; hook plus blast fires both', () => {
  const hooks = parseBoard(['oH oH o.', 'o. o. o.']);
  const both = swapOrders(hooks, P(0, 0), P(1, 0));
  expect(both.length).toBe(1);
  expect(both[0]).toMatchObject({
    special: 'hook',
    orientation: 'both',
    pos: P(1, 0),
    combo: true,
  });
  const mixed = parseBoard(['oH oB o.', 'o. o. o.']);
  const pair = swapOrders(mixed, P(0, 0), P(1, 0));
  expect(pair.map((o) => o.special)).toEqual(['hook', 'bobble']);
  expect(pair.every((o) => o.pos.x === 1 && o.pos.y === 0)).toBe(true);
  expect(pair[1].radius).toBe(2); // its own radius, not max + 1
});

test('the swap axis picks the hook orientation; a double-tap means rows', () => {
  const board = parseBoard(['oH o.', 'o. o.']);
  expect(swapOrders(board, P(1, 0), P(0, 0))[0].orientation).toBe('rows');
  const down = parseBoard(['oH o.', 'o. o.']);
  expect(swapOrders(down, P(0, 1), P(0, 0))[0].orientation).toBe('cols');
  expect(tapOrders(board, P(0, 0))[0].orientation).toBe('rows');
});

test('frog plus frog rips the two most common colors', () => {
  const board = parseBoard(['F. F. m.', 'o. m. o.', 'o. m. b.']);
  const orders = swapOrders(board, P(0, 0), P(1, 0));
  expect(orders.map((o) => o.type)).toEqual(['rip', 'rip']);
  expect(orders.map((o) => o.color)).toEqual(['olive', 'mustard']); // a 3-3 tie, palette order
  expect(orders.map((o) => o.pos)).toEqual([P(1, 0), P(0, 0)]);
  expect(orders.every((o) => o.combo)).toBe(true);
});

test('frog plus a special fires the special and rips the most common color', () => {
  const board = parseBoard(['F. oB m.', 'o. o. m.']);
  const orders = swapOrders(board, P(0, 0), P(1, 0));
  expect(orders.map((o) => o.type)).toEqual(['blast', 'rip']);
  expect(orders[0]).toMatchObject({ special: 'bobble', pos: P(1, 0), radius: 2 });
  expect(orders[1]).toMatchObject({ type: 'rip', color: 'olive', pos: P(0, 0) });
});

test('frog plus a plain ball rips that ball colour, wherever the frog ended up', () => {
  const board = parseBoard(['F. m. o.', 'o. o. o.']);
  // after the exchange the frog sits at a and the ball it was swapped with is the mustard at b
  const orders = swapOrders(board, P(0, 0), P(1, 0));
  expect(orders.length).toBe(1);
  expect(orders[0]).toMatchObject({ type: 'rip', color: 'mustard', pos: P(0, 0) });
});

test('a lone special fires from the cell it landed on, and two plain balls fire nothing', () => {
  const board = parseBoard(['oP m. o.', 'o. o. o.']);
  expect(swapOrders(board, P(1, 0), P(0, 0))[0].pos).toEqual(P(0, 0));
  expect(swapOrders(board, P(0, 0), P(1, 0))[0].pos).toEqual(P(0, 0));
  expect(swapOrders(parseBoard(['o. m.']), P(0, 0), P(1, 0))).toEqual([]);
});

test('tapOrders fires what is under the finger, or nothing at all', () => {
  const board = parseBoard(['oP F. o. *. __ ..']);
  expect(tapOrders(board, P(0, 0))[0]).toMatchObject({ special: 'puff', combo: false });
  expect(tapOrders(board, P(1, 0))[0]).toMatchObject({ type: 'rip' });
  for (const x of [2, 3, 4, 5]) expect(tapOrders(board, P(x, 0))).toEqual([]);
});

test('a special caught in a match fires, unless the swap already seeded it', () => {
  const board = parseBoard(['oP o. o. m.']);
  const cells = [P(0, 0), P(1, 0), P(2, 0)];
  expect(matchOrders(board, cells, new Set())[0]).toMatchObject({ special: 'puff', pos: P(0, 0) });
  expect(matchOrders(board, cells, new Set(['0,0']))).toEqual([]);
  expect(matchOrders(board, [P(1, 0), P(2, 0)], new Set())).toEqual([]);
});

test('a puff fires, takes its plus and charges the meter', () => {
  const board = parseBoard(['o. o. o.', 'o. oP o.', 'o. o. o.']);
  const { ctx, scored } = contextFor(board);
  const out = runFire(ctx, [orderFor(board, P(1, 1), board.cells[1][1].piece)], 1);
  expect(out.steps.length).toBe(1);
  expect(out.steps[0]).toMatchObject({ type: 'blast', special: 'puff', cascade: 1, combo: false });
  expect(keys(out.steps[0].cells)).toEqual(['1,0', '0,1', '1,1', '2,1', '1,2']);
  expect(out.charge).toBe(1);
  expect(renderBoard(board)).toBe('o. __ o.\n__ __ __\no. __ o.');
  expect(scored).toEqual([out.steps[0].points]);
  // what it took, and from where: phase 4's collect goals, stitch squares and knot credit
  expect(out.removed.map((r) => [posKey(r.pos), r.piece.color, r.piece.special])).toEqual([
    ['1,0', 'olive', undefined],
    ['0,1', 'olive', undefined],
    ['1,1', 'olive', 'puff'],
    ['2,1', 'olive', undefined],
    ['1,2', 'olive', undefined],
  ]);
});

test('a blast chains into the specials it takes, one wave at a time', () => {
  const board = parseBoard(['o. oB o. o.', 'o. oP o. o.', 'o. o. o. o.', 'o. o. o. o.']);
  const { ctx } = contextFor(board);
  const out = runFire(ctx, [orderFor(board, P(1, 1), board.cells[1][1].piece)], 1);
  expect(out.steps.map((s) => s.special)).toEqual(['puff', 'bobble']);
  // no cell is ever named twice across the wave
  const named = out.steps.flatMap((s) => keys(s.cells));
  expect(new Set(named).size).toBe(named.length);
  expect(out.charge).toBe(3); // 1 + 2, one special per wave so no multi bonus
});

test('two specials firing in one wave earn the multi bonus', () => {
  const board = parseBoard(['oP o. o. oP', 'o. o. o. o.']);
  const { ctx } = contextFor(board);
  const seeds = [
    orderFor(board, P(0, 0), board.cells[0][0].piece),
    orderFor(board, P(3, 0), board.cells[0][3].piece),
  ];
  expect(runFire(ctx, seeds, 1).charge).toBe(4); // 1 + 1 + 2
});

test('overlapping blasts never take the same cell twice', () => {
  const board = parseBoard(['o. o. o. o. o.', 'oP o. oP o. o.', 'o. o. o. o. o.']);
  const { ctx } = contextFor(board);
  const seeds = [
    orderFor(board, P(0, 1), board.cells[1][0].piece),
    orderFor(board, P(2, 1), board.cells[1][2].piece),
  ];
  const out = runFire(ctx, seeds, 1);
  const named = out.steps.flatMap((s) => keys(s.cells));
  expect(new Set(named).size).toBe(named.length);
  expect(keys(out.steps[1].cells)).not.toContain('1,1');
});

test('a blast takes the frog it covers and the rip it seeds then takes only the colour', () => {
  const board = parseBoard(['m. o. m.', 'o. oP F.', 'm. o. m.']);
  const { ctx } = contextFor(board);
  const out = runFire(ctx, [orderFor(board, P(1, 1), board.cells[1][1].piece)], 1);
  expect(out.steps.map((s) => s.type)).toEqual(['blast', 'frogRip']);
  expect(keys(out.steps[0].cells)).toContain('2,1'); // the frog is taken by the blast
  expect(keys(out.steps[1].cells)).not.toContain('2,1'); // and not again by its own rip
  expect(out.steps[1].color).toBe('mustard');
  expect(out.charge).toBe(1); // a rip never charges
});

test('a blast that finds its area already empty still fires and still charges', () => {
  const board = parseBoard(['__ __ __', '__ oP __', '__ __ __']);
  const { ctx } = contextFor(board);
  const out = runFire(ctx, [orderFor(board, P(1, 1), board.cells[1][1].piece)], 1);
  expect(out.steps.length).toBe(1);
  expect(keys(out.steps[0].cells)).toEqual(['1,1']);
  expect(out.charge).toBe(1);
});

test('a blast frees a knotted ball, and the rip takes knots too', () => {
  const board = parseBoard(['o. oK o.', 'o. oP o.']);
  const { ctx } = contextFor(board);
  const out = runFire(ctx, [orderFor(board, P(1, 1), board.cells[1][1].piece)], 1);
  expect(keys(out.steps[0].cells)).toContain('1,0');
  const ripped = parseBoard(['oK m.', 'o. F.']);
  const second = contextFor(ripped);
  const rip = runFire(second.ctx, [orderFor(ripped, P(1, 1), ripped.cells[1][1].piece)], 1);
  expect(keys(rip.steps[0].cells)).toContain('0,0');
});

test('a rip consumes its own frog and scores the flat bonus on top of the balls', () => {
  const board = parseBoard(['o. m.', 'F. o.']);
  const { ctx } = contextFor(board);
  const out = runFire(ctx, [orderFor(board, P(0, 1), board.cells[1][0].piece)], 1);
  expect(out.steps[0].type).toBe('frogRip');
  expect(keys(out.steps[0].cells)).toEqual(['0,0', '0,1', '1,1']);
  expect(out.steps[0].points).toBe(2 * 20 * 1 + 500); // two olive balls, the frog scores nothing
  expect(renderBoard(board)).toBe('__ m.\n__ __');
});

test('the wave is bounded, and the seeds it was handed are never mutated', () => {
  const board = parseBoard(['o. oB o. o.', 'o. oP o. o.', 'o. o. o. o.', 'o. o. o. o.']);
  const { ctx } = contextFor(board);
  const seeds = [orderFor(board, P(1, 1), board.cells[1][1].piece)];
  const copy = JSON.parse(JSON.stringify(seeds));
  expect(() => runFire(ctx, seeds, 1, { maxWaves: 1 })).toThrow(/more than 1 blast wave/);
  expect(seeds).toEqual(copy);
});

test('mostCommonColors counts every ball and breaks ties by palette order', () => {
  const board = parseBoard(['o. m. b.', 'o. m. oK', 'oP m. __']);
  expect(mostCommonColors(board, 1)).toEqual(['olive']); // 4: one knotted, one carrying a puff
  expect(mostCommonColors(board, 3)).toEqual(['olive', 'mustard', 'blush']);
  const tie = parseBoard(['m. o.']);
  expect(mostCommonColors(tie, 1)).toEqual(['olive']); // palette order, not board order
  expect(mostCommonColors(parseBoard(['F. *.']), 1)).toEqual([]);
});
