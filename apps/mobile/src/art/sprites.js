// ---------------------------------------------------------------------------
// Yarn Over — the parsed half of the art layer, phase 5
//
// ./pieces.js draws SVG strings and ./compose.js glues them into the images the board actually
// shows; this file turns each distinct string into a react-native-svg AST exactly once and hands
// the same AST to everyone who draws that picture. That sharing is safe because a parsed AST is
// an immutable descriptor: SvgAst only reads it, spreading `ast.props` onto one <Svg> and
// rendering `ast.children`, which are ordinary React elements. Nothing mounts state into the
// tree and nothing writes back to it, so thirty cells can render one AST at the same time.
// <SvgXml> re-parses its string inside every mounted instance instead — thirty parses of ~4KB on
// the JS thread, for one picture, every time a board mounts — which is the cost this file exists
// to remove.
//
// Drawing one, in a component:
//   import { SvgAst } from 'react-native-svg';
//   const art =
//     piece.kind === 'frog' ? frogFor(pose) : piece.kind === 'bead' ? BEAD : spriteFor(piece);
//   <View style={{ position: 'absolute', left, top }}>
//     <SvgAst ast={art} override={{ width: size, height: size }} />
//   </View>
// Dispatch on `kind` first: spriteFor draws YARN, and a frog or a bead handed to it has no colour
// of its own, so it would come back a cocoa ball rather than an error.
// The size goes through `override`, which is what lands width/height on the <Svg>. POSITION never
// does: the svg is placed by the View around it. Every board image is on a 100x100 viewBox and
// every goal icon on 24x24, and the AST carries its own viewBox, so a caller gives a size and
// nothing else. A null ast draws nothing at all, which is how an empty meter is drawn.
//
// What is here:
//   board pieces   spriteFor()  FROG  frogFor()  BEAD
//   the cells      tileSheetFor()  TANGLE  tangleFor()  STITCH  stitchFor()  MOTH  BUTTON
//   the dial       RING  arcFor()  DIAL_FROG  DIAL_HOOK
//   goals panel    GOAL_ICON()
//   win screen     COIN
//
// There is no node test for this file and there cannot be one: react-native-svg ships TypeScript
// source and dies the moment plain node loads it. Every rule worth testing was deliberately left
// in ./pieces.js and ./compose.js, which are node-tested; what is left here is parse-and-remember.
// ---------------------------------------------------------------------------

import { parse } from 'react-native-svg';
import { arcXml, spriteXml, tileSheetXml } from './compose.js';
import {
  bead,
  button,
  coin,
  frog,
  hook,
  iconBeads,
  iconBuried,
  iconCollect,
  iconGear,
  iconKnot,
  iconMoth,
  iconStitch,
  iconTangle,
  meterRing,
  moth,
  stitchTile,
  tangle,
} from './pieces.js';
import { COLOR_KEYS } from './palette.js';
import { POSE } from '../game/timings.js';

/* ------------------------------------------------------------- the cache -- */

/**
 * Look `key` up in `cache` and parse only on a miss. `has` decides rather than truthiness,
 * because a null AST is a real answer — an empty meter has no arc — and caching that null is the
 * point: without it, a dial at charge 0 asks compose.js for markup on every frame it is empty.
 */
const remember = (cache, key, draw) => {
  if (!cache.has(key)) cache.set(key, draw());
  return cache.get(key);
};

/**
 * What a piece with no colour of its own is drawn in — the fallback Piece.jsx already uses. It
 * doubles as the placeholder for a collect goal that names no colour.
 */
const FALLBACK_COLOR = 'cocoa';

/* ---------------------------------------------------------- board pieces -- */

const SPRITES = new Map();

/**
 * One yarn ball wearing its special and its knot: 6 colours x 6 specials x knotted or not, 72
 * appearances in all, each parsed the first time the board asks for it and kept for good.
 * Yarn only — the frog is FROG and a bead is BEAD, because neither of those has a colour.
 * @param {{ color?: string, special?: string|null, knotted?: boolean }} piece
 * @returns {object} a react-native-svg AST
 */
