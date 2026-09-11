import { multiplierFor, scoreForClear } from '../src/score.js';

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
