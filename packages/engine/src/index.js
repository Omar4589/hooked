// @hooked/engine — public surface. Nothing in this package may import react, react-native or
// expo, or any Node-only API (see test/browser-safe.test.js).

export {
  ENGINE_VERSION,
  COLORS,
  SPECIALS,
  PIECE_KINDS,
  BLOCKERS,
  GOALS,
  MAX_BOARD_SIZE,
  BLAST_RADII,
  COMBO_BOARD_RADIUS,
  HOOK_ORIENTATIONS,
  METER_CHARGE,
  METER_MULTI_BONUS,
  MAX_BLAST_WAVES,
  SCORE,
  MAX_CASCADE_MULTIPLIER,
  MAX_CASCADES,
  METER_FULL,
  METERS,
  HARD_LABELS,
  MATCH_SPECIALS,
  PRESET_PIECES,
  STEP_TYPES,
  CELL_LEGEND,
  STITCH_LEGEND,
  TEXT_LEGEND,
} from './constants.js';
export { createRng } from './rng.js';
export { columnRuns } from './board.js';
export { blastArea, ripArea } from './blast.js';
export { mostCommonColors } from './match.js';
export { normalizeLevel } from './level.js';
export { createGame } from './game.js';
export { applySteps } from './replay.js';
export {
  renderBoard,
  renderStitch,
  parseBoard,
  describeStep,
  describeSteps,
  renderState,
  formatPos,
} from './text.js';
export { parseArgs, USAGE } from './cli.js';
export { createRandomBot, playGame } from './bots.js';
