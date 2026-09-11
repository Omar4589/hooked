import { applySteps } from '../src/replay.js';
import { createGame } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { normalizeLevel } from '../src/level.js';
import { columnRuns, posKey, pieceAt, forEachCell, cellAt } from '../src/board.js';
import { findMatches } from '../src/match.js';
import { parseBoard, renderBoard } from '../src/text.js';
import { loadFixture, fixtureNames, seeds } from './helpers/fixtures.js';

const P = (x, y) => ({ x, y });
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
  expect(() => applySteps(board, [{ type: 'blast', pos: P(0, 0) }])).toThrow(
    /unsupported step type 'blast'/,
  );
  expect(() =>
    applySteps(board, [{ type: 'clear', cells: [P(9, 9)], created: [], cascade: 1, points: 0 }]),
  ).toThrow(/off the board/);
});

test('completeness: replaying the steps of every move reproduces the engine board, with invariants, for every fixture', () => {
  for (const name of fixtureNames()) {
    const json = loadFixture(name);
    const level = normalizeLevel(json);
    const runs = columnRuns({ width: level.width, height: level.height, cells: level.grid });
    const spawnerKeys = new Set(level.spawners.map(posKey));
    const runOf = new Map();
    for (const r of runs) for (const p of r.cells) runOf.set(posKey(p), r);
    for (const seed of seeds(20)) {
      const game = createGame(json, `${name}/${seed}`);
      const bot = createRng(`bot/${name}/${seed}`);
      let guard = 0;
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
        if (pair[1].x < before.width && pair[1].y < before.height) {
          steps = game.swap(pair[0], pair[1]).steps;
        }
        if (game.state().status === 'playing') {
          const moves = game.validMoves();
          expect({ name, seed, hasMove: moves.length > 0 }).toEqual({ name, seed, hasMove: true });
          steps = steps.concat(game.swap(...bot.pick(moves)).steps);
        }
        const afterState = game.state();
        const after = afterState.board;
        const replayed = applySteps(before, steps);
        expect(replayed).toStrictEqual(after);
        const points = steps
          .filter((s) => s.type === 'clear')
          .reduce((sum, s) => sum + s.points, 0);
        expect(afterState.score - beforeState.score).toBe(points);
        const legalSwaps = steps.filter((s) => s.type === 'swap' && !s.illegal).length;
        expect(beforeState.moves - afterState.moves).toBe(legalSwaps);
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
        expect(countAfter('bead')).toBe(count('bead'));
        expect(countAfter('frog')).toBe(count('frog'));
        // knots only leave through a clear
        forEachCell(before, (cell, pos) => {
          if (cell.piece?.knotted && !cellAt(after, pos).piece?.knotted) {
            const cleared = steps.some(
              (s) => s.type === 'clear' && s.cells.some((c) => c.x === pos.x && c.y === pos.y),
            );
            expect({ name, seed, pos, cleared }).toEqual({ name, seed, pos, cleared: true });
          }
        });
      }
      expect(guard).toBeLessThan(200);
    }
  }
});