export const spriteFor = ({ color, special = null, knotted = false }) => {
  const key = COLOR_KEYS.includes(color) ? color : FALLBACK_COLOR;
  return remember(SPRITES, `${key}/${special ?? ''}${knotted ? '/knot' : ''}`, () =>
    parse(spriteXml({ color: key, special, knotted })),
  );
};

/**
 * The frog's three board pictures, keyed by the POSE integers a Track carries, so a component
 * indexes this with the number sampleTrack hands it and nothing in between has to translate.
 * He flicks his tongue at a rip and hops off the dial; everything else he does is his resting
 * picture moved around.
 */
export const FROG = Object.freeze({
  [POSE.rest]: parse(frog('piece')),
  [POSE.hop]: parse(frog('hop')),
  [POSE.tongue]: parse(frog('piece', { tongue: true })),
});

/** FROG with a floor under it: a pose sampled off a track is a number and may be any number. */
export const frogFor = (pose) => FROG[pose] ?? FROG[POSE.rest];

/** A bead: it falls, it never matches, it carries nothing. */
export const BEAD = parse(bead());

/* ------------------------------------------------------------- the cells -- */

const SHEETS = new WeakMap();

/**
 * The board's whole floor as one image — one translated tile per open cell, 100 units per cell —
 * so the caller scales a single svg instead of mounting one per cell. Memoised on the identity of
 * the `open` grid, because the floor changes only when a board is built; a WeakMap lets the old
 * board's sheet go when the level does.
 * @param {boolean[][]} open  indexed [y][x], like every engine grid
 * @returns {object|null} null before there is a board to draw
 */
export const tileSheetFor = (open) =>
  Array.isArray(open) ? remember(SHEETS, open, () => parse(tileSheetXml(open))) : null;

/** The three tangle densities, by the layers still on the cell (DESIGN.md §5). */
export const TANGLE = Object.freeze({
  1: parse(tangle(1)),
  2: parse(tangle(2)),
  3: parse(tangle(3)),
});

/**
 * TANGLE for a layer count that came off a CellTrack. `layers` is tweened over BLOCKER_MS rather
 * than set, so a sampled value is fractional and has to land on one of the three pictures; under
 * half a layer there is nothing left to draw and this returns null. A caller that crossfades two
 * densities against each other should index TANGLE itself instead of coming through here.
 * @returns {object|null}
 */
export const tangleFor = (layers) => TANGLE[Math.min(Math.round(layers), 3)] ?? null;

/**
 * The stitch square under the pieces, by how many layers are left to stitch. A cell outside the
 * level's pattern shows no square at all; these are for the cells inside it.
 */
export const STITCH = Object.freeze({
  un2: parse(stitchTile('unstitched2')),
  un1: parse(stitchTile('unstitched1')),
  done: parse(stitchTile('stitched')),
});

/** STITCH for a layer count off a CellTrack — the same tween, and the same rounding, as above. */
export const stitchFor = (unstitched) => {
  const left = Math.round(unstitched);
  if (left >= 2) return STITCH.un2;
  return left === 1 ? STITCH.un1 : STITCH.done;
};

/** A moth on its cell, and the button buried under a tangle. Both fill the cell. */
export const MOTH = parse(moth());
export const BUTTON = parse(button());

/* -------------------------------------------------------------- the dial -- */

/** The dial's rim. It never changes, and the fill arc is drawn over it, never instead of it. */
export const RING = parse(meterRing());

const ARCS = new Map();

/**
 * The meter's fill arc at a charge, or null when the meter is empty. compose.js refuses to draw
 * charge 0 — a round cap on a zero-length dash is a dot at twelve o'clock, not nothing — and that
 * null is passed straight through here: SvgAst renders a null ast as nothing, so a caller can
 * hand it on as it is. Draw it over RING.
 *
 * The charge is snapped to a whole notch before it is drawn. The readout tweens from one notch to
 * the next over METER_MS, and a dial that parsed a new arc on every frame of that tween is the
 * exact cost this file exists to avoid; eleven images cover a full meter forever. The notch is
 * clamped as well as rounded, because the engine never caps the charge — a full=10 meter really
 * does report 11 on the move that fills it — so the cache cannot grow past full either.
 * @param {number} charge  0..full, possibly part way between two notches
 * @param {number} full    METER_FULL today; a meterFrames frame carries it
 * @returns {object|null}
 */
