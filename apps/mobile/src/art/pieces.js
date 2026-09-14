// ---------------------------------------------------------------------------
// Yarn Over — board pieces, phase 5
//
// Single source of truth for every board SVG. Each board factory returns an
// SVG string on a 100x100 viewBox with the piece at ~84% fill and its margin
// already inside, per the art brief. The goal icons are the exception: they
// are drawn on a 24x24 box, flat, for the goals panel.
//
// Nothing imports these strings and draws them directly. ./compose.js glues
// them into the images the board actually shows, and ./sprites.js parses each
// composed string ONCE — at module load, or the first time the board asks for
// it — then hands the same AST to every cell drawing that picture. Go in
// through sprites.js:
//
//     import { SvgAst } from 'react-native-svg';
//     import { spriteFor } from './sprites.js';
//     <SvgAst ast={spriteFor({ color, special, knotted })}
//             override={{ width: cell, height: cell }} />
//
// Not SvgXml: it re-parses its string inside every mounted instance, so a board
// of identical balls pays for the same parse once per cell, on the JS thread,
// every time it mounts. Removing that cost is the whole reason sprites.js
// exists; its header has the full list and the dispatch rules.
//
// There is no preview or export tooling in this repo: no tools/ directory, and
// nothing writes these svgs out to files. The app is the only renderer.
//
// Lighting is fixed: warm side light from the upper left, shaded underside,
// soft contact shadow. Matte throughout — highlights are the colour lightened,
// never white, because a white specular reads as plastic. The bead is the one
// piece that breaks that rule, and its highlight is the only white in the
// file: a hard shine is what stops a bead reading as yarn.
// ---------------------------------------------------------------------------

import { PALETTE, OAT } from './palette.js';

/* ---------------------------------------------------------------- colour -- */

const hex2rgb = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const rgb2hex = (r) =>
  '#' +
  r
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export const lighten = (hex, t) => rgb2hex(mix(hex2rgb(hex), [255, 255, 255], t));
export const darken = (hex, t) => rgb2hex(mix(hex2rgb(hex), [0, 0, 0], t));
const isDark = (hex) => hex2rgb(hex).reduce((a, b) => a + b, 0) < 300;

/* --------------------------------------------------------------- geometry -- */

// Subtly irregular circle. The wobble is what stops a yarn ball reading as a
// rubber ball; it is cheap because it is one path, not a field of hairs.
const BALL =
  'M90.49,48.00C90.58,53.08 89.11,58.65 87.07,63.35C85.02,68.06 81.88,72.66 78.25,76.25C74.62,79.84 69.99,83.03 65.28,84.90C60.58,86.77 55.13,87.38 50.00,87.48C44.87,87.57 39.18,87.34 34.49,85.45C29.79,83.57 25.48,79.83 21.83,76.17C18.18,72.51 14.49,68.19 12.60,63.49C10.71,58.80 10.40,53.13 10.49,48.00C10.58,42.87 11.29,37.46 13.15,32.74C15.02,28.02 18.09,23.30 21.68,19.68C25.26,16.05 29.95,13.02 34.67,10.99C39.39,8.95 44.93,7.38 50.00,7.48C55.07,7.57 60.37,9.52 65.10,11.54C69.83,13.57 74.83,16.05 78.40,19.60C81.96,23.16 84.49,28.14 86.51,32.88C88.52,37.61 90.40,42.92 90.49,48.00Z';

// One strand layout per colour. These carry the piece's identity: the six must
// stay distinguishable in greyscale, because three of the hues nearly merge.
const STRANDS = {
  olive: ['M14,44 C30,18 70,22 86,50', 'M13,58 C33,82 69,80 87,55', 'M31,11 C21,38 35,62 47,86'],
  mustard: ['M10,58 C26,44 44,26 58,8', 'M17,79 C35,62 55,42 74,21', 'M34,89 C52,72 70,54 88,36'],
  blush: [
    'M50,26 C64,26 72,36 72,48 C72,60 62,70 50,70 C38,70 28,60 28,48 C28,36 38,26 50,26',
    'M50,12 C76,12 88,30 88,48 C88,70 72,84 50,84',
  ],
  rust: [
    'M20,22 C38,40 58,58 78,74',
    'M78,22 C60,40 40,58 22,74',
    'M13,50 C30,62 52,68 70,80',
    'M30,12 C48,28 66,40 86,50',
  ],
  lavender: ['M37,10 C25,28 25,66 37,86', 'M63,10 C75,28 75,66 63,86', 'M11,46 C30,40 70,40 89,46'],
  cocoa: ['M28,22 C62,30 34,62 68,72', 'M22,52 C50,44 50,58 78,48', 'M40,12 C34,40 58,54 52,84'],
};

