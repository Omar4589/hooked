import { createGame } from '../src/game.js';
import { applySteps } from '../src/replay.js';
import { createRng } from '../src/rng.js';
import { findMatches } from '../src/match.js';
import { listValidMoves, canSwap, wouldMatch } from '../src/moves.js';
import { movablePositions } from '../src/generate.js';
import { pieceAt, cloneBoard } from '../src/board.js';
import { loadFixture, seeds } from './helpers/fixtures.js';

const P = (x, y) => ({ x, y });

test('createGame validates the level and requires a seed', () => {
  expect(() => createGame({ cells: ['oo'], colors: ['olive'], moves: 3 }, 1)).toThrow(
    /at least two/,
  );
  expect(() => createGame(loadFixture('coaster-5x5'))).toThrow(/seed/);
});

test('state() has the documented shape and is a fresh snapshot', () => {
  const game = createGame(loadFixture('coaster-5x5'), 1);
  const s = game.state();
  expect(Object.keys(s).sort()).toEqual([
    'board',
    'coins',
    'goals',
    'level',
    'meter',
    'moves',
    'score',
    'status',
  ]);
  expect(s.board.width).toBe(5);
  expect(s.board.height).toBe(5);
  expect(s.moves).toBe(20);
  expect(s.score).toBe(0);
  expect(s.coins).toBe(100);
  expect(s.meter).toEqual({ kind: 'none' });
  expect(s.goals).toEqual([{ type: 'stitch' }]);
  expect(s.status).toBe('playing');
  expect(s.level).toEqual({ id: 9001, name: 'Coaster (olive)' });
  expect(s.board.cells[0][0]).toEqual({ open: false });
  expect(s.board.cells[1][1].stitch).toBe(1);
  const again = game.state();
  expect(again).toStrictEqual(s);
  expect(again).not.toBe(s);
  again.board.cells[1][1].piece.color = 'cocoa';
  again.goals[0].type = 'collect';
  again.meter.kind = 'hook';
  again.level.name = 'x';
  expect(game.state()).toStrictEqual(s);
  const withMeter = createGame(loadFixture('blockers-mix'), 1).state();
  expect(withMeter.meter).toEqual({ kind: 'frog', charge: 0, full: 10 });
  expect(withMeter.goals).toEqual([
    { type: 'clear', blocker: 'tangle' },
    { type: 'beads', count: 2 },
  ]);
});

test('an illegal swap emits exactly one step and spends nothing', () => {
  const game = createGame(loadFixture('coaster-5x5'), 5);
  const before = game.state();
  const bad = game.validMoves().length; // there is at least one valid move; find a non-matching adjacent pair instead
  expect(bad).toBeGreaterThan(0);
  const valid = new Set(game.validMoves().map(([a, b]) => `${a.x},${a.y}-${b.x},${b.y}`));
  let pair = null;
  for (let y = 1; y < 4 && pair === null; y += 1) {
    for (let x = 1; x < 3 && pair === null; x += 1) {
      if (!valid.has(`${x},${y}-${x + 1},${y}`)) pair = [P(x, y), P(x + 1, y)];
    }
  }
  const { steps } = game.swap(pair[0], pair[1]);
  expect(steps).toEqual([{ type: 'swap', a: pair[0], b: pair[1], illegal: true }]);
  expect(game.state()).toStrictEqual(before);
});

test('swaps into a hole, a tangle, a moth or a knot are illegal steps; shape errors throw', () => {
  const coaster = createGame(loadFixture('coaster-5x5'), 2);
  expect(coaster.swap(P(1, 0), P(0, 0)).steps).toEqual([
    { type: 'swap', a: P(1, 0), b: P(0, 0), illegal: true },
  ]);
  const blockers = createGame(loadFixture('blockers-mix'), 2);
  expect(blockers.swap(P(2, 0), P(2, 1)).steps[0].illegal).toBe(true); // tangle at (2,1)
  expect(blockers.swap(P(5, 4), P(5, 5)).steps[0].illegal).toBe(true); // moth at (5,5)
  expect(blockers.swap(P(1, 2), P(1, 3)).steps[0].illegal).toBe(true); // knot at (1,3)
  expect(blockers.state().moves).toBe(30);
  expect(() => coaster.swap(P(1, 1), P(3, 1))).toThrow(/not adjacent/);
  expect(() => coaster.swap(P(1, 1), P(1, 1))).toThrow(/same cell/);
  expect(() => coaster.swap(P(1, 1), P(9, 1))).toThrow(/off the board/);
  expect(() => coaster.swap(P(1.5, 1), P(2, 1))).toThrow(/integer/);
  expect(() => coaster.swap(null, P(2, 1))).toThrow(/integer/);
});

