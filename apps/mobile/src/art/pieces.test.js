// pieces.js is owner-supplied art, and the app never looks at it again after parsing it once into
// sprites. That makes this file the guard: a later edit to a path, a colour or a template hole
// would otherwise reach the board as a blank cell, and nothing else would notice. pieces.js
// imports palette.js and nothing more — no react-native-svg — so all of it runs under plain node.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BOARD_PIECES,
  GOAL_ICONS,
  frog,
  iconCollect,
  meterFill,
  stitchTile,
  tangle,
  yarnBall,
} from './pieces.js';
import { COLOR_KEYS } from './palette.js';

const POSES = ['piece', 'dial', 'hop'];
const OPTS = [{}, { blink: true }, { tongue: true }, { blink: true, tongue: true }];
const poseName = (pose, opt) => `frog('${pose}', ${JSON.stringify(opt)})`;

// Every tag is opening, closing or self-closing, and no attribute value in this art contains a
// '>' — which is what lets one regex stand in for a parser.
const tagsOf = (xml) => xml.match(/<\/?[a-zA-Z][^>]*>/g) ?? [];
const idsOf = (xml) => (xml.match(/ id="[^"]+"/g) ?? []).map((m) => m.slice(5, -1));
const viewBoxOf = (xml) => (xml.match(/viewBox="([^"]+)"/) ?? [])[1];
const distinct = (strings) => new Set(strings).size === strings.length;
// The dial's sweep and its full circumference, the two numbers stroke-dasharray is drawn from.
const dashOf = (xml) => {
  const dash = xml.match(/stroke-dasharray="([^"]+)"/)[1];
  return dash.split(' ').map(Number);
};

// Every distinct document the art can draw: both registries plus the frog's twelve variants, with
// duplicates collapsed, because BOARD_PIECES.frog_piece and frog('piece') are the same string.
const everyDocument = () => {
  const byXml = new Map();
  const put = (name, xml) => {
    if (!byXml.has(xml)) byXml.set(xml, name);
  };
  for (const [n, f] of Object.entries(BOARD_PIECES)) put(`BOARD_PIECES.${n}`, f());
  for (const [n, f] of Object.entries(GOAL_ICONS)) put(`GOAL_ICONS.${n}`, f());
  for (const pose of POSES) for (const opt of OPTS) put(poseName(pose, opt), frog(pose, opt));
  return [...byXml].map(([xml, name]) => [name, xml]);
};

const assertWellFormed = (xml, name) => {
  assert.equal(typeof xml, 'string', `${name} did not return a string`);
  assert.ok(xml.startsWith('<svg'), `${name} does not start with <svg`);
  assert.ok(xml.endsWith('</svg>'), `${name} does not end with </svg>`);
  assert.equal((xml.match(/<svg[\s>]/g) ?? []).length, 1, `${name} has more than one <svg root`);
  // A gap in the data lands in the string as one of these three and then draws as nothing at all,
  // which on a board of coloured circles is invisible until someone cannot clear a level.
  for (const hole of ['undefined', 'NaN', 'null']) {
    assert.ok(!xml.includes(hole), `${name} contains the token ${hole}`);
  }
  // Counting openers against closers is not enough: a document that closes </defs> where a <g> is
  // still open balances perfectly and renders as nothing, so walk the tags on a stack and make the
  // names and the order agree too.
  const stack = [];
  for (const tag of tagsOf(xml)) {
    if (tag.endsWith('/>')) continue;
    if (tag.startsWith('</')) {
      assert.equal(stack.pop(), tag.slice(2, -1).trim(), `${name} closes ${tag} out of order`);
    } else {
      stack.push(tag.slice(1).match(/^[a-zA-Z][\w:.-]*/)[0]);
    }
  }
  assert.deepEqual(stack, [], `${name} never closes ${stack.join(', ')}`);
};

test('every board piece returns one well-formed svg document', () => {
  assert.ok(Object.keys(BOARD_PIECES).length >= 30, 'the board piece registry lost entries');
  for (const [name, factory] of Object.entries(BOARD_PIECES)) {
    assertWellFormed(factory(), `BOARD_PIECES.${name}`);
  }
});

test('every goal icon returns one well-formed svg document', () => {
  // Without a floor, a registry that lost its entries would pass this test by having nothing to run.
  assert.ok(Object.keys(GOAL_ICONS).length >= 13, 'the goal icon registry lost entries');
  for (const [name, factory] of Object.entries(GOAL_ICONS)) {
    assertWellFormed(factory(), `GOAL_ICONS.${name}`);
  }
});

test('BOARD_PIECES carries a ball for each of the six colours and the six differ', () => {
  for (const key of COLOR_KEYS) {
    assert.equal(typeof BOARD_PIECES[`ball_${key}`], 'function', key);
    // The board draws from the registry, not from yarnBall, so the entry has to be wired to its own
    // colour: six entries all pointing at yarnBall('olive') still pass the distinctness check below.
    assert.equal(BOARD_PIECES[`ball_${key}`](), yarnBall(key), `ball_${key} is not ${key}`);
  }
  assert.ok(distinct(COLOR_KEYS.map((key) => yarnBall(key))), 'two yarn balls render identically');
});

