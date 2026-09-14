import { readFileSync, readdirSync } from 'node:fs';
import {
  LEVEL_FORMAT_VERSION,
  listLevels,
  listDevLevels,
  loadLevel,
  validateLevel,
} from '../src/index.js';
import { REGISTRY } from '../src/registry.js';
import { buildCatalog } from '../src/catalog.js';

const levelsDir = new URL('../levels/', import.meta.url);

const walk = (dir, prefix = '', found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`, found);
    else if (entry.name.endsWith('.json')) found.push(`${prefix}${entry.name.slice(0, -5)}`);
  }
  return found;
};

// Book 1 level 1 is authored, so the shipped list is no longer empty: it is exactly that one
// level, and a row joins it for each of levels 2-15 (docs/LEVELS-BOOK1.md). Deliberately exact,
// because the play sequence is what a player is given and it should never grow by accident.
test('the shipped list is Book 1 level 1, and the format version is 1', () => {
  expect(listLevels()).toEqual([{ id: 1, name: 'Coaster (olive)', book: 1, hard: false }]);
  expect(LEVEL_FORMAT_VERSION).toBe(1);
});

test('shipped levels sort by id and leave hidden ones out; dev boards never ship', () => {
  const fake = (name, id, extra = {}) => ({ name, json: { id, name, book: 1, ...extra } });
  const { shipped, dev, byId } = buildCatalog([
    fake('003', 3),
    fake('007', 7, { hidden: true }),
    fake('dev/x', 9950, { book: 0 }),
    fake('001', 1, { hard: 'tricky' }),
  ]);
  expect(shipped).toEqual([
    { id: 1, name: '001', book: 1, hard: 'tricky' },
    { id: 3, name: '003', book: 1, hard: false },
  ]);
  expect(dev.map((s) => s.id)).toEqual([9950]);
  // the loader still serves a hidden level; only the list leaves it out
  expect([...byId.keys()].sort((a, b) => a - b)).toEqual([1, 3, 7, 9950]);
});

test('the dev list is the five development boards, numbered 99xx in book 0', () => {
  expect(listDevLevels().map((l) => l.id)).toEqual([9901, 9902, 9903, 9904, 9905]);
  for (const level of listDevLevels()) {
    expect({
      id: level.id,
      book: level.book,
      inRange: level.id >= 9900 && level.id <= 9999,
    }).toEqual({ id: level.id, book: 0, inRange: true });
    expect(typeof level.name).toBe('string');
  }
  expect(listDevLevels()[0]).not.toBe(listDevLevels()[0]);
});

test('every registered level validates and loads as a fresh copy, and ids are unique', () => {
  for (const { id, name } of [...listLevels(), ...listDevLevels()]) {
    const json = loadLevel(id);
    expect([json.id, json.name]).toEqual([id, name]);
    expect(loadLevel(id)).not.toBe(json);
  }
  // validateLevel is named by the file's path under levels/, which is what tells it a board is
  // a development one and may therefore have no goals
  for (const entry of REGISTRY)
    expect(validateLevel(entry.json, entry.name).id).toBe(entry.json.id);
  expect(new Set(REGISTRY.map((e) => e.json.id)).size).toBe(REGISTRY.length);
});

test('loadLevel throws on an id the registry does not know', () => {
  expect(() => loadLevel(42)).toThrow(/^loadLevel: unknown level id 42$/);
  expect(() => loadLevel('9903')).toThrow(/unknown level id/); // ids are numbers
});

test('every file under levels/ has one registry line, and every line carries the attribute', () => {
  const source = readFileSync(new URL('../src/registry.js', import.meta.url), 'utf8');
  const lines = source.split('\n').filter((l) => l.includes("from '../levels/"));
  for (const line of lines) {
    expect(line).toMatch(/^import \w+ from '\.\.\/levels\/[^']+\.json' with \{ type: 'json' \};$/);
  }
  const imported = lines.map((l) => l.match(/'\.\.\/levels\/([^']+)\.json'/)[1]).sort();
  const files = walk(levelsDir).sort();
  expect(imported).toEqual(files);
  expect(REGISTRY.map((e) => e.name).sort()).toEqual(files);
});

test('the package seals its level files behind the loader', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  expect(pkg.exports).toEqual({ '.': './src/index.js' });
});
