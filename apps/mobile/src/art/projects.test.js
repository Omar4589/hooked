// projects.js and illustrations.js are the two halves of one registry: a level names a project,
// projectKeyOf reads that name off the level, and the win screen draws the illustration filed
// under it. Only the first half can be imported here. illustrations.js is built from require() of
// PNG files, and under this runner require() throws "require is not defined in ES module scope"
// while an import of a .png throws ERR_UNKNOWN_FILE_EXTENSION — either spelling would fail this
// file (node --test isolates each one, so the rest of the run is unharmed). So the Metro half is reached the way pieces.test.js
// polices its own import list: by reading the source as text. That text is node's only reach into
// it, which is why the two scans below parse every entry rather than sampling.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { listDevLevels, listLevels, loadLevel } from '@hooked/levels';

// This file sits in src/art/ alongside both modules, so a path written relative to illustrations.js
// resolves correctly against this test's own URL.
const ART_DIR = new URL('./', import.meta.url);
const PROJECTS = new URL('./projects.js', ART_DIR);
const ILLUSTRATIONS = new URL('./illustrations.js', ART_DIR);

// projects.js is imported inside the tests that use it rather than at the top of the file: a static
// import of a module that does not exist yet fails before any test runs, and the two tests that
// read illustrations.js have nothing to do with projects.js. Each missing half should fail only the
// tests that need it, naming itself.
const importProjects = async () => {
  try {
    return await import(PROJECTS.href);
  } catch (err) {
    return assert.fail(`apps/mobile/src/art/projects.js does not import: ${err.message}`);
  }
};

const readIllustrations = () => {
  if (!existsSync(ILLUSTRATIONS)) {
    return assert.fail(
      'apps/mobile/src/art/illustrations.js is missing: the project -> illustration map has not ' +
        'been written yet, so nothing maps coaster_olive to its PNGs.',
    );
  }
  return stripComments(readFileSync(ILLUSTRATIONS, 'utf8'));
};

// Every level the loader can reach, shipped and development alike, each with the file behind it.
const everyLevel = () =>
  [...listLevels(), ...listDevLevels()].map((summary) => ({
    summary,
    json: loadLevel(summary.id),
  }));

const describeLevel = ({ summary }) => `level ${summary.id} (${summary.name})`;

// --- reading illustrations.js as text ---------------------------------------------------------
//
// The shape both scans expect is a flat literal, one project key per entry:
//
//   const ILLUSTRATIONS = {
//     coaster_olive: {
//       empty: require('./illus_coaster_empty.png'),
//       done: require('./illus_coaster_done.png'),
//     },
//   };
//
// Neither scan depends on where the line breaks fall, on the quote style, or on the spacing, so
// prettier collapsing an entry onto one line or re-wrapping the file does not change what they
// find. What they do depend on: a project key is the only key in the file whose value is an object
// literal (`empty` and `done` are followed by require(), so they cannot be read as projects), and
// every asset is named by a require() with a single quoted argument.

// Comments come out first, so an entry someone has commented out — or a path written in prose in a
// note — cannot be read as a live require(). String literals are copied through untouched, which is
// what keeps the paths themselves intact. A regex literal containing /* would confuse this, and a
// flat literal of require() calls has no reason to hold one.
const stripComments = (src) => {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      while (i < src.length && src[i] !== '\n') i += 1;
      out += '\n';
    } else if (two === '/*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 1;
      out += ' ';
    } else if (src[i] === "'" || src[i] === '"' || src[i] === '`') {
      const quote = src[i];
      out += src[i];
      i += 1;
      while (i < src.length && src[i] !== quote) {
        out += src[i];
        if (src[i] === '\\') {
          i += 1;
          out += src[i] ?? '';
        }
        i += 1;
      }
      out += quote;
    } else {
      out += src[i];
    }
  }
  return out;
};