const svg = (inner, vb = '0 0 100 100') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;

const shadow = (cy = 92, rx = 28, ry = 4.5, op = 0.17) =>
  `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="#5A4636" opacity="${op}"/>`;

/* ------------------------------------------------------------- yarn balls -- */

export function yarnBall(key) {
  const base = PALETTE[key];
  const hi = lighten(base, 0.26);
  const lo = darken(base, 0.3);
  const cordShadow = darken(base, 0.42);
  const cordBody = lighten(base, 0.05);
  // dark colours need a stronger highlight or the pattern disappears at 34pt
  const cordHi = lighten(base, isDark(base) ? 0.58 : 0.38);
  const id = `yb_${key}`;
  const paths = STRANDS[key];

  const cords = (dx, dy, w, stroke, op) =>
    `<g transform="translate(${dx},${dy})" fill="none" stroke="${stroke}" stroke-width="${w}"` +
    ` stroke-linecap="round" stroke-opacity="${op}">` +
    paths.map((d) => `<path d="${d}"/>`).join('') +
    `</g>`;

  return svg(`
<defs>
  <radialGradient id="${id}_b" cx="38%" cy="34%" r="74%">
    <stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>
  </radialGradient>
  <radialGradient id="${id}_s" cx="64%" cy="70%" r="64%">
    <stop offset="0.5" stop-color="${lo}" stop-opacity="0"/>
    <stop offset="1" stop-color="${lo}" stop-opacity="0.55"/>
  </radialGradient>
  <clipPath id="${id}_c"><path d="${BALL}"/></clipPath>
</defs>
${shadow()}
<path d="${BALL}" fill="url(#${id}_b)"/>
<g clip-path="url(#${id}_c)">
  ${cords(1.3, 1.7, 5.6, cordShadow, 0.5)}
  ${cords(0, 0, 5.0, cordBody, 1)}
  ${cords(-0.9, -1.5, 2.2, cordHi, 0.72)}
  <path d="${BALL}" fill="url(#${id}_s)"/>
</g>`);
}

/* --------------------------------------------------- the four specials ---- */
// Puff, bobble and popcorn sit ON a ball of any of the six colours, so they are
// cream-toned with their own internal shading — that is what lets them read
// against all six. The bomb is the exception: it REPLACES the ball rather than
// riding on one (owner, 2026-09-12), so the yarn colour under it is not
// readable in play. All four must sort by size at a glance:
// puff < bobble < popcorn < bomb.

const CREAM = '#FCF6EA';
const CREAM_MID = '#EADDC6';
const CREAM_LO = '#CBB89A';

