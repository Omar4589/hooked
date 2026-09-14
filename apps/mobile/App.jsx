import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
// useFonts comes from expo-font, not from the font package's own generated re-export of it: the
// first-party hook seeds itself from the already-loaded set (no second null render on fast refresh)
// and drops its result if the tree unmounts first. The faces themselves are the package's exports.
import { useFonts } from 'expo-font';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { navigationRef } from './src/nav';
import { CREAM } from './src/art/palette';
import HomeScreen from './src/screens/HomeScreen';
import PlayScreen from './src/screens/PlayScreen';
import ResultScreen from './src/screens/ResultScreen';

const Stack = createNativeStackNavigator();

// Hold the splash from module scope, before the first render, so there is no cream flash between
// the splash going and the fonts arriving. It returns a promise that rejects harmlessly if the
// splash is already gone (a fast reload), hence the swallowed catch.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Fredoka is loaded at RUNTIME with useFonts, not through the expo-font config plugin's `fonts`
// array. The plugin copies the .ttf files into the native projects, which is a native change: it
// needs a new dev-client build and it moves the fingerprint runtime version, orphaning every OTA
// channel. useFonts is also the only one of the two that works in Expo Go, which is where the game
// is played today. The keys below become the family names — see src/art/type.js.
const FACES = {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
};

// One native stack for the whole game (DESIGN.md §11 Screens). Full-screen scenes are plain
// screens; Result is a modal over the level it belongs to, and the Continue prompt joins it in
// phase 6. The level card is deliberately not a route: it is a step inside PlayScreen, because
// only a sibling of the board can hold its mount back until a frame has been painted (§11). Gesture root for the board's swipes, safe-area insets for the
// landscape HUD, status bar hidden.
const App = () => {
  const [loaded, error] = useFonts(FACES);

  // `error` counts as done on purpose: a font that fails to download must not strand the player on
  // a splash screen forever. The app renders on the system font instead, which is ugly and
  // playable. Nothing to clean up — hideAsync is a one-shot native call, not a subscription — but
  // it can reject if the splash is already hidden, so the rejection is swallowed the same way.
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar hidden />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: CREAM } }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            {/* gestureEnabled: false so iOS's edge swipe cannot pop the screen mid-move. */}
            <Stack.Screen name="Play" component={PlayScreen} options={{ gestureEnabled: false }} />
            {/* transparentModal keeps the finished board visible; the per-screen contentStyle is
                what overrides the navigator's cream background, which would otherwise hide it. */}
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{
                presentation: 'transparentModal',
                gestureEnabled: false,
                animation: 'fade',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
