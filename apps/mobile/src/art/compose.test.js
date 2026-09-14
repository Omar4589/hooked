// compose.js is the pure-string half of the art layer: it glues the factory SVGs from pieces.js
// into the handful of composed images the board actually draws. It imports nothing from
// react-native-svg — that lives in sprites.js — which is exactly what lets the whole thing be
// tested here, in node, against the markup itself.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLOR_KEYS } from './palette.js';
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
import { arcXml, composeSvg, spriteXml, tileSheetXml } from './compose.js';

const SPECIALS = [null, 'puff', 'bobble', 'popcorn', 'yarnbomb', 'hook'];

// Every special that lies ON the ball, and the factory that draws it. The bomb is absent on
// purpose: it replaces the ball instead of riding it.
const OVERLAYS = { puff, bobble, popcorn, hook };

// 6 colours x 6 specials x knotted/plain = every distinct thing a piece can look like.
const APPEARANCES = COLOR_KEYS.flatMap((color) =>
  SPECIALS.flatMap((special) => [false, true].map((knotted) => ({ color, special, knotted }))),
);
const label = ({ color, special, knotted }) => `${color}/${special}${knotted ? '/knotted' : ''}`;

const count = (haystack, needle) => haystack.split(needle).length - 1;

/** The markup between an svg's tags — how every "did this input survive?" check is phrased. */
const inner = (xml) =>
  xml
    .replace(/^\s*<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

const rootTag = (xml) => (xml.match(/^\s*<svg\b[^>]*>/) ?? [''])[0];

const idsIn = (xml) => [...xml.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);

const dashOf = (xml) => (xml.match(/stroke-dasharray="([^"]*)"/) ?? [])[1];

const TAG = /<(\/?)([a-zA-Z][-\w:]*)[^>]*?(\/?)>/g;

/**
 * Tiny well-formedness check: every tag closes, and closes in order. Enough to catch a wrapper
 * strip that took half a tag with it, which is the failure mode string surgery actually has.
 * Returns null when the markup is sound, otherwise a description of the first break.
 */
const unbalanced = (xml) => {
  const stack = [];
  for (const [, slash, name, selfClose] of xml.matchAll(TAG)) {
    if (selfClose) continue;
    if (!slash) {
      stack.push(name);
      continue;
    }
    const open = stack.pop();
    if (open !== name) return `</${name}> closes <${open ?? 'nothing'}>`;
  }
  return stack.length ? `<${stack[stack.length - 1]}> never closes` : null;
};

/* --------------------------------------------------------------------- composeSvg -- */

test('composeSvg puts many svgs under one root and keeps each inner markup, in order', () => {
  const parts = [yarnBall('olive'), puff(), knot()];
  const out = composeSvg(...parts);
  assert.equal(count(out, '<svg'), 1);
  assert.equal(count(out, '</svg>'), 1);
  let previous = -1;
  for (const part of parts) {
    const at = out.indexOf(inner(part));
    assert.notEqual(at, -1, `an input's markup was dropped: ${inner(part).slice(0, 40)}`);
    assert.ok(at > previous, 'the inputs came out in a different order than they went in');
    previous = at;
  }
  assert.equal(unbalanced(out), null);
});

test('composeSvg re-wraps on the 100x100 board viewBox with the svg namespace', () => {
  const tag = rootTag(composeSvg(yarnBall('mustard'), knot()));
  assert.ok(tag.includes('viewBox="0 0 100 100"'), tag);
  assert.ok(tag.includes('xmlns="http://www.w3.org/2000/svg"'), tag);
});

test('composing a single svg changes nothing but the wrapper, however often it is done', () => {
  const one = yarnBall('cocoa');
  assert.equal(inner(composeSvg(one)), inner(one));
  assert.equal(inner(composeSvg(composeSvg(one))), inner(one));
  assert.equal(count(composeSvg(composeSvg(one)), '<svg'), 1);
});

/* ---------------------------------------------------------------------- spriteXml -- */

test('all 72 appearances are exactly one balanced svg on the board viewBox', () => {
  assert.equal(APPEARANCES.length, 72);
  for (const spec of APPEARANCES) {
    const xml = spriteXml(spec);
    assert.equal(count(xml, '<svg'), 1, label(spec));
    assert.equal(count(xml, '</svg>'), 1, label(spec));
    assert.ok(rootTag(xml).includes('viewBox="0 0 100 100"'), label(spec));
    const broken = unbalanced(xml);
    assert.equal(broken, null, `${label(spec)}: ${broken}`);
  }
});

test('no appearance repeats an id or leaks an undefined value into the markup', () => {
  for (const spec of APPEARANCES) {
    const xml = spriteXml(spec);
    const ids = idsIn(xml);
    assert.ok(ids.length > 0, `${label(spec)} carries no ids at all`);
    assert.equal(new Set(ids).size, ids.length, `${label(spec)} repeats an id: ${ids.join(' ')}`);
    assert.ok(!xml.includes('undefined'), label(spec));
    assert.ok(!xml.includes('NaN'), label(spec));
  }
});

test('spriteXml defaults to a plain, unknotted ball', () => {
  const xml = spriteXml({ color: 'blush' });
  assert.equal(xml, spriteXml({ color: 'blush', special: null, knotted: false }));
  assert.ok(xml.includes(inner(yarnBall('blush'))));
  assert.ok(!xml.includes(inner(knot())));
});

// OWNER DECISION, not a bug: the bomb is the whole piece. If a future change "fixes" this by
// putting a ball back underneath, this test is the one that says no.
test('the owner decision: yarnbomb REPLACES the ball, so no yarn ball ids appear', () => {
  for (const color of COLOR_KEYS) {
    for (const knotted of [false, true]) {
      const xml = spriteXml({ color, special: 'yarnbomb', knotted });
      assert.ok(!xml.includes(`yb_${color}_`), `${color} ball survived under the bomb`);
      assert.ok(xml.includes('id="ybm"'), color);
      assert.ok(xml.includes(inner(yarnBomb())), color);
      // replacing the ball does not un-knot the piece: a knotted bomb is still knotted
      if (knotted) assert.ok(xml.includes(inner(knot())), `${color} bomb lost its knot`);
      else assert.ok(!xml.includes(inner(knot())), `${color} bomb grew a knot`);
    }
  }
});

test('puff sits on top of the ball: the ball ids and the puff id are both there', () => {
  const xml = spriteXml({ color: 'olive', special: 'puff' });
  assert.ok(xml.includes('id="yb_olive_b"'));
  assert.ok(xml.includes('id="yb_olive_s"'));
  assert.ok(xml.includes('id="yb_olive_c"'));
  assert.ok(xml.includes('id="pf"'));
  assert.ok(xml.indexOf(inner(puff())) > xml.indexOf(inner(yarnBall('olive'))), 'puff draws last');
});

test('every special but the bomb overlays the ball rather than replacing it', () => {
  for (const color of COLOR_KEYS) {
    for (const special of SPECIALS.filter((s) => s !== 'yarnbomb')) {
      const xml = spriteXml({ color, special });
      const ball = xml.indexOf(inner(yarnBall(color)));
      assert.notEqual(ball, -1, `${color}/${special} lost its ball`);
      assert.ok(xml.includes(`id="yb_${color}_b"`), `${color}/${special}`);
      if (!special) continue;
      // Both halves, or a sprite that quietly forgot a special still looks like a valid ball.
      const over = xml.indexOf(inner(OVERLAYS[special]()));
      assert.notEqual(over, -1, `${color}/${special} never drew its ${special}`);
      assert.ok(over > ball, `${color}/${special} drew its ${special} under the ball`);
    }
  }
});

test('knotted adds the knot last of all, and leaving it off leaves the markup out', () => {
  const plain = spriteXml({ color: 'rust', special: 'bobble', knotted: false });
  const tied = spriteXml({ color: 'rust', special: 'bobble', knotted: true });
  assert.ok(!plain.includes(inner(knot())));
  assert.ok(tied.includes(inner(knot())));
  // last means last: the knot lies over the ball AND over the special in the centre
  assert.ok(tied.indexOf(inner(knot())) > tied.indexOf(inner(yarnBall('rust'))));
  assert.ok(tied.indexOf(inner(knot())) > tied.indexOf(inner(bobble())));
  const bare = spriteXml({ color: 'rust', knotted: true }); // a knot with no special at all
  assert.ok(bare.includes(inner(knot())) && bare.includes(inner(yarnBall('rust'))));
});

/* ------------------------------------------------------------------- tileSheetXml -- */

// open is [y][x]: three wide, two high, with the middle of the bottom row missing.
const GRID = [
  [true, true, true],
  [true, false, true],
];

test('tileSheetXml lays one translated tile per open cell and skips the hole', () => {
  const out = tileSheetXml(GRID);
  assert.equal(count(out, '<svg'), 1);
  assert.ok(rootTag(out).includes('viewBox="0 0 300 200"'), rootTag(out));
  assert.equal(count(out, '<g '), 5);
  assert.equal(count(out, '</g>'), 5);
  for (const at of ['0,0', '100,0', '200,0', '0,100', '200,100']) {
    assert.ok(out.includes(`<g transform="translate(${at})">`), at);
  }
  assert.ok(!out.includes('translate(100,100)'), 'the hole was tiled');
  assert.equal(count(out, inner(cellTile())), 5);
  assert.ok(!out.includes('<defs'), 'a tile sheet needs no ids, so it needs no defs');
  assert.equal(unbalanced(out), null);
});

test('an all-holes board is still one valid svg, with nothing inside it', () => {
  const out = tileSheetXml([
    [false, false],
    [false, false],
  ]);
  assert.equal(count(out, '<svg'), 1);
  assert.equal(count(out, '</svg>'), 1);
  assert.equal(count(out, '<g'), 0);
  assert.ok(rootTag(out).includes('viewBox="0 0 200 200"'), rootTag(out));
  assert.equal(inner(out), '');
  assert.equal(unbalanced(out), null);
});

/* ------------------------------------------------------------------------- arcXml -- */

// The reason arcXml has a zero case at all: a round cap on a zero-length dash still paints,
// so meterFill(0) is a dot at twelve o'clock, not an empty ring.
test('meterFill(0) paints a round-capped dot, which is why arcXml must refuse to draw it', () => {
  const empty = meterFill(0);
  assert.equal(dashOf(empty), '0.0 251.3');
  assert.ok(empty.includes('stroke-linecap="round"'));
});

test('arcXml draws no arc at all at charge 0 or below', () => {
  assert.equal(arcXml(0, 10), null);
  assert.equal(arcXml(-1, 10), null);
  assert.equal(arcXml(-0.0001, 10), null);
});

test('arcXml returns markup as soon as there is any charge', () => {
  const xml = arcXml(1, 10);
  assert.equal(typeof xml, 'string');
  assert.equal(count(xml, '<svg'), 1);
  assert.ok(rootTag(xml).includes('viewBox="0 0 100 100"'), rootTag(xml));
  assert.equal(unbalanced(xml), null);
  assert.equal(typeof arcXml(0.0001, 10), 'string');
});

test('arcXml hands meterFill the charge as a fraction of a full meter', () => {
  for (const [charge, full] of [
    [1, 10],
    [5, 10],
    [10, 10],
    [3, 4],
  ]) {
    assert.equal(
      dashOf(arcXml(charge, full)),
      dashOf(meterFill(charge / full)),
      `${charge}/${full}`,
    );
  }
});

// The engine really does report charge 11 on a full=10 meter — it is never capped upstream.
test('arcXml clamps a charge above full, because the engine reports 11 on a 10 meter', () => {
  assert.equal(arcXml(11, 10), arcXml(10, 10));
  assert.equal(arcXml(10.5, 10), arcXml(10, 10));
  assert.equal(dashOf(arcXml(11, 10)), dashOf(meterFill(1)));
});

/* --------------------------------------------------------------------- the module -- */

// The reason compose.js exists apart from sprites.js: importing react-native-svg reaches
// react-native itself, whose Flow-typed source plain node will not parse
// and dies under plain node, so the moment compose.js imports it every test above goes with it.
test('compose.js stays pure strings and imports no react code', () => {
  const src = readFileSync(new URL('./compose.js', import.meta.url), 'utf8');
  assert.ok(!/from '(react|react-native)/.test(src));
});
