import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

// Every navigation call in the game goes through this file, so the navigator itself can be
// swapped or restructured without touching screens.
export const navigationRef = createNavigationContainerRef();

export const navigate = (name, params) => {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
};

export const goBack = () => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
};

/**
 * Home, with nothing above it. A modal sits on top of the screen it belongs to, so going back
 * from one would land on a level that is already over; resetting states the stack we want.
 */
export const goHome = () => {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
};

/**
 * Another go at the same level, on a fresh seed: Home underneath, one new Play on top, and the
 * finished attempt gone. A new seed also gives the route a new key, so the board remounts.
 * @param {number} levelId
 * @param {string} seed
 */
export const replayLevel = (levelId, seed) => {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'Play', params: { levelId, seed } }],
    }),
  );
};
