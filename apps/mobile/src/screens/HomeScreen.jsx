import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { COLORS, ENGINE_VERSION } from '@hooked/engine';
import { listLevels } from '@hooked/levels';
import { PALETTE, CREAM } from '../art/palette';
import { navigate } from '../nav';
import { newSeed } from '../game/sandbox';
import { API_BASE_URL } from '../config';

// Phase 0 hello world, now with a way into the phase-2 board. Proves the app boots on a phone,
// resolves the workspace packages through Metro, and draws the six placeholder yarn balls in
// landscape. The Room replaces it as the home screen in phase 6.
const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const onPlay = (board) => () => {
    const seed = newSeed();
    console.log(`[play] ${board} board, seed ${seed}`);
    navigate('Play', { seed, board });
  };
  return (
    <View style={[styles.screen, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Text style={styles.title}>Yarn Over</Text>
      <Text style={styles.subtitle}>A crochet match-3 · phase 3</Text>
      <View style={styles.palette}>
        {COLORS.map((color) => (
          <View
            key={color}
            accessibilityLabel={color}
            style={[styles.ball, { backgroundColor: PALETTE[color] }]}
          />
        ))}
      </View>
      <View style={styles.playRow}>
        <Pressable
          onPress={onPlay('frog')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.play, pressed && styles.playPressed]}
        >
          <Text style={styles.playText}>Play</Text>
        </Pressable>
        <Pressable
          onPress={onPlay('hook')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.play, styles.playHook, pressed && styles.playPressed]}
        >
          <Text style={styles.playText}>Play hook</Text>
        </Pressable>
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
  playRow: { flexDirection: 'row', gap: 12 },
  play: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 22,
    backgroundColor: PALETTE.rust,
  },
  playHook: { backgroundColor: PALETTE.lavender },
  playPressed: { opacity: 0.8 },
  playText: { color: CREAM, fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 12, color: PALETTE.cocoa, opacity: 0.6 },
});

export default HomeScreen;