test('a legal swap spends one move, starts with swap then a cascade-1 clear, and the stream replays', () => {
  const game = createGame(loadFixture('square-7x7'), 3);
  const before = game.state();
  const [a, b] = game.validMoves()[0];
  const { steps } = game.swap(a, b);
  expect(steps[0]).toEqual({ type: 'swap', a, b, illegal: false });
  expect(steps[1].type).toBe('clear');
  expect(steps[1].cascade).toBe(1);
  expect(game.state().moves).toBe(before.moves - 1);
  expect(game.state().score).toBeGreaterThan(0);
  expect(applySteps(before.board, steps)).toStrictEqual(game.state().board);
});

test('steps never alias the live board', () => {
  const game = createGame(loadFixture('square-6x6'), 4);
  const [a, b] = game.validMoves()[0];
  const { steps } = game.swap(a, b);
  const copy = JSON.parse(JSON.stringify(steps));
  for (let i = 0; i < 5; i += 1) {
    const moves = game.validMoves();
    if (moves.length === 0) break;
    game.swap(...moves[0]);
  }
  expect(steps).toStrictEqual(copy);
  const live = game.state().board;
  for (const s of steps) {
    if (s.type === 'spawn')
      for (const { pos, piece } of s.cells) expect(piece).not.toBe(pieceAt(live, pos));
  }
});

test('tap and useBooster are not available until their phases', () => {
  const game = createGame(loadFixture('coaster-5x5'), 1);
  expect(() => game.tap(P(1, 1))).toThrow(/phase 3/);
  expect(() => game.useBooster('scissors', P(1, 1))).toThrow(/phase 4/);
});

test('validMoves returns fresh objects matching the board', () => {
  const game = createGame(loadFixture('square-6x6'), 6);
  const moves = game.validMoves();
  expect(moves).toEqual(listValidMoves(game.state().board));
  expect(moves.length).toBeGreaterThan(0);
  moves[0][0].x = 99;
  expect(game.validMoves()[0][0].x).not.toBe(99);
});

test('the same seed and the same moves give the same steps and states; another seed gives another board', () => {
  const play = (seed) => {
    const game = createGame(loadFixture('holes-split'), seed);
    const bot = createRng(`bot/${seed}`);
    const log = [];
    for (let i = 0; i < 8; i += 1) {
      const moves = game.validMoves();
      if (moves.length === 0) break;
      const [a, b] = bot.pick(moves);
      log.push(game.swap(a, b).steps);
    }
    return { log, state: game.state() };
  };
  expect(play('same')).toStrictEqual(play('same'));
  expect(play('one').state.board).not.toStrictEqual(play('two').state.board);
});

test('the game is lost when the moves run out, and further swaps do nothing', () => {
  const game = createGame(loadFixture('coaster-5x5'), 8);
  const bot = createRng('lost');
  while (game.state().status === 'playing') {
    const moves = game.validMoves();
    expect(moves.length).toBeGreaterThan(0);
    game.swap(...bot.pick(moves));
  }
  const s = game.state();
  expect(s.status).toBe('lost');
  expect(s.moves).toBe(0);
  expect(game.swap(P(1, 1), P(2, 1))).toEqual({ steps: [] });
  expect(game.state()).toStrictEqual(s);
  expect(() => game.swap(P(1, 1), P(9, 9))).toThrow(/off the board/);
});

test('state().score is the sum of the points of every clear step', () => {
  for (const seed of seeds(5)) {
    const game = createGame(loadFixture('square-7x7'), seed);
    const bot = createRng(`score/${seed}`);
    let total = 0;
    for (let i = 0; i < 10 && game.state().status === 'playing'; i += 1) {
      const { steps } = game.swap(...bot.pick(game.validMoves()));
      total += steps.filter((s) => s.type === 'clear').reduce((sum, s) => sum + s.points, 0);
      expect(game.state().score).toBe(total);
    }
    expect(total).toBeGreaterThan(0);
  }
});

