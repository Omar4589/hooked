import { applySteps } from '../src/replay.js';
import { createGame } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { normalizeLevel } from '../src/level.js';
import { columnRuns, posKey, pieceAt, forEachCell, cellAt, isAdjacent } from '../src/board.js';
import { hasFireable, firesOnSwap, isDeadBoard } from '../src/moves.js';
import { findMatches } from '../src/match.js';
import { parseBoard, renderBoard, renderStitch } from '../src/text.js';
import { SCORE } from '../src/constants.js';
import { loadFixture, fixtureNames, seeds } from './helpers/fixtures.js';

const P = (x, y) => ({ x, y });

/** The first cell holding something that can be fired, for turns with no swap left. */
const firstFireable = (board) => {
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = board.cells[y][x];
      if (cell.open && !(cell.tangle > 0) && cell.moth !== true && firesOnSwap(cell.piece)) {
        return { x, y };
      }
    }
  }
  return null;
};
const yarn = (color, extra = {}) => ({ kind: 'yarn', color, ...extra });

test('replays a legal swap and ignores an illegal one', () => {
  const board = parseBoard(['o. m.']);
  expect(
    renderBoard(applySteps(board, [{ type: 'swap', a: P(0, 0), b: P(1, 0), illegal: false }])),
  ).toBe('m. o.');
  expect(
    renderBoard(applySteps(board, [{ type: 'swap', a: P(0, 0), b: P(1, 0), illegal: true }])),
  ).toBe('o. m.');
  expect(renderBoard(board)).toBe('o. m.');
});

test('replays a clear with a created special', () => {
  const board = parseBoard(['o. o. o. o.']);
  const out = applySteps(board, [
    {
      type: 'clear',
      cells: [P(0, 0), P(1, 0), P(2, 0), P(3, 0)],
      created: [{ pos: P(3, 0), piece: yarn('olive', { special: 'puff' }) }],
      cascade: 1,
      points: 140,
    },
  ]);
  expect(renderBoard(out)).toBe('__ __ __ oP');
});

test('replays overlapping fall chains by lifting everything first', () => {
  const board = parseBoard(['o.', 'm.', '__', '__']);
  const out = applySteps(board, [
    {
      type: 'fall',
      moves: [
        { from: P(0, 1), to: P(0, 3) },
        { from: P(0, 0), to: P(0, 2) },
      ],
    },
  ]);
  expect(renderBoard(out)).toBe('__\n__\no.\nm.');
});

test('replays spawns and shuffles', () => {
  const board = parseBoard(['__ __', 'o. m.']);
  const spawned = applySteps(board, [
    {
      type: 'spawn',
      cells: [
        { pos: P(0, 0), piece: yarn('blush') },
        { pos: P(1, 0), piece: yarn('rust') },
      ],
    },
  ]);
  expect(renderBoard(spawned)).toBe('b. r.\no. m.');
  const snapshot = parseBoard(['m. o.', 'r. b.']);
  const shuffled = applySteps(board, [{ type: 'shuffle', board: snapshot }]);
  expect(shuffled).toStrictEqual(snapshot);
  expect(shuffled).not.toBe(snapshot);
});

test('pieces are cloned off the step: mutating the step afterwards leaves the board alone', () => {
  const board = parseBoard(['__ __', 'o. o.']);
  const spawn = { type: 'spawn', cells: [{ pos: P(0, 0), piece: yarn('blush') }] };
  const clear = {
    type: 'clear',
    cells: [P(0, 1)],
    created: [{ pos: P(0, 1), piece: yarn('rust', { special: 'puff' }) }],
    cascade: 1,
    points: 0,
  };
  const out = applySteps(board, [spawn, clear]);
  spawn.cells[0].piece.color = 'cocoa';
  clear.created[0].piece.special = 'bobble';
  expect(pieceAt(out, P(0, 0))).toEqual(yarn('blush'));
  expect(pieceAt(out, P(0, 1))).toEqual(yarn('rust', { special: 'puff' }));
});

