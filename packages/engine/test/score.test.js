import { multiplierFor, scoreForClear, scoreForFire } from '../src/score.js';

test('the cascade multiplier climbs from one and caps at five', () => {
  expect([1, 2, 3, 4, 5, 6, 7].map(multiplierFor)).toEqual([1, 2, 3, 4, 5, 5, 5]);
  expect(multiplierFor(0)).toBe(1);
});

test('cleared yarn scores twenty times the multiplier; specials add a flat bonus', () => {
  const three = [{}, {}, {}];
  expect(scoreForClear({ cleared: three, created: [], cascade: 1 })).toBe(60);
  expect(scoreForClear({ cleared: three, created: [], cascade: 3 })).toBe(180);
  expect(scoreForClear({ cleared: three, created: [], cascade: 9 })).toBe(300);
  const puff = [{ pos: {}, piece: { kind: 'yarn', color: 'olive', special: 'puff' } }];
  expect(scoreForClear({ cleared: [{}, {}, {}, {}], created: puff, cascade: 1 })).toBe(140);
  expect(scoreForClear({ cleared: [{}, {}, {}, {}], created: puff, cascade: 4 })).toBe(380);
  const bomb = [{ pos: {}, piece: { kind: 'yarn', color: 'olive', special: 'yarnbomb' } }];
  expect(scoreForClear({ cleared: Array(7).fill({}), created: bomb, cascade: 1 })).toBe(640);
});

test('a firing scores its balls at the cascade multiplier, and a rip its flat bonus', () => {
  const balls = (n) => Array.from({ length: n }, () => ({ kind: 'yarn', color: 'olive' }));
  expect(scoreForFire({ type: 'blast' }, balls(5), 1)).toBe(100);
  expect(scoreForFire({ type: 'blast' }, balls(5), 3)).toBe(300);
  expect(scoreForFire({ type: 'blast' }, balls(5), 9)).toBe(500); // capped at x5
  expect(scoreForFire({ type: 'blast' }, [], 1)).toBe(0);
  expect(scoreForFire({ type: 'rip' }, balls(3), 1)).toBe(60 + 500);
  // the frog it consumed is not a ball and scores nothing
  expect(scoreForFire({ type: 'rip' }, [...balls(3), { kind: 'frog' }], 1)).toBe(60 + 500);
});
