#!/usr/bin/env node
// Plays a level with random moves and prints the board as text (DESIGN.md §11, phase 1).
//
//   node packages/engine/scripts/play.js <level-or-fixture.json>
//        [--seed S] [--moves N] [--delay ms] [--quiet] [--stitch]
//
// Exit codes: 0 normal end, 1 runtime error (file, level or engine), 2 usage.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import {
  COLORS,
  TEXT_LEGEND,
  USAGE,
  parseArgs,
  createGame,
  createRng,
  createRandomBot,
  renderBoard,
  renderStitch,
  describeSteps,
  renderState,
} from '../src/index.js';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const L = TEXT_LEGEND;
const legendLines = () => {
  const colors = COLORS.map((c) => `${L.color[c]}${L.none} ${c}`).join('  ');
  const specials = Object.entries(L.special)
    .map(([special, ch]) => `${ch} ${special}`)
    .join('  ');
  const pieces = [
    `${L.frog}${L.none} frog`,
    `${L.bead}${L.none} bead`,
    `${L.tangle}n tangle (n layers)`,
    `${L.buried}n buried tangle`,
    `${L.moth}${L.none} moth`,
    `${L.hole}${L.none} hole`,
    `${L.empty}${L.empty} empty`,
  ].join('  ');
  return [
    `legend: ${colors}`,
    `        second char: ${specials}  ${L.knotted} knot`,
    `        ${pieces}`,
  ];
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.error !== undefined) {
    process.stderr.write(`${args.error}\n${USAGE}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const seed = args.seed === null ? String(Date.now()) : args.seed;
  let level;
  try {
    level = JSON.parse(readFileSync(resolve(process.cwd(), args.file), 'utf8'));
  } catch (err) {
    process.stderr.write(`cannot read level ${args.file}: ${err.message}\n`);
    return 1;
  }
  try {
    const game = createGame(level, seed);
    const bot = createRandomBot(createRng(`${seed}/bot`), { specials: true });
    const out = (line) => process.stdout.write(`${line}\n`);
    const first = game.state();
    const size = `${first.board.width}x${first.board.height}`;
    out(`${first.level.name}  level ${first.level.id}  ${size}  seed ${seed}`);
    out(`colors: ${level.colors.join(', ')}`);
    for (const line of legendLines()) out(line);
    if (!args.quiet) {
      out(renderBoard(first.board, { axes: true }));
      if (args.stitch) out(`stitch:\n${renderStitch(first.board, { axes: true })}`);
    }
    const maxMoves = args.moves === null ? Infinity : args.moves;
    let played = 0;
    let shuffles = 0;
    const tally = { blocker: 0, beadExit: 0, mothSpread: 0 };
    let lastScore = 0;
    let reason = 'moves exhausted';
    while (game.state().status === 'playing') {
      if (played >= maxMoves) {
        reason = `--moves limit (${maxMoves}) reached`;
        break;
      }
      const move = bot(game);
      if (move === null) {
        reason = 'no valid move';
        break;
      }
      const [a, b] = move;
      const { steps } = game.swap(a, b);
      played += 1;
      shuffles += steps.filter((s) => s.type === 'shuffle').length;
      for (const key of Object.keys(tally))
        tally[key] += steps.filter((s) => s.type === key).length;
      const state = game.state();
      if (!args.quiet) {
        out(`\nmove ${played}/${level.moves}`);
        for (const line of describeSteps(steps)) out(`  ${line}`);
        out(`  score ${state.score} (+${state.score - lastScore})`);
        out(renderBoard(state.board, { axes: true }));
        if (args.stitch) out(`stitch:\n${renderStitch(state.board, { axes: true })}`);
      }
      lastScore = state.score;
      if (args.delay > 0 && !args.quiet) await sleep(args.delay);
    }
    const finished = game.state();
    if (finished.status === 'won') reason = 'fastened off';
    else if (finished.status === 'lost') reason = 'ran out of yarn';
    const counts = `shuffles ${shuffles} · blockers ${tally.blocker} · beads out ${tally.beadExit} · moths ${tally.mothSpread}`;
    out(`\ndone: ${reason} after ${played} moves · ${renderState(finished)} · ${counts}`);
    return 0;
  } catch (err) {
    const label = /^level /.test(err.message) ? 'level error' : 'engine error';
    process.stderr.write(`${label}: ${err.message}\n`);
    if (label === 'engine error' && err.stack) process.stderr.write(`${err.stack}\n`);
    return 1;
  }
};

process.exitCode = await main();
