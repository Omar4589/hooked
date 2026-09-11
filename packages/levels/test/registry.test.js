import { LEVEL_FORMAT_VERSION, listLevels } from '../src/index.js';

test('the registry is empty before phase 4', () => {
  expect(listLevels()).toEqual([]);
  expect(LEVEL_FORMAT_VERSION).toBe(1);
});