function lobeBlob(cx, cy, r, lobes, seed = 0) {
  // a soft cloud-ish blob: what a puff stitch looks like from the front
  const pts = [];
  for (let i = 0; i < lobes; i++) {
    const a = (2 * Math.PI * i) / lobes + seed;
    const rr = r * (1 + 0.1 * Math.sin(3 * a + seed));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < lobes; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % lobes];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const bulge = 1.34;
    d += `Q${(mx + (mx - cx) * (bulge - 1)).toFixed(2)},${(my + (my - cy) * (bulge - 1)).toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
}

function puffBody(cx, cy, r, lobes, id) {
  return `
  <defs>
    <radialGradient id="${id}" cx="36%" cy="32%" r="76%">
      <stop offset="0" stop-color="${CREAM}"/>
      <stop offset="0.62" stop-color="${CREAM_MID}"/>
      <stop offset="1" stop-color="${CREAM_LO}"/>
    </radialGradient>
  </defs>
  <path d="${lobeBlob(cx, cy + 1.4, r, lobes, 0.4)}" fill="#6B5745" opacity="0.22"/>
  <path d="${lobeBlob(cx, cy, r, lobes, 0.4)}" fill="url(#${id})"/>`;
}

export const puff = () => svg(puffBody(50, 48, 15, 7, 'pf'));

export const bobble = () =>
  svg(
    puffBody(50, 48, 21, 8, 'bb') +
      `<path d="M42,42 Q50,38 58,42" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`,
  );

export const popcorn = () =>
  svg(
    puffBody(38, 56, 14, 7, 'pc1') +
      puffBody(62, 55, 14, 7, 'pc2') +
      puffBody(50, 38, 16, 8, 'pc3'),
  );

export function yarnBomb() {
  // a ball wrapped in wild strands with a yarn fuse — the biggest, loudest one
  const wraps = [
    ['M10,46 C30,26 70,26 90,46', '#AE5338'],
    ['M10,54 C32,74 68,74 90,54', '#78824F'],
    ['M30,10 C18,34 20,62 34,86', '#9791C7'],
    ['M70,10 C82,34 80,62 66,86', '#D8AE4B'],
    ['M12,34 C38,46 62,46 88,34', '#E9C2BE'],
  ];
  return svg(`
<defs>
  <radialGradient id="ybm" cx="38%" cy="34%" r="74%">
    <stop offset="0" stop-color="#6E5344"/><stop offset="1" stop-color="#3A2A22"/>
  </radialGradient>
  <clipPath id="ybm_c"><path d="${BALL}"/></clipPath>
</defs>
${shadow()}
<path d="${BALL}" fill="url(#ybm)"/>
<g clip-path="url(#ybm_c)" fill="none" stroke-width="5.4" stroke-linecap="round">
  ${wraps.map(([d, c]) => `<path d="${d}" stroke="${c}"/>`).join('')}
  ${wraps.map(([d, c]) => `<path d="${d}" stroke="${lighten(c, 0.34)}" stroke-width="2" transform="translate(-0.8,-1.4)" stroke-opacity="0.7"/>`).join('')}
</g>
<path d="M56,12 C62,2 72,2 74,8" fill="none" stroke="#C2643A" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="75" cy="7" r="3.4" fill="#F2C14B"/>
<circle cx="75" cy="7" r="1.6" fill="#FDF0C4"/>`);
}

/* ------------------------------------------------------- bead and button --- */
// Both fall to the bottom of the board and must never be mistaken for a ball,
// so they get a different silhouette, not just a different colour.

export const bead = () =>
  svg(`
<defs>
  <radialGradient id="bd" cx="34%" cy="30%" r="72%">
    <stop offset="0" stop-color="#EAF2F6"/><stop offset="0.55" stop-color="#A9C2D2"/>
    <stop offset="1" stop-color="#5F7E92"/>
  </radialGradient>
</defs>
${shadow(88, 18, 3.4, 0.2)}
<ellipse cx="50" cy="50" rx="26" ry="24" fill="url(#bd)"/>
<ellipse cx="50" cy="50" rx="6.5" ry="5" fill="#3E5666" opacity="0.75"/>
<ellipse cx="40" cy="40" rx="7" ry="5" fill="#FFFFFF" opacity="0.5" transform="rotate(-28 40 40)"/>`);

export const button = () =>
  svg(`
<defs>
  <radialGradient id="bt" cx="36%" cy="32%" r="74%">
    <stop offset="0" stop-color="#FBF4E4"/><stop offset="1" stop-color="#C9B08A"/>
  </radialGradient>
</defs>
${shadow(89, 20, 3.6, 0.2)}
<circle cx="50" cy="49" r="27" fill="url(#bt)"/>
<circle cx="50" cy="49" r="21" fill="none" stroke="#A88F6B" stroke-opacity="0.35" stroke-width="1.6"/>
${[
  [42, 41],
  [58, 41],
  [42, 57],
  [58, 57],
]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#8E7551" opacity="0.8"/>`)
  .join('')}`);

/* --------------------------------------------------------- knot overlay ---- */
// Sits low on the ball so it can coexist with a special overlay in the centre.

export const knot = () =>
  svg(`
<g fill="none" stroke="#6E5744" stroke-linecap="round">
  <path d="M12,64 C30,72 70,72 88,64" stroke-width="7"/>
  <path d="M12,64 C30,72 70,72 88,64" stroke="#9B7F63" stroke-width="3.4" transform="translate(0,-1.6)"/>
</g>
<g transform="translate(50,66)">
  <circle r="9" fill="#7A6049"/>
  <circle r="9" fill="none" stroke="#A98A6B" stroke-width="2.6" stroke-dasharray="7 6" transform="rotate(20)"/>
  <path d="M-3,-11 L-8,-19 M3,-11 L9,-18" stroke="#7A6049" stroke-width="3.4" stroke-linecap="round" fill="none"/>
</g>`);

/* --------------------------------------------------------------- tangle ---- */
// Fills the whole cell. Layer count must be readable without printing a number,
// so density and value both climb.

export function tangle(layers = 1) {
  const conf = {
    1: { n: 5, op: 0.55, c: '#A89478', w: 4.2 },
    2: { n: 9, op: 0.8, c: '#8A7357', w: 4.6 },
    3: { n: 14, op: 1, c: '#6B563D', w: 5 },
  }[layers];
  const loops = [
    'M8,30 C34,14 66,46 92,26',
    'M8,52 C30,34 70,70 92,48',
    'M8,72 C32,56 68,90 92,68',
    'M22,8 C8,34 40,56 26,92',
    'M50,6 C34,32 66,54 50,94',
    'M76,8 C92,36 60,58 74,92',
    'M10,16 C40,40 62,20 90,44',
    'M12,84 C38,62 64,84 90,60',
    'M14,44 C44,66 58,34 88,56',
    'M20,20 C48,30 54,66 80,78',
    'M80,20 C54,32 46,64 20,78',
    'M10,62 C40,50 60,50 90,38',
    'M30,10 C46,42 58,50 70,90',
    'M70,10 C56,44 44,52 30,90',
  ].slice(0, conf.n);
  return svg(`
<rect x="4" y="4" width="92" height="92" rx="12" fill="#E6D8C0" opacity="${0.5 + layers * 0.13}"/>
<g fill="none" stroke="${conf.c}" stroke-width="${conf.w}" stroke-linecap="round" stroke-opacity="${conf.op}">
  ${loops.map((d) => `<path d="${d}"/>`).join('')}
</g>
<g fill="none" stroke="${lighten(conf.c, 0.3)}" stroke-width="1.8" stroke-linecap="round" stroke-opacity="${conf.op * 0.7}" transform="translate(-0.7,-1.2)">
  ${loops.map((d) => `<path d="${d}"/>`).join('')}
</g>`);
}

/* ---------------------------------------------------------- stitch tiles -- */
// These sit UNDER the balls, so they must read at low contrast and never
// compete with the piece standing on them.

export function stitchTile(state) {
  const frame = `<rect x="6" y="6" width="88" height="88" rx="10"`;
  if (state === 'stitched') {
    const vs = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        vs.push(
          `<path d="M${16 + c * 20},${20 + r * 20} l5,7 l5,-7" fill="none" stroke="#B9A88C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`,
        );
    return svg(`${frame} fill="#E4D7BE"/>${vs.join('')}`);
  }
  const two = state === 'unstitched2';
  return svg(`
${frame} fill="${two ? '#EFE6D4' : '#F2EBDC'}" stroke="#C9B89A" stroke-width="${two ? 3 : 2}" stroke-dasharray="${two ? '9 5' : '6 7'}" stroke-opacity="${two ? 0.85 : 0.6}"/>
${two ? '<path d="M22,22 L78,78 M78,22 L22,78" stroke="#C9B89A" stroke-width="2" stroke-opacity="0.45" fill="none"/>' : ''}`);
}

