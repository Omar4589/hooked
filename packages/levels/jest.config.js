// Native ESM package: Jest runs with NODE_OPTIONS=--experimental-vm-modules (see the test
// script) and no transform. watchman is off because Jest gains nothing from it on two
// small packages and a broken global watchman must not break `npm test`.
export default {
  testEnvironment: 'node',
  transform: {},
  watchman: false,
  roots: ['<rootDir>/src', '<rootDir>/test'],
};