test('a stream that under-reports the engine throws', () => {
  const board = parseBoard(['o. o. o. m.', '__ b. #1 r.']);
  const clear = (cells, created = []) => [{ type: 'clear', cells, created, cascade: 1, points: 0 }];
  expect(() => applySteps(board, clear([P(0, 1)]))).toThrow(/clear of an empty cell/);
  expect(() =>
    applySteps(
      board,
      clear(
        [P(0, 0), P(1, 0), P(2, 0)],
        [{ pos: P(3, 0), piece: yarn('olive', { special: 'puff' }) }],
      ),
    ),
  ).toThrow(/not among the cleared cells/);
  expect(() =>
    applySteps(board, [{ type: 'fall', moves: [{ from: P(0, 1), to: P(0, 0) }] }]),
  ).toThrow(/fall from an empty cell/);
  expect(() =>
    applySteps(board, [{ type: 'fall', moves: [{ from: P(0, 0), to: P(1, 1) }] }]),
  ).toThrow(/occupied or blocked/);
  expect(() =>
    applySteps(board, [{ type: 'spawn', cells: [{ pos: P(2, 1), piece: yarn('olive') }] }]),
  ).toThrow(/occupied or blocked/);
  expect(() =>
    applySteps(board, [{ type: 'spawn', cells: [{ pos: P(0, 0), piece: yarn('olive') }] }]),
  ).toThrow(/occupied or blocked/);
  expect(() =>
    applySteps(board, [{ type: 'swap', a: P(0, 0), b: P(0, 1), illegal: false }]),
  ).toThrow(/empty cell/);
  expect(() => applySteps(board, [{ type: 'teleport', pos: P(0, 0) }])).toThrow(
    /unsupported step type 'teleport'/,
  );
  expect(() =>
    applySteps(board, [{ type: 'clear', cells: [P(9, 9)], created: [], cascade: 1, points: 0 }]),
  ).toThrow(/off the board/);
});

const blocker = (pos, kind, layersLeft, extra = {}) => ({
  type: 'blocker',
  pos,
  kind,
  layersLeft,
  points: kind === 'stitch' ? 1000 : 200,
  ...extra,
});

test('replays a tangle losing its layers, and the button that comes out with the last one', () => {
  const board = parseBoard(['#2 o.']);
  const one = applySteps(board, [blocker(P(0, 0), 'tangle', 1)]);
  expect(renderBoard(one)).toBe('#1 o.');
  expect(renderBoard(applySteps(one, [blocker(P(0, 0), 'tangle', 0)]))).toBe('__ o.');
  const buried = parseBoard(['x1 o.']);
  expect(renderBoard(applySteps(buried, [blocker(P(0, 0), 'tangle', 0, { buried: true })]))).toBe(
    '__ o.',
  );
});

test('a blocker step that disagrees with the cell it names throws', () => {
  const board = parseBoard(['#2 x2 @. oK', '__ o. o. o.'], ['. . . .', '1 . . .']);
  const bad = (step) => () => applySteps(board, [step]);
  expect(bad(blocker(P(0, 0), 'tangle', 0))).toThrow(/expected 1 layers, found 2/);
  expect(bad(blocker(P(1, 0), 'tangle', 0))).toThrow(/expected 1 layers, found 2/);
  expect(bad(blocker(P(0, 0), 'tangle', 1, { buried: true }))).toThrow(/frees no button/);
  expect(bad({ ...blocker(P(1, 0), 'tangle', 1), buried: undefined })).not.toThrow(); // a 2-layer buried tangle's first hit carries no flag
  expect(bad(blocker(P(2, 0), 'moth', 1))).toThrow(/a moth has one layer/);
  expect(bad(blocker(P(0, 1), 'moth', 0))).toThrow(/no moth there/);
  expect(bad(blocker(P(3, 0), 'knot', 0))).toThrow(/the knotted ball is still there/);
  expect(bad(blocker(P(0, 1), 'stitch', 1))).toThrow(/expected 2 layers, found 1/);
  expect(bad(blocker(P(1, 1), 'stitch', 0))).toThrow(/expected 1 layers, found 0/);
  expect(bad(blocker(P(0, 0), 'zap', 0))).toThrow(/unknown blocker kind 'zap'/);
  expect(bad({ ...blocker(P(0, 0), 'tangle', 1), layersLeft: -1 })).toThrow(/must be a count/);
});

