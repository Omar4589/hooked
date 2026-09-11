// The step player against the engine itself. For every fixture and every development board we
// play real moves, rebuild the board with applySteps (packages/engine/src/replay.js, the
// contract the phone's player must honour) and check that buildMove's model agrees cell for
// cell, pieces and layers alike — then sample the timeline it produced and check it starts
// where the board was, ends where the board is, and never lets a column cross itself on the way.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { applySteps, createGame, createRng } from '@hooked/engine';
import { listDevLevels, loadLevel } from '@hooked/levels';
import { buildModel, cellsOf, piecesOf, projectCells, projectPieces } from './model.js';
import { buildMove } from './move.js';
import { sampleCell, sampleTrack } from './animate.js';
import { SWAP_MS } from './timings.js';

const root = new URL('../../../../', import.meta.url);
const fixtures = new URL('packages/engine/fixtures/', root);
const read = (url) => JSON.parse(readFileSync(url, 'utf8'));
const boards = [
  ...readdirSync(fixtures)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => [f.slice(0, -5), read(new URL(f, fixtures))]),
  // every development board too, so the three phase-4 test levels are played here as well
  ...listDevLevels().map((level) => [level.name, loadLevel(level.id)]),
];

const P = (x, y) => ({ x, y });
const idsOf = (model) => new Set(model.pieces.keys());
const SAMPLES = 60;

/** Every property of every track, so one loop can check ordering and finiteness. */
const eachSegments = (track, fn) => {
  for (const key of ['x', 'y', 'scale', 'opacity']) fn(track[key], key);
};

/** The same for a cell's track, which has its own set of properties. */
const eachCellSegments = (track, fn) => {
  for (const key of ['x', 'y', 'scale', 'layers', 'moth', 'stitch', 'button']) {
    fn(track[key], key);
  }
};

const mothKeys = (board) => {
  const keys = [];
  board.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.moth === true) keys.push(`${x},${y}`);
    }),
  );
  return keys.sort();
};