/* ---------------------------------------------------- frame and meter ring - */

export const cellTile = () =>
  svg(`<rect x="3" y="3" width="94" height="94" rx="13" fill="#F0E7D6"/>
<rect x="3" y="3" width="94" height="94" rx="13" fill="none" stroke="#E2D5BE" stroke-width="1.6"/>`);

export const meterRing = () =>
  svg(`
<circle cx="50" cy="50" r="44" fill="${OAT}" stroke="#B79A74" stroke-width="5"/>
<circle cx="50" cy="50" r="44" fill="none" stroke="#8B5E3C" stroke-width="2" opacity="0.5"/>
<circle cx="50" cy="50" r="36" fill="none" stroke="#D8C8AE" stroke-width="2"/>`);

// charge 0..1 — the dial fill. Stroke-dasharray drives the sweep.
export function meterFill(charge = 0) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return svg(`
<circle cx="50" cy="50" r="${r}" fill="none" stroke="#78824F" stroke-width="7"
  stroke-linecap="round" stroke-dasharray="${(c * charge).toFixed(1)} ${c.toFixed(1)}"
  transform="rotate(-90 50 50)" opacity="0.95"/>`);
}

/* ----------------------------------------------------------------- coin ---- */

export const coin = () =>
  svg(`
<defs>
  <radialGradient id="cn" cx="36%" cy="30%" r="76%">
    <stop offset="0" stop-color="#F7DC93"/><stop offset="0.6" stop-color="#D8AE4B"/>
    <stop offset="1" stop-color="#A87F2B"/>
  </radialGradient>
</defs>
${shadow(90, 22, 4, 0.18)}
<circle cx="50" cy="48" r="34" fill="url(#cn)"/>
<circle cx="50" cy="48" r="26" fill="none" stroke="#B8912F" stroke-width="2.2" opacity="0.6"/>
<path d="M40,40 C40,34 60,34 60,40 C60,46 40,50 40,56 C40,62 60,62 60,56"
  fill="none" stroke="#8C6C22" stroke-width="4.5" stroke-linecap="round" opacity="0.85"/>`);