test('a knot step is credit, not a board change: the cell may be empty or hold a created special', () => {
  const board = parseBoard(['__ oP']);
  expect(renderBoard(applySteps(board, [blocker(P(0, 0), 'knot', 0)]))).toBe('__ oP');
  expect(renderBoard(applySteps(board, [blocker(P(1, 0), 'knot', 0)]))).toBe('__ oP');
});

test('a stitch square flips one layer at a time and then leaves the cell alone', () => {
  const board = parseBoard(['o. o.'], ['2 1']);
  const once = applySteps(board, [blocker(P(0, 0), 'stitch', 1)]);
  expect(renderStitch(once)).toBe('1 1');
  const twice = applySteps(once, [blocker(P(0, 0), 'stitch', 0), blocker(P(1, 0), 'stitch', 0)]);
  expect(renderStitch(twice)).toBe('. .');
  expect(renderBoard(twice)).toBe('o. o.');
});

test('a moth spread eats the ball beside it and leaves the old moth where it was', () => {
  const board = parseBoard(['@. o.', 'o. o.']);
  const out = applySteps(board, [{ type: 'mothSpread', from: P(0, 0), to: P(1, 0) }]);
  expect(renderBoard(out)).toBe('@. @.\no. o.');
  const bad = (from, to) => () => applySteps(board, [{ type: 'mothSpread', from, to }]);
  expect(bad(P(1, 0), P(0, 0))).toThrow(/no moth there/);
  expect(bad(P(0, 0), P(1, 1))).toThrow(/not adjacent/);
  expect(bad(P(0, 0), P(9, 0))).toThrow(/off the board/);
  for (const token of ['oP', 'oK', '*.', '__', '@.']) {
    const guarded = parseBoard([`@. ${token}`, 'o. o.']);
    expect(() => applySteps(guarded, [{ type: 'mothSpread', from: P(0, 0), to: P(1, 0) }])).toThrow(
      /no plain yarn ball to eat/,
    );
  }
});

test('a bead exits, and only a bead', () => {
  const board = parseBoard(['*. o.']);
  expect(renderBoard(applySteps(board, [{ type: 'beadExit', pos: P(0, 0), points: 2000 }]))).toBe(
    '__ o.',
  );
  expect(() => applySteps(board, [{ type: 'beadExit', pos: P(1, 0), points: 2000 }])).toThrow(
    /no bead there/,
  );
});

test('yarn over places a special on every ball it names, and nothing else', () => {
  const board = parseBoard(['o. m. oK oP *.']);
  const over = (specials, extra = {}) => ({
    type: 'yarnOver',
    specials,
    coins: 40,
    moves: 2,
    ...extra,
  });
  const out = applySteps(board, [
    over([
      { pos: P(0, 0), piece: yarn('olive', { special: 'puff' }) },
      { pos: P(1, 0), piece: yarn('mustard', { special: 'bobble' }) },
    ]),
  ]);
  expect(renderBoard(out)).toBe('oP mB oK oP *.');
  const bad = (specials, extra) => () => applySteps(board, [over(specials, extra)]);
  expect(bad([{ pos: P(0, 0), piece: yarn('rust', { special: 'puff' }) }])).toThrow(
    /must ride the ball/,
  );
  expect(bad([{ pos: P(0, 0), piece: yarn('olive', { special: 'popcorn' }) }])).toThrow(
    /must ride the ball/,
  );
  expect(bad([{ pos: P(0, 0), piece: yarn('olive') }])).toThrow(/must ride the ball/);
  expect(bad([{ pos: P(2, 0), piece: yarn('olive', { special: 'puff' }) }])).toThrow(
    /no plain yarn ball/,
  );
  expect(bad([{ pos: P(3, 0), piece: yarn('olive', { special: 'puff' }) }])).toThrow(
    /no plain yarn ball/,
  );
  expect(bad([{ pos: P(4, 0), piece: yarn('olive', { special: 'puff' }) }])).toThrow(
    /no plain yarn ball/,
  );
  const twice = { pos: P(0, 0), piece: yarn('olive', { special: 'puff' }) };
  expect(bad([twice, twice])).toThrow(/names a cell twice/);
  expect(bad([], { coins: -1 })).toThrow(/must be counts/);
  expect(bad([], { moves: 1.5 })).toThrow(/must be counts/);
});