const requirePathsIn = (code) =>
  [...code.matchAll(/\brequire\(\s*(['"])([^'"]*)\1\s*\)/g)].map((m) => m[2]);

// The leading '{' or ',' anchors the name to a key position, so a ':' inside a path or a sentence
// cannot be mistaken for one. Bare, single-quoted and double-quoted keys all count.
const projectKeysIn = (code) =>
  [...code.matchAll(/[{,]\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\{/g)].map(
    (m) => m[1] ?? m[2] ?? m[3],
  );

// Metro resolves require('./x.png') by picking the density that fits the screen, so the two
// siblings are as required as the file that is named.
const densitySiblings = (path) => [
  path,
  path.replace(/\.png$/, '@2x.png'),
  path.replace(/\.png$/, '@3x.png'),
];

test('projectKeyOf returns the project string a level carries, and null for anything else', async () => {
  const { projectKeyOf } = await importProjects();
  const levels = everyLevel();
  // A floor, so a loader that listed nothing could not pass this by having nothing to check.
  assert.ok(levels.length >= 5, `the loader lists only ${levels.length} levels`);
  for (const level of levels) {
    // strict equality, so a level whose project is missing cannot pass by both sides being nullish.
    assert.equal(typeof level.json.project, 'string', `${describeLevel(level)} has no project`);
    assert.equal(projectKeyOf(level.json), level.json.project, describeLevel(level));
  }
  for (const bad of [undefined, {}, { project: '' }, { project: 42 }]) {
    assert.equal(projectKeyOf(bad), null, `projectKeyOf(${JSON.stringify(bad)}) should be null`);
  }
});

test('every level the loader lists carries a non-empty project, checked here not on the win screen', async () => {
  const { projectKeyOf } = await importProjects();
  // packages/levels/src/schema.js requires `project` since 2026-09-13, so this is the second
  // guard rather than the only one — but it is the one that speaks for the win screen, which is
  // what goes wrong when a level is authored without one.
  const levels = everyLevel();
  assert.ok(levels.length >= 5, `the loader lists only ${levels.length} levels`);
  for (const level of levels) {
    const key = projectKeyOf(level.json);
    assert.equal(typeof key, 'string', `${describeLevel(level)} carries no project key`);
    assert.ok(key.length > 0, `${describeLevel(level)} carries an empty project key`);
  }
});

test('every png illustrations.js requires exists on disk, with its @2x and @3x siblings', () => {
  const code = readIllustrations();
  const paths = requirePathsIn(code);
  // Two per project, empty and done. Zero means the file is no longer a literal of require() calls,
  // and this test would otherwise pass by finding nothing to check.
  assert.ok(paths.length >= 2, `illustrations.js names only ${paths.length} require() paths`);
  for (const path of paths) {
    assert.ok(path.startsWith('./'), `require('${path}') is not relative to src/art`);
    assert.ok(path.endsWith('.png'), `require('${path}') is not a .png`);
    for (const sibling of densitySiblings(path)) {
      assert.ok(
        existsSync(new URL(sibling, ART_DIR)),
        `illustrations.js requires ${path}, but ${sibling} is missing from apps/mobile/src/art/`,
      );
    }
  }
});

test('every project illustrations.js maps is a project some real level carries', () => {
  const keys = projectKeysIn(readIllustrations());
  assert.ok(keys.length >= 1, 'illustrations.js maps no project at all');
  const known = new Set(everyLevel().map(({ json }) => json.project));
  for (const key of keys) {
    assert.ok(
      known.has(key),
      `illustrations.js maps '${key}', which no level carries — levels name ${[...known]
        .sort()
        .join(', ')}`,
    );
  }
});

test('every level that actually ships has an illustration filed under its project', () => {
  // The complement of the test above, and the one that makes the win screen's promise real. The
  // subset check alone is satisfied by a map wired to any level at all: point coaster_olive's two
  // pngs at ring_coaster and every check so far still passes, while book 1 level 1 finishes with
  // nothing to draw. Development boards are exempt — they never reach a player, and a null from
  // illustrationFor is the documented answer for a project with no art.
  const shipped = listLevels();
  assert.ok(shipped.length >= 1, 'no level ships yet, so the win screen has nothing to illustrate');
  const mapped = new Set(projectKeysIn(readIllustrations()));
  for (const summary of shipped) {
    const key = loadLevel(summary.id).project;
    assert.ok(
      mapped.has(key),
      `level ${summary.id} (${summary.name}) ships with project '${key}', which illustrations.js ` +
        `does not map — it maps ${[...mapped].sort().join(', ')}`,
    );
  }
});