test('GOAL_ICONS carries an iconCollect entry for each of the six colours and the six differ', () => {
  for (const key of COLOR_KEYS) {
    assert.equal(typeof GOAL_ICONS[`iconCollect_${key}`], 'function', key);
    assert.equal(GOAL_ICONS[`iconCollect_${key}`](), iconCollect(key), `iconCollect_${key}`);
  }
  assert.ok(distinct(COLOR_KEYS.map((key) => iconCollect(key))), 'two collect icons are identical');
});

test('every frog pose and option combination is well-formed', () => {
  for (const pose of POSES) {
    for (const opt of OPTS) {
      assertWellFormed(frog(pose, opt), poseName(pose, opt));
    }
  }
});

test('a frog declares no id twice, so its gradients cannot cross-reference', () => {
  for (const pose of POSES) {
    for (const opt of OPTS) {
      const ids = idsOf(frog(pose, opt));
      assert.ok(ids.length >= 4, poseName(pose, opt));
      assert.ok(distinct(ids), `${poseName(pose, opt)} declares ${ids.join(', ')}`);
    }
  }
});

test('no two factories declare the same id, which is what makes composeSvg safe', () => {
  // composeSvg strips the wrappers off several of these documents and re-wraps them in one <svg>,
  // and its whole claim to being safe is that the ids never collide. A shared gradient id there
  // would repaint one piece with another's fill, on the board, with nothing to point at.
  const owner = new Map();
  for (const [name, xml] of everyDocument()) {
    for (const id of idsOf(xml)) {
      assert.equal(owner.get(id) ?? name, name, `${name} and ${owner.get(id)} both declare ${id}`);
      owner.set(id, name);
    }
  }
  assert.ok(owner.size >= 40, 'the art stopped declaring ids, so this guard stopped guarding');
});

test('frog is idempotent, because the sprite cache memoises on the string it returns', () => {
  for (const pose of POSES) {
    for (const opt of OPTS) {
      assert.equal(frog(pose, opt), frog(pose, opt), poseName(pose, opt));
    }
  }
});

test('the three tangle layers and the three stitch states are each pairwise distinct', () => {
  assert.ok(distinct([tangle(1), tangle(2), tangle(3)]), 'two tangle layers render identically');
  const states = ['stitched', 'unstitched1', 'unstitched2'];
  assert.ok(distinct(states.map((s) => stitchTile(s))), 'two stitch tiles render identically');
});

test('meterFill(1) sweeps the whole circumference of the r=40 dial', () => {
  const xml = meterFill(1);
  const [swept, full] = dashOf(xml);
  assert.equal(full, Number((2 * Math.PI * 40).toFixed(1)));
  assert.equal(swept, full);
  assert.ok(xml.includes('stroke-width="7"'), 'the fill no longer matches the ring it sits in');
});

test('meterFill sweeps in proportion to its charge, which is what lets arcXml clamp', () => {
  // arcXml hands meterFill min(charge, full) / full and trusts the sweep to follow it. If the sweep
  // were not proportional, clamping an over-full charge 11 would be arithmetic with no picture
  // behind it. The tolerance is the one decimal place the dasharray is rounded to.
  const full = Number((2 * Math.PI * 40).toFixed(1));
  for (const charge of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const [swept] = dashOf(meterFill(charge));
    assert.ok(Math.abs(swept - full * charge) < 0.06, `${charge} swept ${swept} of ${full}`);
  }
});

test('meterFill(0) still paints a round cap at twelve o-clock, so charge 0 must draw no arc', () => {
  // A zero-length dash with stroke-linecap="round" is not nothing: the cap alone renders as a dot
  // sitting at the top of the ring, which reads as a meter that is already filling. This is the
  // whole reason compose.js's arcXml returns null at charge 0 rather than calling meterFill(0).
  const xml = meterFill(0);
  const [swept] = dashOf(xml);
  assert.equal(swept, 0);
  assert.ok(xml.includes('stroke-linecap="round"'));
  assert.ok(xml.includes('<circle'));
});

test('board factories draw on a 100 unit box and goal icons on a 24 unit box', () => {
  for (const [name, factory] of Object.entries(BOARD_PIECES)) {
    assert.equal(viewBoxOf(factory()), '0 0 100 100', `BOARD_PIECES.${name}`);
  }
  for (const [name, factory] of Object.entries(GOAL_ICONS)) {
    assert.equal(viewBoxOf(factory()), '0 0 24 24', `GOAL_ICONS.${name}`);
  }
  assert.equal(viewBoxOf(frog('hop', { tongue: true })), '0 0 100 100');
  assert.equal(viewBoxOf(iconCollect('rust')), '0 0 24 24');
});

test('pieces.js imports the palette and nothing else, so this layer stays node-testable', () => {
  // importing react-native-svg reaches react-native, whose Flow-typed source throws
  // "Unexpected token 'typeof'" under plain
  // node, so a single import of it here would take this file, palette.test.js and compose.test.js
  // down with it. sprites.js is the layer allowed to import it, and it has no node test.
  const src = readFileSync(new URL('./pieces.js', import.meta.url), 'utf8');
  const froms = [...src.matchAll(/^import [\s\S]*? from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(froms, ['./palette.js']);
});
