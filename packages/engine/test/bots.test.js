import { createRandomBot, playGame } from '../src/bots.js';
import { createGame } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { loadFixture } from './helpers/fixtures.js';

test('the random bot plays the coaster to the end: lost with zero moves', () => {
  const game = createGame(loadFixture('coaster-5x5'), 1);
  const seen = [];
  const result = playGame(game, {
    pickMove: createRandomBot(createRng('bot')),
    onMove: (info) => seen.push(info),
  });
  expect(result.status).toBe('lost');
  expect(result.moves).toBe(0);
  expect(result.reason).toBe('ended');
  expect(result.played).toBe(20);
  expect(seen).toHaveLength(20);
  expect(seen[0].index).toBe(1);
  expect(seen[0].steps[0].type).toBe('swap');
  expect(seen[19].state.status).toBe('lost');
  expect(result.score).toBeGreaterThan(0);
});

test('maxMoves stops early with reason limit', () => {
  const game = createGame(loadFixture('square-6x6'), 2);
  const result = playGame(game, { pickMove: createRandomBot(createRng('bot')), maxMoves: 3 });
  expect(result).toMatchObject({ reason: 'limit', played: 3, status: 'playing', moves: 17 });
});

test('a bot with no move ends the game with reason no-move', () => {
  const game = createGame(loadFixture('square-6x6'), 2);
  const result = playGame(game, { pickMove: () => null });
  expect(result).toMatchObject({ reason: 'no-move', played: 0, moves: 20 });
});

test('the random bot returns null on a dead board', () => {
  const bot = createRandomBot(createRng('x'));
  expect(bot({ validMoves: () => [] })).toBeNull();
});

test('the same seeds give the same final score', () => {
  const run = () =>
    playGame(createGame(loadFixture('scarf-5x9'), 'a'), {
      pickMove: createRandomBot(createRng('b')),
    });
  expect(run()).toEqual(run());
});