test('buildMove reproduces the engine board and a playable timeline for every board and seed', () => {
  for (const [name, json] of boards) {
    for (let seed = 1; seed <= 10; seed += 1) {
      const game = createGame(json, `${name}/${seed}`);
      const bot = createRng(`bot/${name}/${seed}`);
      let model = buildModel(game.state().board);
      let base = 0;
      for (let turn = 0; turn < 60 && game.state().status === 'playing'; turn += 1) {
        // a random adjacent pair (usually illegal), then a real move, like the engine's own tests
        const rx = bot.int(model.width);
        const ry = bot.int(model.height);
        const pair = bot.int(2) === 0 ? [P(rx, ry), P(rx + 1, ry)] : [P(rx, ry), P(rx, ry + 1)];
        const attempts = [];
        if (pair[1].x < model.width && pair[1].y < model.height) attempts.push(pair);
        if (game.state().status === 'playing') {
          const moves = game.validMoves();
          if (moves.length > 0) attempts.push(bot.pick(moves));
        }
        for (const [a, b] of attempts) {
          const before = game.state().board;
          const { steps } = game.swap(a, b);
          if (steps.length === 0) continue;
          const previous = model;
          const previousIds = idsOf(previous);
          const move = buildMove(previous, steps, base);
          const where = `${name}/${seed}/${turn}`;

          // the model is the engine's board, however the steps got there — pieces and layers
          const replayed = applySteps(before, steps);
          assert.deepEqual(projectPieces(move.model), piecesOf(replayed), where);
          assert.deepEqual(projectPieces(move.model), piecesOf(game.state().board), where);
          assert.deepEqual(projectCells(move.model), cellsOf(replayed), `${where} cells`);
          assert.deepEqual(projectCells(move.model), cellsOf(game.state().board), `${where} cells`);

          const mounts = new Set(move.mounts);
          const removedIds = new Set(move.removed.map((r) => r.id));
          const known = new Set([...previousIds, ...mounts]);
          for (const id of move.tracks.keys()) assert.ok(known.has(id), `${where} track ${id}`);
          for (const id of removedIds) assert.ok(known.has(id), `${where} removed ${id}`);
          const rendered = move.shuffle === null ? move.model : move.shuffle.before;
          const renderedIds = idsOf(rendered);
          for (const id of removedIds) assert.ok(!renderedIds.has(id), `${where} ghost ${id}`);
          for (const id of mounts) {
            if (!removedIds.has(id)) assert.ok(renderedIds.has(id), `${where} mount ${id}`);
          }
          assert.ok(move.model.nextId > Math.max(0, ...move.model.pieces.keys()), where);
          if (move.shuffle !== null) {
            for (const id of idsOf(move.model)) assert.ok(!known.has(id), `${where} reused ${id}`);
            assert.equal(move.total, move.shuffle.at + 400, where);
          }

          // the timeline: ordered segments, and a last one that ends exactly at total
          let last = 0;
          const scan = (segments, key) => {
            let cursor = -1;
            for (const s of segments) {
              assert.ok(s.at >= cursor, `${where} ${key} out of order`);
              assert.ok(Number.isFinite(s.to) && s.duration >= 0, `${where} ${key} not finite`);
              cursor = s.at + s.duration;
              if (cursor > last) last = cursor;
            }
          };
          for (const track of move.tracks.values()) {
            assert.equal(track.base, base, where);
            eachSegments(track, scan);
          }
          for (const track of move.cells.values()) {
            assert.equal(track.base, base, `${where} cell base`);
            eachCellSegments(track, scan);
          }
          const endT = move.shuffle === null ? move.total : move.shuffle.at;
          if (move.shuffle === null) assert.equal(move.total, last, `${where} total`);

          // a board shake always lives inside the move it belongs to
          for (const shake of move.shakes) {
            assert.ok(shake.at >= 0, `${where} shake before the move`);
            assert.ok(shake.at + shake.duration <= move.total, `${where} shake outruns the move`);
            assert.ok(shake.amplitude > 0 && shake.amplitude < 1, `${where} shake amplitude`);
          }
          // the meter is a readout, not a piece: it never costs the move time
          const meters = steps.filter((s) => s.type === 'meter');
          if (meters.length > 0) assert.equal(move.meter, meters[meters.length - 1].charge, where);
          // and the meter drops at most one piece per move
          assert.ok(steps.filter((s) => s.type === 'meterDrop').length <= 1, `${where} drops`);

          // it starts where the board was and ends where the board is
          for (const [id, track] of move.tracks) {
            const start = sampleTrack(track, 0);
            assert.deepEqual(start, track.initial, `${where} start ${id}`);
            const end = sampleTrack(track, endT);
            const entry = rendered.pieces.get(id);
            if (entry === undefined) {
              // gone: faded out where it stood, or dropped off the bottom edge (a bead)
              const offBoard = end.y >= rendered.height;
              assert.ok(end.scale === 0 || offBoard, `${where} ghost scale ${id}`);
            } else {
              assert.ok(Math.abs(end.x - entry.x) < 1e-9, `${where} end x ${id}`);
              assert.ok(Math.abs(end.y - entry.y) < 1e-9, `${where} end y ${id}`);
              assert.equal(end.scale, 1, `${where} end scale ${id}`);
              assert.equal(end.opacity, 1, `${where} end opacity ${id}`);
            }
          }

          // every cell track starts and ends showing exactly what the board shows
          const endCells = projectCells(rendered === move.model ? move.model : rendered);
          for (const [key, track] of move.cells) {
            const [cx, cy] = key.split(',').map(Number);
            assert.deepEqual(sampleCell(track, 0), track.initial, `${where} cell start ${key}`);
            const shown = sampleCell(track, endT);
            const cell = endCells[cy][cx];
            assert.equal(shown.layers, cell.tangle, `${where} cell layers ${key}`);
            assert.equal(shown.moth, cell.moth ? 1 : 0, `${where} cell moth ${key}`);
            assert.equal(shown.stitch, cell.stitch, `${where} cell stitch ${key}`);
            assert.equal(shown.button, cell.buried ? 1 : 0, `${where} cell button ${key}`);
            assert.equal(shown.scale, 1, `${where} cell scale ${key}`);
            assert.ok(Math.abs(shown.x) < 1e-9 && Math.abs(shown.y) < 1e-9, `${where} cell home`);
          }

          // step by step: what each new step is allowed to change
          let rolling = before;
          for (const step of steps) {
            const next = applySteps(rolling, [step]);
            if (step.type === 'blocker') {
              // a blocker step never moves a piece, and touches its own cell alone
              assert.deepEqual(piecesOf(next), piecesOf(rolling), `${where} blocker pieces`);
              const was = cellsOf(rolling);
              const now = cellsOf(next);
              for (let y = 0; y < rolling.height; y += 1) {
                for (let x = 0; x < rolling.width; x += 1) {
                  if (x === step.pos.x && y === step.pos.y) continue;
                  assert.deepEqual(now[y][x], was[y][x], `${where} blocker spill (${x},${y})`);
                }
              }
              if (step.kind === 'knot') assert.deepEqual(now, was, `${where} knot changed a cell`);
            }
            if (step.type === 'mothSpread') {
              assert.equal(mothKeys(next).length, mothKeys(rolling).length + 1, `${where} moths`);
              assert.ok(mothKeys(next).includes(`${step.to.x},${step.to.y}`), `${where} moth to`);
              assert.ok(
                mothKeys(next).includes(`${step.from.x},${step.from.y}`),
                `${where} moth from`,
              );
            }
            if (step.type === 'beadExit') {
              const before4 = rolling.cells[step.pos.y][step.pos.x].piece;
              assert.equal(before4?.kind, 'bead', `${where} bead exit`);
              assert.equal(
                next.cells[step.pos.y][step.pos.x].piece,
                undefined,
                `${where} bead gone`,
              );
            }
            // layers only ever come off, except the moth a spread adds
            const was = cellsOf(rolling);
            const now = cellsOf(next);
            for (let y = 0; y < rolling.height; y += 1) {
              for (let x = 0; x < rolling.width; x += 1) {
                assert.ok(now[y][x].tangle <= was[y][x].tangle, `${where} tangle grew (${x},${y})`);
                assert.ok(now[y][x].stitch <= was[y][x].stitch, `${where} stitch grew (${x},${y})`);
                if (now[y][x].moth && !was[y][x].moth) {
                  assert.equal(step.type, 'mothSpread', `${where} moth appeared (${x},${y})`);
                }
              }
            }
            rolling = next;
          }
          // the bonus and the win go together
          const bonus = steps.filter((s) => s.type === 'yarnOver');
          assert.equal(move.yarnOver === null, bonus.length === 0, `${where} yarnOver`);
          if (bonus.length > 0) assert.equal(game.state().status, 'won', `${where} won`);

          // A column never crosses itself once the swap is over: gravity keeps pieces in order,
          // so a stack that inverts on screen means a piece is falling through another. The swap
          // itself is excluded because crossing is exactly what it does (and an illegal one
          // slides both pieces all the way across and back).
          const first = steps[0];
          const swapStart =
            first !== undefined && first.type === 'swap' ? (first.illegal ? endT : SWAP_MS) : 0;
          const stacks = new Map();
          for (const [id, entry] of rendered.pieces) {
            const key = `${entry.x}/${rendered.runTop[entry.y][entry.x]}`;
            if (!stacks.has(key)) stacks.set(key, []);
            stacks.get(key).push({ id, entry, track: move.tracks.get(id) });
          }
          for (const [key, stack] of stacks) {
            if (stack.length < 2) continue;
            // A run fed through a hole has no room above it, so its new pieces enter stacked on
            // the hole cell and fan out (decision 8): they may share a row on the way in.
            const chute = !key.endsWith('/0');
            stack.sort((p, q) => p.entry.y - q.entry.y);
            for (let i = 0; i <= SAMPLES; i += 1) {
              const t = swapStart + ((endT - swapStart) * i) / SAMPLES;
              let previousY = -Infinity;
              for (const { id, entry, track } of stack) {
                const p =
                  track === undefined
                    ? { y: entry.y, scale: 1, opacity: 1 }
                    : sampleTrack(track, t);
                assert.ok(Number.isFinite(p.y), `${where} y ${id}`);
                if (p.scale === 0 || p.opacity === 0) continue; // not on screen yet, or gone
                assert.ok(
                  chute ? p.y >= previousY : p.y > previousY,
                  `${where} stack crossed at ${t} (piece ${id})`,
                );
                previousY = p.y;
              }
            }
          }

          model = move.model;
          base += move.total;
        }
      }
    }
  }
});
