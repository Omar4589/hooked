import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgAst } from 'react-native-svg';
import Constants from 'expo-constants';
import { COLORS, ENGINE_VERSION } from '@hooked/engine';
import { listDevLevels, listLevels } from '@hooked/levels';
import { PALETTE, CREAM } from '../art/palette';
import { spriteFor } from '../art/sprites';
import { FONT } from '../art/type';
import { navigate } from '../nav';
import { newSeed } from '../game/seed';
import { API_BASE_URL } from '../config';

// How big the six yarn balls are drawn here. It goes to SvgAst as `override`, which is what puts
// width and height on the <Svg>; the ball is on a 100x100 viewBox and brings its own contact
// shadow, so the row needs no shadow style of its own.
const BALL = 56;

// Phase 0 hello world, now with a way into every level the loader knows. Proves the app boots
// on a phone, resolves the workspace packages through Metro, loads Fredoka, and draws the six
// yarn balls from the art layer in landscape. The development boards are listed in development
// only; the Room replaces this screen as the home screen in phase 6.
const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const levels = [...listLevels(), ...(__DEV__ ? listDevLevels() : [])];
  const onPlay = (levelId) => () => {
    const seed = newSeed();
    console.log(`[play] level ${levelId}, seed ${seed}`);
    navigate('Play', { levelId, seed });
  };
  return (
    <View style={[styles.screen, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Text style={styles.title}>Yarn Over</Text>
      <Text style={styles.subtitle}>A crochet match-3 · phase 5 · real yarn</Text>
      <View style={styles.palette}>
        {COLORS.map((color) => (
          // The label stays on the wrapping View: SvgAst takes an ast and an override and passes
          // nothing else through, so a prop set on it would go nowhere.
          <View key={color} accessibilityLabel={color}>
            <SvgAst ast={spriteFor({ color })} override={{ width: BALL, height: BALL }} />
          </View>
        ))}
      </View>
      <View style={styles.playRow}>
        {levels.map((level) => (
          <Pressable
            key={level.id}
            onPress={onPlay(level.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.play, pressed && styles.playPressed]}
          >
            <Text style={styles.playText}>{level.name}</Text>
          </Pressable>
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
  title: { fontSize: 40, fontFamily: FONT.bold, color: PALETTE.cocoa },
  subtitle: { fontSize: 16, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.8 },
  palette: { flexDirection: 'row', gap: 14, marginVertical: 12 },
  playRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  play: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: PALETTE.rust,
  },
  playPressed: { opacity: 0.8 },
  playText: { color: CREAM, fontSize: 16, fontFamily: FONT.bold },
  meta: { fontSize: 12, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.6 },
});

export default HomeScreen;