export const arcFor = (charge, full) => {
  const notch = Math.min(Math.max(Math.round(charge), 0), full);
  return remember(ARCS, `${notch}/${full}`, () => {
    const xml = arcXml(notch, full);
    return xml === null ? null : parse(xml);
  });
};

/**
 * The frog sitting on the dial, waiting: two pictures, swapped BLINK_MS at a time every
 * BLINK_GAP_MS. The wiggle at a full readout is a rotation of whichever one is showing, not a
 * third drawing.
 */
export const DIAL_FROG = Object.freeze({
  idle: parse(frog('dial')),
  blink: parse(frog('dial', { blink: true })),
});

/** What the dial holds on a hook level instead of the frog. */
export const DIAL_HOOK = parse(hook());

/* ------------------------------------------------------- the goals panel -- */
// 24x24 icons rather than 100x100 — a different viewBox from everything above, which the AST
// carries, so the panel still gives a size and nothing else.

/**
 * Null-prototyped, the way compose.js's overlay table is: every one of these is indexed by a
 * string out of a level file, and on a plain object `type: 'constructor'` would find an inherited
 * function and be handed back as if it were art.
 */
const COLLECT_ICONS = Object.freeze({
  __proto__: null,
  ...Object.fromEntries(COLOR_KEYS.map((key) => [key, parse(iconCollect(key))])),
});

const CLEAR_ICONS = Object.freeze({
  __proto__: null,
  tangle: parse(iconTangle()),
  knot: parse(iconKnot()),
  moth: parse(iconMoth()),
});

const STITCH_ICON = parse(iconStitch());
const BEADS_ICON = parse(iconBeads());
const BURIED_ICON = parse(iconBuried());

/** The last resort: a visible placeholder, where an undefined AST would be an iconless row. */
const UNKNOWN_ICON = parse(iconGear());

const BY_TYPE = Object.freeze({
  __proto__: null,
  stitch: () => STITCH_ICON,
  beads: () => BEADS_ICON,
  buried: () => BURIED_ICON,
  collect: (goal) => COLLECT_ICONS[goal.color] ?? COLLECT_ICONS[FALLBACK_COLOR],
  clear: (goal) => CLEAR_ICONS[goal.blocker] ?? CLEAR_ICONS.tangle,
});

/**
 * The icon for one goal row, by goal type and then by what that goal is about. Every branch ends
 * in a picture on purpose. validateLevel does reject a collect goal with no colour and a clear
 * goal with no blocker (packages/levels/src/schema.js), but GoalState marks both fields optional
 * and a dev board, an engine fixture or a half-loaded HUD reaches the panel without passing
 * through the schema — and an undefined AST renders as nothing, which leaves a goal row showing a
 * count with no icon beside it. That is worse than a stand-in.
 *
 * A level may also carry `goal.sprite`, a name with no art behind it yet; this ignores it.
 * @param {{ type?: string, color?: string, blocker?: string }} goal
 * @returns {object} always an AST, never undefined
 */
export const GOAL_ICON = (goal) => BY_TYPE[goal?.type]?.(goal) ?? UNKNOWN_ICON;

/* -------------------------------------------------------- the win screen -- */

/**
 * The coin that sits beside the coins figure on the win screen: the one drawing in this file that
 * is neither on the board nor in the HUD. `coin()` came with the phase 5 delivery and had nothing
 * to spend it on until the result screen said what a level paid (DESIGN.md §11, art convention 14,
 * which listed it as drawn-but-unspent until slice 1). This is the static coin; the coin burst
 * and the confetti are commissioned after level 1's static art is in (QUESTIONS item 37), and when
 * they land they are motion over this picture rather than a second drawing of it.
 */
export const COIN = parse(coin());