/* ------------------------------------------------------------- registry ---- */

export const BOARD_PIECES = {
  // hook + moth appended below
  ...Object.fromEntries(Object.keys(PALETTE).map((k) => [`ball_${k}`, () => yarnBall(k)])),
  puff,
  bobble,
  popcorn,
  yarnBomb,
  bead,
  button,
  knot,
  tangle1: () => tangle(1),
  tangle2: () => tangle(2),
  tangle3: () => tangle(3),
  stitch_un1: () => stitchTile('unstitched1'),
  stitch_un2: () => stitchTile('unstitched2'),
  stitch_done: () => stitchTile('stitched'),
  cellTile,
  meterRing,
  meterFill: () => meterFill(0.65),
  coin,
};

/* ------------------------------------------------------- hook and moth ----- */

// Rides on a ball like a special overlay: a wooden hook laid across it.
export const hook = () =>
  svg(`
<g transform="rotate(-34 50 50)">
  <rect x="28" y="43" width="52" height="11" rx="5.5" fill="#B98A52"/>
  <rect x="28" y="43" width="52" height="5" rx="2.5" fill="#D6A96E" opacity="0.85"/>
  <rect x="46" y="43" width="9" height="11" fill="#9A6E3C" opacity="0.45"/>
  <path d="M28,48.5 C18,48.5 15,42 20,39" fill="none" stroke="#B98A52" stroke-width="10.5" stroke-linecap="round"/>
  <path d="M28,46 C19,46 17,41.5 20.5,39.5" fill="none" stroke="#D6A96E" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
</g>`);

// Fills the cell. Unwelcome, but this is a cozy game — muted, not grim.
export const moth = () =>
  svg(`
<rect x="4" y="4" width="92" height="92" rx="12" fill="#E8E0D2" opacity="0.55"/>
<g transform="translate(50,52)">
  <ellipse cx="-20" cy="-6" rx="21" ry="15" fill="#B9AEBF" transform="rotate(-22)"/>
  <ellipse cx="20" cy="-6" rx="21" ry="15" fill="#B9AEBF" transform="rotate(22)"/>
  <ellipse cx="-15" cy="12" rx="15" ry="11" fill="#A99DB0" transform="rotate(-14)"/>
  <ellipse cx="15" cy="12" rx="15" ry="11" fill="#A99DB0" transform="rotate(14)"/>
  <ellipse cx="-22" cy="-8" rx="7" ry="5" fill="#8C8096" opacity="0.6" transform="rotate(-22)"/>
  <ellipse cx="22" cy="-8" rx="7" ry="5" fill="#8C8096" opacity="0.6" transform="rotate(22)"/>
  <ellipse cx="0" cy="2" rx="6.5" ry="17" fill="#7D7185"/>
  <ellipse cx="0" cy="-14" rx="6" ry="6" fill="#8C8096"/>
  <circle cx="-2.4" cy="-15" r="1.5" fill="#4A414F"/><circle cx="2.4" cy="-15" r="1.5" fill="#4A414F"/>
  <path d="M-3,-19 C-7,-25 -10,-26 -12,-25" fill="none" stroke="#7D7185" stroke-width="2" stroke-linecap="round"/>
  <path d="M3,-19 C7,-25 10,-26 12,-25" fill="none" stroke="#7D7185" stroke-width="2" stroke-linecap="round"/>
</g>`);

