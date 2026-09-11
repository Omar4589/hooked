import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { COLORS, ENGINE_VERSION } from '@hooked/engine';
import { listLevels } from '@hooked/levels';
import { PALETTE, CREAM } from '../art/palette';
import { API_BASE_URL } from '../config';

// Phase 0 hello world. Proves the app boots on a phone, resolves the workspace packages
// through Metro, and draws the six placeholder yarn balls in landscape. The Room replaces
// it as the home screen in phase 6.
const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Text style={styles.title}>Hooked</Text>
      <Text style={styles.subtitle}>A crochet match-3 · phase 0</Text>
      <View style={styles.palette}>
        {COLORS.map((color) => (
          <View
            key={color}
            accessibilityLabel={color}
            style={[styles.ball, { backgroundColor: PALETTE[color] }]}
          />
        ))}
      </View>
      <Text style={styles.meta}>
        engine {ENGINE_VERSION} · {listLevels().length} levels · app {Constants.expoConfig?.version}
      </Text>
      <Text style={styles.meta}>api {API_BASE_URL}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 40, fontWeight: '700', color: PALETTE.cocoa },
  subtitle: { fontSize: 16, color: PALETTE.cocoa, opacity: 0.8 },
  palette: { flexDirection: 'row', gap: 14, marginVertical: 12 },
  ball: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  meta: { fontSize: 12, color: PALETTE.cocoa, opacity: 0.6 },
});

export default HomeScreen;
