import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { navigationRef } from './src/nav';
import { CREAM } from './src/art/palette';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

// One native stack for the whole game (DESIGN.md §11 Screens). Full-screen scenes are plain
// screens; the level card, Continue and Result arrive as modal screens in phase 4. Gesture
// root for the board's swipes, safe-area insets for the landscape HUD, status bar hidden.
const App = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar hidden />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: CREAM } }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

export default App;
