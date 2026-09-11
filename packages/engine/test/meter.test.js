import { parseBoard } from '../src/text.js';
import { chargeForWave, dropCandidates, dropPiece, meterState } from '../src/meter.js';

const P = (x, y) => ({ x, y });
const wave = (...sources) => sources.map((list) => ({ sources: list }));

test('each special charges at its own rate, and a rip charges nothing', () => {
  expect(chargeForWave(wave(['puff']))).toBe(1);
  expect(chargeForWave(wave(['bobble']))).toBe(2);
  expect(chargeForWave(wave(['popcorn']))).toBe(3);
  expect(chargeForWave(wave(['yarnbomb']))).toBe(4);
  expect(chargeForWave(wave([]))).toBe(0);
});

test('two or more charging specials in one wave add the multi bonus once', () => {
  expect(chargeForWave(wave(['puff'], ['puff']))).toBe(4);
  expect(chargeForWave(wave(['puff'], ['puff'], ['puff']))).toBe(5);
  expect(chargeForWave(wave(['bobble', 'bobble']))).toBe(6); // one combo step, two specials
});

test('the hook fires but never charges, and never earns the bonus on its own', () => {
  expect(chargeForWave(wave(['hook']))).toBe(0);
  expect(chargeForWave(wave(['hook'], ['hook']))).toBe(0);
  expect(chargeForWave(wave(['hook'], ['puff']))).toBe(1); // one charging special: no bonus
  expect(chargeForWave(wave(['hook'], ['puff'], ['bobble']))).toBe(5); // 1 + 2 + 2
});

test('the meter state is the shape the HUD reads, fresh every call', () => {
  expect(meterState('none', 7)).toEqual({ kind: 'none' });
  expect(meterState('frog', 0)).toEqual({ kind: 'frog', charge: 0, full: 10 });
  expect(meterState('hook', 6)).toEqual({ kind: 'hook', charge: 6, full: 10 });
  expect(meterState('frog', 1)).not.toBe(meterState('frog', 1));
});

test('a drop only ever replaces a plain yarn ball', () => {
  const board = parseBoard(['o. oP m.', 'oK F. *.', '__ .. b.']);
  expect(dropCandidates(board)).toEqual([P(0, 0), P(2, 0), P(2, 2)]);
  expect(dropCandidates(parseBoard(['oP F. *.']))).toEqual([]);
});

test('the frog drops colorless; the hook rides the ball it replaces and keeps its colour', () => {
  expect(dropPiece('frog', { kind: 'yarn', color: 'rust' })).toEqual({ kind: 'frog' });
  expect(dropPiece('hook', { kind: 'yarn', color: 'rust' })).toEqual({
    kind: 'yarn',
    color: 'rust',
    special: 'hook',
  });
  // keeping the colour is what stops a drop completing a match on a settled board
  expect(dropPiece('hook', { kind: 'yarn', color: 'lavender' }).color).toBe('lavender');
});
