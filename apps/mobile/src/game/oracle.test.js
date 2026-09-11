// The step player against the engine itself. For every fixture and the sandbox board we play
// real moves, rebuild the board with applySteps (packages/engine/src/replay.js, the contract
// the phone's player must honour) and check that buildMove's model agrees cell for cell — then
// sample the timeline it produced and check it starts where the board was, ends where the board
// is, and never lets a column cross itself on the way.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { applySteps, createGame, createRng } from '@hooked/engine';
import { buildModel, piecesOf, projectPieces } from './model.js';
import { buildMove } from './move.js';
import { sampleTrack } from './animate.js';
import { SWAP_MS } from './timings.js';

const root = new URL('../../../../', import.meta.url);
const fixtures = new URL('packages/engine/fixtures/', root);
const read = (url) => JSON.parse(readFileSync(url, 'utf8'));
const boards = [
  ...readdirSync(fixtures)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => [f.slice(0, -5), read(new URL(f, fixtures))]),
  ['sandbox-9x9', read(new URL('packages/levels/levels/dev/sandbox-9x9.json', root))],
];

const P = (x, y) => ({ x, y });
const idsOf = (model) => new Set(model.pieces.keys());
const SAMPLES = 60;

/** Every property of every track, so one loop can check ordering and finiteness. */
const eachSegments = (track, fn) => {
  for (const key of ['x', 'y', 'scale', 'opacity']) fn(track[key], key);
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

          // the model is the engine's board, however the steps got there
          assert.deepEqual(projectPieces(move.model), piecesOf(applySteps(before, steps)), where);
          assert.deepEqual(projectPieces(move.model), piecesOf(game.state().board), where);

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
          for (const track of move.tracks.values()) {
            assert.equal(track.base, base, where);
            eachSegments(track, (segments, key) => {
              let cursor = -1;
              for (const s of segments) {
                assert.ok(s.at >= cursor, `${where} ${key} out of order`);
                assert.ok(Number.isFinite(s.to) && s.duration >= 0, `${where} ${key} not finite`);
                cursor = s.at + s.duration;
                if (cursor > last) last = cursor;
              }
            });
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
              assert.equal(end.scale, 0, `${where} ghost scale ${id}`);
            } else {
              assert.ok(Math.abs(end.x - entry.x) < 1e-9, `${where} end x ${id}`);
              assert.ok(Math.abs(end.y - entry.y) < 1e-9, `${where} end y ${id}`);
              assert.equal(end.scale, 1, `${where} end scale ${id}`);
              assert.equal(end.opacity, 1, `${where} end opacity ${id}`);
            }
          }

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