test('completeness: replaying the steps of every move reproduces the engine board, with invariants, for every fixture', () => {
  let wonSeeds = 0;
  for (const name of fixtureNames()) {
    const json = loadFixture(name);
    const level = normalizeLevel(json);
    const runs = columnRuns({ width: level.width, height: level.height, cells: level.grid });
    const spawnerKeys = new Set(level.spawners.map(posKey));
    const exitKeys = new Set(level.exits.map(posKey));
    const runOf = new Map();
    for (const r of runs) for (const p of r.cells) runOf.set(posKey(p), r);
    for (const seed of seeds(20)) {
      const game = createGame(json, `${name}/${seed}`);
      const bot = createRng(`bot/${name}/${seed}`);
      let guard = 0;
      let beadsSpawnedTotal = 0;
      while (game.state().status === 'playing' && guard < 200) {
        guard += 1;
        const beforeState = game.state();
        const before = beforeState.board;
        const count = (kind) => {
          let n = 0;
          forEachCell(before, (c) => {
            if (c.piece?.kind === kind) n += 1;
          });
          return n;
        };
        // a random adjacent pair first: usually illegal, sometimes fire-only, occasionally legal
        const rx = bot.int(before.width);
        const ry = bot.int(before.height);
        const pair = bot.int(2) === 0 ? [P(rx, ry), P(rx + 1, ry)] : [P(rx, ry), P(rx, ry + 1)];
        let steps = [];
        let tapsThisTurn = 0;
        if (pair[1].x < before.width && pair[1].y < before.height) {
          steps = game.swap(pair[0], pair[1]).steps;
        }
        if (game.state().status === 'playing') {
          // With specials firing, "the player can act" is the real invariant: a live board may
          // have no match-making swap left, only one that fires something, or only a tap.
          const moves = game.validMoves({ specials: true });
          const canAct = moves.length > 0 || hasFireable(before);
          expect({ name, seed, canAct }).toEqual({ name, seed, canAct: true });
          if (moves.length > 0) {
            steps = steps.concat(game.swap(...bot.pick(moves)).steps);
          } else {
            const target = firstFireable(before);
            const tapped = game.tap(target);
            if (tapped.steps.length > 0) tapsThisTurn += 1;
            steps = steps.concat(tapped.steps);
          }
        }
        const afterState = game.state();
        const after = afterState.board;
        const replayed = applySteps(before, steps);
        expect(replayed).toStrictEqual(after);
        const points = steps.reduce((sum, s) => sum + (s.points === undefined ? 0 : s.points), 0);
        expect(afterState.score - beforeState.score).toBe(points);
        const legalSwaps = steps.filter((s) => s.type === 'swap' && !s.illegal).length;
        const taps = tapsThisTurn;
        const spent = legalSwaps + taps;
        // Yarn Over spends whatever is left over, so a winning move is the one exception
        if (afterState.status === 'won') expect(afterState.moves).toBe(0);
        else expect(beforeState.moves - afterState.moves).toBe(spent);
        // step by step: the board right before each clear must match exactly the cleared cells,
        // which pins the colors of transient pieces (spawned in one cascade, cleared in the next)
        let rolling = before;
        for (const s of steps) {
          if (s.type === 'clear') {
            const matched = findMatches(rolling);
            const union = [...new Set(matched.flatMap((m) => m.cells.map(posKey)))].sort();
            expect(union).toEqual(s.cells.map(posKey).sort());
            for (const c of s.created) {
              const owner = matched.find((m) => m.cells.some((p) => posKey(p) === posKey(c.pos)));
              expect(owner.color).toBe(c.piece.color);
            }
          }
          if (s.type === 'fall') {
            const byRun = new Map();
            for (const m of s.moves) {
              const r = runOf.get(posKey(m.from));
              if (!byRun.has(r)) byRun.set(r, []);
              byRun.get(r).push(m);
            }
            for (const ms of byRun.values()) {
              const sorted = [...ms].sort((p, q) => p.from.y - q.from.y);
              for (let i = 1; i < sorted.length; i += 1)
                expect(sorted[i].to.y).toBeGreaterThan(sorted[i - 1].to.y);
            }
          }
          rolling = applySteps(rolling, [s]);
        }
        // invariants on the stream
        for (const s of steps) {
          if (s.type === 'fall') {
            for (const { from, to } of s.moves) {
              expect(to.x).toBe(from.x);
              expect(to.y).toBeGreaterThan(from.y);
              expect(runOf.get(posKey(from))).toBe(runOf.get(posKey(to)));
            }
          }
          if (s.type === 'spawn') {
            const byRun = new Map();
            for (const { pos } of s.cells) {
              const r = runOf.get(posKey(pos));
              expect(spawnerKeys.has(posKey({ x: r.x, y: r.top }))).toBe(true);
              if (!byRun.has(r)) byRun.set(r, []);
              byRun.get(r).push(pos.y);
            }
            for (const [r, ys] of byRun) {
              expect(ys).toEqual(Array.from({ length: ys.length }, (_, i) => r.top + i));
            }
          }
        }
        forEachCell(after, (cell, pos) => {
          if (!level.grid[pos.y][pos.x].open) expect(cell).toEqual({ open: false });
          if (cell.piece?.knotted) expect(pieceAt(before, pos)?.knotted).toBe(true);
        });
        const countAfter = (kind) => {
          let n = 0;
          forEachCell(after, (c) => {
            if (c.piece?.kind === kind) n += 1;
          });
          return n;
        };
        // beads leave only through an exit and arrive only from a spawner, on the schedule
        const beadExits = steps.filter((s) => s.type === 'beadExit');
        for (const s of beadExits) expect(exitKeys.has(posKey(s.pos))).toBe(true);
        const beadSpawns = steps
          .filter((s) => s.type === 'spawn')
          .flatMap((s) => s.cells)
          .filter((c) => c.piece.kind === 'bead');
        expect(countAfter('bead')).toBe(count('bead') - beadExits.length + beadSpawns.length);
        expect(beadSpawns.length).toBeLessThanOrEqual(spent);
        for (const c of beadSpawns) expect(spawnerKeys.has(posKey(c.pos))).toBe(true);
        beadsSpawnedTotal += beadSpawns.length;
        expect(beadsSpawnedTotal).toBeLessThanOrEqual(
          Math.max(0, level.beads.total - level.beads.onBoard),
        );
        // a frog fires exactly once and is always consumed, and the meter may drop a new one
        const rips = steps.filter((s) => s.type === 'frogRip').length;
        const drops = steps.filter((s) => s.type === 'meterDrop' && s.piece.kind === 'frog').length;
        expect(countAfter('frog')).toBe(count('frog') - rips + drops);
        // knots only leave through a clear, and each one that left is credited exactly once
        const untied = [];
        forEachCell(before, (cell, pos) => {
          if (cell.piece?.knotted && !cellAt(after, pos).piece?.knotted) {
            const cleared = steps.some(
              (s) =>
                (s.type === 'clear' || s.type === 'blast' || s.type === 'frogRip') &&
                s.cells.some((c) => c.x === pos.x && c.y === pos.y),
            );
            expect({ name, seed, pos, cleared }).toEqual({ name, seed, pos, cleared: true });
            untied.push(posKey(pos));
          }
        });
        const blockers = steps.filter((s) => s.type === 'blocker');
        expect(
          blockers
            .filter((s) => s.kind === 'knot')
            .map((s) => posKey(s.pos))
            .sort(),
        ).toEqual(untied.sort());
        // a stitch square only flips where a piece left this move
        for (const s of blockers.filter((b) => b.kind === 'stitch')) {
          const left = steps.some(
            (t) =>
              (t.type === 'clear' || t.type === 'blast' || t.type === 'frogRip') &&
              t.cells.some((c) => posKey(c) === posKey(s.pos)),
          );
          expect({ name, seed, pos: s.pos, left }).toEqual({ name, seed, pos: s.pos, left: true });
        }
        // cell state only ever loses layers, and a button comes out with the last one
        forEachCell(after, (cell, pos) => {
          const was = cellAt(before, pos);
          expect(cell.tangle ?? 0).toBeLessThanOrEqual(was.tangle ?? 0);
          expect(cell.stitch ?? 0).toBeLessThanOrEqual(was.stitch ?? 0);
          if (cell.buried === true) {
            expect(was.buried).toBe(true);
            expect(cell.tangle).toBeGreaterThan(0);
          }
          if (was.buried === true && cell.buried !== true) expect(cell.tangle).toBeUndefined();
        });
        // moths: the set grows by exactly what spread and shrinks by exactly what was cleared
        const mothKeys = (b) => {
          const keys = [];
          forEachCell(b, (c, pos) => {
            if (c.moth === true) keys.push(posKey(pos));
          });
          return keys;
        };
        const spreads = steps.filter((s) => s.type === 'mothSpread');
        expect(spreads.length).toBeLessThanOrEqual(spent);
        for (const s of spreads) expect(isAdjacent(s.from, s.to)).toBe(true);
        const expectedMoths = new Set(mothKeys(before));
        for (const s of steps) {
          if (s.type === 'mothSpread') expectedMoths.add(posKey(s.to));
          if (s.type === 'blocker' && s.kind === 'moth') expectedMoths.delete(posKey(s.pos));
        }
        expect(mothKeys(after).sort()).toEqual([...expectedMoths].sort());
        // won, lost, or still playing: each with the shape the level rules promise
        if (afterState.status === 'won') {
          expect(afterState.goals.length).toBeGreaterThan(0);
          expect(afterState.goals.every((g) => g.remaining === 0)).toBe(true);
          const bonus = steps.filter((s) => s.type === 'yarnOver');
          expect(bonus).toHaveLength(1);
          expect(bonus[0].coins).toBe(SCORE.coinsPerMove * bonus[0].moves);
          expect(afterState.coins).toBe(level.coins + bonus[0].coins);
          const tail = steps.slice(steps.indexOf(bonus[0]) + 1);
          const after4 = ['mothSpread', 'meterDrop', 'shuffle'];
          expect(tail.some((s) => after4.includes(s.type))).toBe(false);
          expect(
            tail
              .filter((s) => s.type === 'spawn')
              .flatMap((s) => s.cells)
              .some((c) => c.piece.kind === 'bead'),
          ).toBe(false);
        } else {
          expect(steps.some((s) => s.type === 'yarnOver')).toBe(false);
          expect(afterState.coins).toBe(level.coins);
          if (afterState.status === 'lost') {
            // out of moves with something still to do, or a board no shuffle could save
            const ranOut = afterState.moves === 0;
            const stuck = isDeadBoard(after) && !steps.some((s) => s.type === 'shuffle');
            expect({ name, seed, over: ranOut || stuck }).toEqual({ name, seed, over: true });
            if (ranOut && afterState.goals.length > 0) {
              expect(afterState.goals.some((g) => g.remaining > 0)).toBe(true);
            }
          } else {
            expect(afterState.moves).toBeGreaterThan(0);
          }
        }
      }
      expect(guard).toBeLessThan(200);
      if (game.state().status === 'won') wonSeeds += 1;
    }
  }
  // the won branch above is only worth having if the sweep actually reaches it
  expect(wonSeeds).toBeGreaterThan(0);
});
