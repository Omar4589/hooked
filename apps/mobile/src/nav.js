import { createNavigationContainerRef } from '@react-navigation/native';

// Every navigation call in the game goes through this file, so the navigator itself can be
// swapped or restructured without touching screens.
export const navigationRef = createNavigationContainerRef();

export const navigate = (name, params) => {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
};

export const goBack = () => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
};
