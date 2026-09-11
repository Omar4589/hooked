// Bots drive a game without a screen: play.js in phase 1, the difficulty sims in phase 6.

/** @typedef {import('./game.js').Game} Game */
/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./constants.js').Pos} Pos */

/**
 * Picks a uniformly random match-making move, or null when there is none.
 * @param {Rng} rng
 * @returns {(game: Game) => [Pos, Pos] | null}
 */
export const createRandomBot = (rng) => (game) => {
  const moves = game.validMoves();
  return moves.length === 0 ? null : rng.pick(moves);
};

/**
 * @typedef {Object} PlayOptions
 * @property {(game: Game) => [Pos, Pos] | null} pickMove
 * @property {number} [maxMoves]
 * @property {(info: object) => void} [onMove]
 *   called after each swap with { index, a, b, steps, state }
 */

/**
 * @typedef {Object} PlayResult
 * @property {number} moves    remaining
 * @property {number} score
 * @property {string} status
 * @property {'ended'|'no-move'|'limit'} reason
 * @property {number} played   swaps made
 */

/**
 * Plays until the game ends, the bot has no move, or `maxMoves` swaps were made. Synchronous:
 * a CLI that wants a delay between moves runs its own loop.
 * @param {Game} game
 * @param {PlayOptions} options
 * @returns {PlayResult}
 */
export const playGame = (game, { pickMove, maxMoves = Infinity, onMove }) => {
  let played = 0;
  let reason = 'ended';
  while (game.state().status === 'playing') {
    if (played >= maxMoves) {
      reason = 'limit';
      break;
    }
    const move = pickMove(game);
    if (move === null) {
      reason = 'no-move';
      break;
    }
    const [a, b] = move;
    const { steps } = game.swap(a, b);
    played += 1;
    if (onMove !== undefined) onMove({ index: played, a, b, steps, state: game.state() });
  }
  const { moves, score, status } = game.state();
  return { moves, score, status, reason, played };
};
