import { parseArgs, USAGE } from '../src/cli.js';

test('defaults and full form', () => {
  expect(parseArgs(['level.json'])).toEqual({
    file: 'level.json',
    seed: null,
    moves: null,
    delay: 0,
    quiet: false,
    stitch: false,
    help: false,
  });
  expect(
    parseArgs([
      'fixtures/a.json',
      '--seed',
      'abc',
      '--moves',
      '5',
      '--delay',
      '250',
      '--quiet',
      '--stitch',
    ]),
  ).toEqual({
    file: 'fixtures/a.json',
    seed: 'abc',
    moves: 5,
    delay: 250,
    quiet: true,
    stitch: true,
    help: false,
  });
});

test('the seed stays a string, even when numeric', () => {
  expect(parseArgs(['a.json', '--seed', '42']).seed).toBe('42');
});

test('help needs no file', () => {
  expect(parseArgs(['--help']).help).toBe(true);
  expect(parseArgs(['-h']).help).toBe(true);
  expect(USAGE).toMatch(/play\.js/);
});

test('usage errors: missing file, unknown option, missing or bad values, extra argument', () => {
  expect(parseArgs([])).toEqual({ error: 'a level or fixture JSON path is required' });
  expect(parseArgs(['a.json', '--loud'])).toEqual({ error: 'unknown option --loud' });
  expect(parseArgs(['a.json', '--seed'])).toEqual({ error: '--seed needs a value' });
  expect(parseArgs(['a.json', '--seed', '--quiet'])).toEqual({ error: '--seed needs a value' });
  expect(parseArgs(['a.json', '--moves', 'ten'])).toEqual({
    error: '--moves needs a non-negative integer',
  });
  expect(parseArgs(['a.json', '--delay', '-5'])).toEqual({
    error: '--delay needs a non-negative integer',
  });
  expect(parseArgs(['a.json', 'b.json'])).toEqual({ error: 'unexpected argument b.json' });
});