/* ---------------------------------------------------------- goal icons ----- */
// 24x24 flat silhouettes for the goals panel, drawn there at 22pt
// (GoalsPanel.jsx), so detail is the enemy: silhouette only.

const ICON = (inner) => svg(inner, '0 0 24 24');
const INK = '#6E5744';

export const iconStitch = () =>
  ICON(`<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="${INK}" stroke-width="2"/>
<path d="M8,10 l2,3 l2,-3 M14,10 l2,3 l2,-3" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);

export const iconCollect = (key = 'olive') =>
  ICON(`<circle cx="12" cy="12" r="9" fill="${PALETTE[key]}"/>
<path d="M4,9 C9,5 15,5 20,9 M4,15 C9,19 15,19 20,15" fill="none" stroke="${darken(PALETTE[key], 0.35)}" stroke-width="1.8" stroke-linecap="round"/>`);

export const iconBeads = () =>
  ICON(`<circle cx="7" cy="9" r="4" fill="${INK}"/><circle cx="16" cy="7" r="3.2" fill="${INK}" opacity="0.75"/>
<circle cx="12" cy="17" r="3.6" fill="${INK}" opacity="0.9"/>`);

export const iconTangle = () =>
  ICON(`<g fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round">
<path d="M3,8 C8,3 16,13 21,7"/><path d="M3,14 C9,9 15,19 21,13"/><path d="M8,3 C5,9 11,15 8,21"/></g>`);

export const iconKnot = () =>
  ICON(`<circle cx="12" cy="13" r="5" fill="none" stroke="${INK}" stroke-width="2.2"/>
<path d="M9,8 L6,3 M15,8 L18,3" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`);

export const iconMoth = () =>
  ICON(`<g fill="${INK}"><ellipse cx="7" cy="10" rx="5.5" ry="4" transform="rotate(-20 7 10)"/>
<ellipse cx="17" cy="10" rx="5.5" ry="4" transform="rotate(20 17 10)"/>
<ellipse cx="12" cy="12" rx="2" ry="6"/><circle cx="12" cy="7" r="2.2"/></g>`);

export const iconBuried = () =>
  ICON(`<path d="M2,14 L8,14 L11,11 L13,11 L16,14 L22,14 L22,21 L2,21 Z" fill="${INK}" opacity="0.55"/>
<circle cx="12" cy="7" r="4.5" fill="${INK}"/>
<circle cx="10.4" cy="5.6" r="0.9" fill="#F6EFE4"/><circle cx="13.6" cy="5.6" r="0.9" fill="#F6EFE4"/>
<circle cx="10.4" cy="8.4" r="0.9" fill="#F6EFE4"/><circle cx="13.6" cy="8.4" r="0.9" fill="#F6EFE4"/>`);

export const iconGear = () =>
  ICON(`<circle cx="12" cy="12" r="3.4" fill="none" stroke="${INK}" stroke-width="2"/>
<g stroke="${INK}" stroke-width="2" stroke-linecap="round">
${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M12,2.6 L12,5.4" transform="rotate(${a} 12 12)"/>`).join('')}
</g>`);

export const GOAL_ICONS = {
  iconStitch,
  iconBeads,
  iconTangle,
  iconKnot,
  iconMoth,
  iconBuried,
  iconGear,
  ...Object.fromEntries(
    Object.keys(PALETTE).map((k) => [`iconCollect_${k}`, () => iconCollect(k)]),
  ),
};

Object.assign(BOARD_PIECES, { hook, moth });

/* ------------------------------------------------------------------ frog -- */
// Amigurumi is built from spheres, which is why this works as hand-drawn
// vector: body blob, two eye bumps on top, stitch rounds. The eye bumps are
// the silhouette tell — they are what makes him read as a frog at 34pt.

const FROG_GREEN = '#6E9A48'; // deliberately greener/brighter than olive yarn,
// so he never reads as an olive ball on the board

const FROG_BODY = {
  piece:
    'M84.5,59.0C84.6,62.7 83.2,66.7 81.5,70.1C79.7,73.6 77.2,77.0 74.1,79.6C71.0,82.2 67.0,84.4 63.0,85.7C58.9,87.0 54.4,87.4 50.0,87.5C45.6,87.6 40.8,87.5 36.8,86.2C32.8,84.8 29.2,82.0 26.1,79.4C22.9,76.8 19.6,73.7 18.0,70.3C16.4,66.9 16.4,62.7 16.5,59.0C16.6,55.3 17.1,51.3 18.7,47.9C20.2,44.5 23.0,41.2 26.0,38.6C29.1,35.9 33.0,33.6 36.9,32.1C40.9,30.6 45.7,29.4 50.0,29.5C54.3,29.6 58.8,31.1 62.8,32.6C66.9,34.0 71.2,35.8 74.2,38.4C77.2,41.0 79.1,44.7 80.8,48.1C82.5,51.5 84.4,55.3 84.5,59.0Z',
  dial: 'M80.5,62.0C80.6,65.4 79.3,69.2 77.8,72.4C76.2,75.5 74.0,78.7 71.3,81.2C68.6,83.6 65.0,85.6 61.4,86.9C57.9,88.1 53.8,88.5 50.0,88.6C46.2,88.6 41.9,88.5 38.4,87.3C34.8,86.0 31.7,83.5 28.9,81.0C26.1,78.5 23.2,75.7 21.8,72.5C20.4,69.4 20.4,65.5 20.5,62.0C20.6,58.5 20.9,54.9 22.3,51.7C23.7,48.5 26.2,45.4 28.9,43.0C31.6,40.5 35.0,38.4 38.5,37.0C42.0,35.6 46.2,34.5 50.0,34.6C53.8,34.6 57.8,36.0 61.3,37.4C64.9,38.8 68.7,40.4 71.3,42.8C74.0,45.2 75.7,48.7 77.2,51.9C78.7,55.1 80.4,58.6 80.5,62.0Z',
  hop: 'M85.5,56.0C85.7,59.3 84.2,62.9 82.4,66.0C80.6,69.0 78.0,72.1 74.8,74.5C71.7,76.8 67.5,78.8 63.3,79.9C59.2,81.1 54.5,81.5 50.0,81.6C45.5,81.6 40.5,81.6 36.4,80.3C32.3,79.1 28.6,76.7 25.4,74.3C22.2,71.9 18.7,69.2 17.1,66.1C15.4,63.1 15.4,59.3 15.5,56.0C15.7,52.7 16.1,49.1 17.7,46.1C19.4,43.0 22.2,40.0 25.3,37.7C28.5,35.3 32.5,33.2 36.6,31.9C40.7,30.5 45.6,29.5 50.0,29.6C54.4,29.6 59.1,31.0 63.2,32.3C67.4,33.6 71.8,35.2 74.9,37.5C78.0,39.8 79.9,43.2 81.7,46.2C83.5,49.3 85.4,52.7 85.5,56.0Z',
};

const FROG_GEO = {
  piece: {
    body: FROG_BODY.piece,
    eyes: [
      [34, 26, 15],
      [66, 26, 15],
    ],
    belly: [50, 68, 21, 16],
    mouthY: 50,
  },
  dial: {
    body: FROG_BODY.dial,
    eyes: [
      [36, 31, 13],
      [64, 31, 13],
    ],
    belly: [50, 71, 18, 14],
    mouthY: 54,
  },
  hop: {
    body: FROG_BODY.hop,
    eyes: [
      [34, 26, 14],
      [66, 24, 14],
    ],
    belly: [50, 64, 20, 14],
    mouthY: 48,
  },
};

/**
 * @param {'piece'|'dial'|'hop'} pose
 * @param {{blink?: boolean, tongue?: boolean}} [opt]
 */
export function frog(pose = 'piece', opt = {}) {
  const g = FROG_GEO[pose];
  const hi = lighten(FROG_GREEN, 0.3);
  const lo = darken(FROG_GREEN, 0.32);
  const limb = darken(FROG_GREEN, 0.14);
  const belly = lighten(FROG_GREEN, 0.42);
  const stitch = darken(FROG_GREEN, 0.2);
  const id = `fr_${pose}${opt.blink ? '_b' : ''}${opt.tongue ? '_t' : ''}`;
  const [bx, by, brx, bry] = g.belly;

  const eyeBump = ([ex, ey, er], i) => `
  <circle cx="${ex}" cy="${ey}" r="${er}" fill="url(#${id}_e)"/>
  ${
    opt.blink
      ? `<path d="M${ex - 5},${ey} Q${ex},${ey + 4} ${ex + 5},${ey}" fill="none" stroke="#3A2A22" stroke-width="2.4" stroke-linecap="round"/>`
      : `<circle cx="${ex}" cy="${ey}" r="4.8" fill="#3A2A22"/>
         <circle cx="${ex - 2}" cy="${ey - 2.4}" r="1.8" fill="#FCF6EA" opacity="0.92"/>`
  }`;

  // limbs splay only on the hop pose; on the board they tuck in against the
  // body, because a piece on the board has to stay ball-shaped
  const legs =
    pose === 'hop'
      ? `<ellipse cx="20" cy="74" rx="14" ry="7" fill="${limb}" transform="rotate(24 20 74)"/>
       <ellipse cx="80" cy="78" rx="13" ry="6.5" fill="${limb}" transform="rotate(-16 80 78)"/>
       <ellipse cx="30" cy="34" rx="9" ry="5.5" fill="${limb}" transform="rotate(-34 30 34)"/>
       <ellipse cx="72" cy="36" rx="9" ry="5.5" fill="${limb}" transform="rotate(30 72 36)"/>`
      : `<ellipse cx="17" cy="66" rx="9" ry="11" fill="${limb}"/>
       <ellipse cx="83" cy="66" rx="9" ry="11" fill="${limb}"/>
       <ellipse cx="34" cy="86" rx="11" ry="6" fill="${limb}"/>
       <ellipse cx="66" cy="86" rx="11" ry="6" fill="${limb}"/>`;

  const mouth = opt.tongue
    ? `<path d="M38,${g.mouthY} Q50,${g.mouthY + 11} 62,${g.mouthY}" fill="#3A2A22" opacity="0.85"/>
       <path d="M58,${g.mouthY + 6} Q74,${g.mouthY + 10} 80,${g.mouthY - 2}" fill="none" stroke="#E9A0A8" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M40,${g.mouthY} Q50,${g.mouthY + 8} 60,${g.mouthY}" fill="none" stroke="${darken(FROG_GREEN, 0.48)}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>`;

  return svg(`
<defs>
  <radialGradient id="${id}_b" cx="38%" cy="34%" r="74%">
    <stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/>
  </radialGradient>
  <radialGradient id="${id}_e" cx="34%" cy="30%" r="76%">
    <stop offset="0" stop-color="${lighten(FROG_GREEN, 0.36)}"/><stop offset="1" stop-color="${darken(FROG_GREEN, 0.2)}"/>
  </radialGradient>
  <radialGradient id="${id}_s" cx="64%" cy="70%" r="64%">
    <stop offset="0.5" stop-color="${lo}" stop-opacity="0"/>
    <stop offset="1" stop-color="${lo}" stop-opacity="0.5"/>
  </radialGradient>
  <clipPath id="${id}_c"><path d="${g.body}"/></clipPath>
</defs>
${pose === 'hop' ? shadow(96, 16, 3, 0.1) : shadow(93, 26, 4.5, 0.17)}
${legs}
<path d="${g.body}" fill="url(#${id}_b)"/>
<g clip-path="url(#${id}_c)">
  <g fill="none" stroke="${stitch}" stroke-width="1.6" stroke-opacity="0.3" stroke-linecap="round">
    <path d="M20,50 Q50,42 80,50"/><path d="M18,60 Q50,52 82,60"/>
    <path d="M20,70 Q50,63 80,70"/><path d="M24,79 Q50,73 76,79"/>
  </g>
  <ellipse cx="${bx}" cy="${by}" rx="${brx}" ry="${bry}" fill="${belly}" opacity="0.8"/>
  <path d="${g.body}" fill="url(#${id}_s)"/>
</g>
${g.eyes.map(eyeBump).join('')}
${mouth}`);
}

Object.assign(BOARD_PIECES, {
  frog_piece: () => frog('piece'),
  frog_dial: () => frog('dial'),
  frog_hop: () => frog('hop'),
  frog_blink: () => frog('dial', { blink: true }),
  frog_tongue: () => frog('piece', { tongue: true }),
});
