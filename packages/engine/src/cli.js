// Argument parsing for scripts/play.js, kept pure and browser-safe so it can be tested.

export const USAGE =
  'Usage: node packages/engine/scripts/play.js <level-or-fixture.json>' +
  ' [--seed S] [--moves N] [--delay ms] [--quiet] [--stitch] [-h|--help]';

/**
 * @typedef {Object} CliArgs
 * @property {string|null} file
 * @property {string|null} seed
 * @property {number|null} moves
 * @property {number} delay
 * @property {boolean} quiet
 * @property {boolean} stitch
 * @property {boolean} help
 */

/**
 * @param {string[]} argv  process.argv.slice(2)
 * @returns {{ error: string } | CliArgs}
 */
export const parseArgs = (argv) => {
  const out = {
    file: null,
    seed: null,
    moves: null,
    delay: 0,
    quiet: false,
    stitch: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      out.help = true;
    } else if (arg === '--quiet') {
      out.quiet = true;
    } else if (arg === '--stitch') {
      out.stitch = true;
    } else if (arg === '--seed' || arg === '--moves' || arg === '--delay') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) return { error: `${arg} needs a value` };
      i += 1;
      if (arg === '--seed') {
        out.seed = value;
      } else {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) return { error: `${arg} needs a non-negative integer` };
        out[arg.slice(2)] = n;
      }
    } else if (arg.startsWith('-')) {
      return { error: `unknown option ${arg}` };
    } else if (out.file !== null) {
      return { error: `unexpected argument ${arg}` };
    } else {
      out.file = arg;
    }
  }
  if (!out.help && out.file === null) return { error: 'a level or fixture JSON path is required' };
  return out;
};
