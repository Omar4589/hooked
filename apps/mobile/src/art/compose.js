// The pure-string half of the art layer: it glues the factory svgs from ./pieces.js into the
// handful of composed images the board actually draws — a piece wearing its special and its knot,
// a sheet of empty cells, the meter's fill arc.
//
// It is deliberately a different file from ./sprites.js. sprites.js imports react-native-svg,
// which plain node cannot load at all: importing it reaches `react-native` itself, whose
// Flow-typed source node will not parse, so both `require` and `import` throw
// `SyntaxError: Unexpected token 'typeof'`. So nothing that touches
// it can be covered by `node --test`. Keeping the string surgery here is what lets the rules that
// actually matter — what overlays what, in what order, on which viewBox — be tested against the
// markup itself in ./compose.test.js, and leaves sprites.js with nothing but parse-and-memoise.
// Merging the two back together would be tidy and would silently delete that test file's reach.
//
// One mechanism does all the work: strip each input's outer <svg> wrapper, concatenate what was
// inside, re-wrap once. It is safe only because every factory in pieces.js uses ids distinct from
// every other's (yb_<key>_b/_s/_c, pf, bb, pc1..3, ybm, fr_*; knot and cellTile declare none), a
// property pieces.test.js guards across all 50 documents.

import {
  bobble,
  cellTile,
  hook,
  knot,
  meterFill,
  popcorn,
  puff,
  yarnBall,
  yarnBomb,
} from './pieces.js';

/** Every factory draws on a 100x100 box, so that is also one cell's side in a tile sheet. */
const CELL = 100;

const BOARD_VIEW_BOX = `0 0 ${CELL} ${CELL}`;

/** The markup between an svg's tags, with the wrapper and its surrounding whitespace gone. */
const contentOf = (xml) =>
  xml
    .replace(/^\s*<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

const wrap = (content, viewBox = BOARD_VIEW_BOX) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${content}</svg>`;

/**
 * Many svgs under one root on the board's viewBox, painted in the order given: later arguments
 * draw over earlier ones. Composing a single svg leaves its markup alone, and so does composing a
 * composition, so callers can nest freely.
 * @param {...string} parts
 * @returns {string}
 */
export const composeSvg = (...parts) => wrap(parts.map(contentOf).filter(Boolean).join('\n'));

/**
 * The four specials that ride ON a ball, and the factory that draws each. The bomb is absent on
 * purpose: it replaces the ball instead of sitting on it (an owner decision, not an oversight).
 * Null-prototyped so an unrecognised name misses cleanly and leaves a bare ball: on a plain object
 * `special: 'constructor'` would find an inherited function and paint garbage, or throw.
 */
const OVERLAYS = { __proto__: null, puff, bobble, popcorn, hook };

/**
 * One piece's entire appearance. The ball goes down first, the special over its centre, the knot
 * over everything — the knot is drawn low on the ball precisely so the two overlays coexist.
 * @param {{ color: string, special?: string|null, knotted?: boolean }} spec
 * @returns {string}
 */
export const spriteXml = ({ color, special = null, knotted = false }) => {
  const overlay = OVERLAYS[special];
  return composeSvg(
    special === 'yarnbomb' ? yarnBomb() : yarnBall(color),
    ...(overlay ? [overlay()] : []),
    ...(knotted ? [knot()] : []),
  );
};

/**
 * The board's whole floor as one svg: a translated tile per open cell, nothing where the board
 * has a hole. `open` is indexed [y][x], the same way the engine's grids are, and the sheet's
 * viewBox grows with it so the caller scales one image instead of mounting one svg per cell.
 * @param {boolean[][]} open
 * @returns {string}
 */
export const tileSheetXml = (open) => {
  const tile = contentOf(cellTile());
  const rows = open.length;
  const columns = rows ? open[0].length : 0;
  const tiles = open.flatMap((row, y) =>
    row.flatMap((isOpen, x) =>
      isOpen ? [`<g transform="translate(${x * CELL},${y * CELL})">${tile}</g>`] : [],
    ),
  );
  return wrap(tiles.join('\n'), `0 0 ${columns * CELL} ${rows * CELL}`);
};

/**
 * The meter's fill arc at a given charge, or null when there is nothing to draw. The zero case is
 * not an optimisation: meterFill sweeps with a round-capped dash, and a round cap on a
 * zero-length dash still paints, so charge 0 is a dot at twelve o'clock rather than an empty
 * ring. The charge is clamped because the engine never caps it — a full=10 meter really does
 * report 11 on the move that fills it, in the same call that resets it to 0.
 * @param {number} charge
 * @param {number} full
 * @returns {string|null}
 */
export const arcXml = (charge, full) => {
  if (!(charge > 0) || !(full > 0)) return null;
  return composeSvg(meterFill(Math.min(charge, full) / full));
};
