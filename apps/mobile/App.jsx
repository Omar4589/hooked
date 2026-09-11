import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { navigationRef } from './src/nav';
import { CREAM } from './src/art/palette';
import HomeScreen from './src/screens/HomeScreen';
import PlayScreen from './src/screens/PlayScreen';
import ResultScreen from './src/screens/ResultScreen';

const Stack = createNativeStackNavigator();

// One native stack for the whole game (DESIGN.md §11 Screens). Full-screen scenes are plain
// screens; Result is a modal over the level it belongs to, and the level card and the Continue
// prompt join it in phase 6. Gesture root for the board's swipes, safe-area insets for the
// landscape HUD, status bar hidden.
const App = () => (
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

export default App;