test('a special made by the swap itself spawns at one of the two swapped cells', () => {
  let checked = 0;
  for (const seed of seeds(40)) {
    const game = createGame(loadFixture('square-7x7'), seed);
    for (const [a, b] of game.validMoves()) {
      const probe = createGame(loadFixture('square-7x7'), seed);
      const { steps } = probe.swap(a, b);
      const clear = steps[1];
      if (clear.created.length === 0) continue;
      for (const c of clear.created) expect([a, b]).toContainEqual(c.pos);
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(0);
});

test('a zero-weight color never spawns and never appears on the board', () => {
  const level = { ...loadFixture('square-6x6'), weights: { olive: 0 } };
  for (const seed of seeds(10)) {
    const game = createGame(level, seed);
    const bot = createRng(`zero/${seed}`);
    while (game.state().status === 'playing') {
      const moves = game.validMoves();
      if (moves.length === 0) break;
      for (const s of game.swap(...bot.pick(moves)).steps) {
        if (s.type === 'spawn')
          for (const { piece } of s.cells) expect(piece.color).not.toBe('olive');
      }
      for (const row of game.state().board.cells)
        for (const cell of row) expect(cell.piece?.color).not.toBe('olive');
    }
  }
});

test('no shuffle is emitted on the losing move, even when it leaves a dead board', () => {
  const game = createGame(loadFixture('dead-prone-5x5'), 1);
  const bot = createRng('bot/1');
  let last = [];
  while (game.state().status === 'playing') {
    const moves = game.validMoves();
    expect(moves.length).toBeGreaterThan(0);
    last = game.swap(...bot.pick(moves)).steps;
  }
  const s = game.state();
  expect(s.status).toBe('lost');
  expect(last.some((step) => step.type === 'shuffle')).toBe(false);
  // this seed ends on a dead board, which is exactly when a mistaken shuffle would fire
  expect(listValidMoves(s.board)).toEqual([]);
});

test('refill honours the level weights: spawned lavender outnumbers spawned olive on spawners-weights', () => {
  const counts = { lavender: 0, olive: 0 };
  for (const seed of seeds(20)) {
    const game = createGame(loadFixture('spawners-weights'), seed);
    const bot = createRng(`refill/${seed}`);
    for (let i = 0; i < 15 && game.state().status === 'playing'; i += 1) {
      const moves = game.validMoves();
      if (moves.length === 0) break;
      for (const s of game.swap(...bot.pick(moves)).steps) {
        if (s.type !== 'spawn') continue;
        for (const { piece } of s.cells) if (piece.color in counts) counts[piece.color] += 1;
      }
    }
  }
  expect(counts.lavender).toBeGreaterThan(2 * counts.olive);
  expect(counts.olive).toBeGreaterThan(0);
});

test('shuffles happen on the dead-prone board and always land on a playable permutation', () => {
  const shuffles = [];
  for (const seed of seeds(20)) {
    const game = createGame(loadFixture('dead-prone-5x5'), seed);
    const bot = createRng(`bot/${seed}`);
    for (let i = 0; i < 10 && game.state().status === 'playing'; i += 1) {
      const before = game.state().board;
      const moves = game.validMoves();
      expect(moves.length).toBeGreaterThan(0);
      const { steps } = game.swap(...bot.pick(moves));
      const idx = steps.findIndex((s) => s.type === 'shuffle');
      if (idx === -1) continue;
      expect(idx).toBe(steps.length - 1);
      const unshuffled = applySteps(before, steps.slice(0, idx));
      const shuffled = steps[idx].board;
      expect(shuffled).toStrictEqual(game.state().board);
      expect(findMatches(shuffled)).toEqual([]);
      expect(listValidMoves(shuffled).length).toBeGreaterThan(0);
      expect(listValidMoves(unshuffled)).toEqual([]);
      const bag = (b) =>
        movablePositions(b)
          .map((p) => JSON.stringify(pieceAt(b, p)))
          .sort();
      expect(bag(shuffled)).toEqual(bag(unshuffled));
      shuffles.push(seed);
    }
  }
  expect(shuffles.length).toBeGreaterThan(0);
});

test('a fire-only swap exchanges the pieces and spends a move until phase 3', () => {
  // Find a seed where the preset puff at (6,0) has a neighbour it can swap with and no match
  // results, so the only thing that makes the swap legal is the special.
  let found = null;
  for (let seed = 1; seed < 200 && found === null; seed += 1) {
    const game = createGame(loadFixture('blockers-mix'), seed);
    const board = game.state().board;
    for (const b of [P(5, 0), P(6, 1)]) {
      if (canSwap(board, P(6, 0), b) && !wouldMatch(board, P(6, 0), b)) {
        found = { game, b };
        break;
      }
    }
  }
  expect(found).not.toBeNull();
  const { game, b } = found;
  const before = game.state();
  const puff = pieceAt(before.board, P(6, 0));
  const other = pieceAt(before.board, b);
  expect(puff.special).toBe('puff');
  const { steps } = game.swap(P(6, 0), b);
  expect(steps).toEqual([{ type: 'swap', a: P(6, 0), b, illegal: false }]);
  const after = game.state();
  expect(after.moves).toBe(before.moves - 1);
  expect(pieceAt(after.board, b)).toEqual(puff);
  expect(pieceAt(after.board, P(6, 0))).toEqual(other);
  expect(applySteps(before.board, steps)).toStrictEqual(after.board);
});
