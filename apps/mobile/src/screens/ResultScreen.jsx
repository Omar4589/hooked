// The end of a level (docs/DESIGN.md §6): "Fastened off!" with what it paid, or "Ran out of
// yarn." A transparent modal, so the board it just finished stays visible underneath. The
// Continue prompt belongs with lives and stitch markers in phase 6; until then losing offers
// another go or the way home, and the coin pile and confetti arrive with the art in phase 5.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CREAM, PALETTE } from '../art/palette';
import { goHome, replayLevel } from '../nav';
import { newSeed } from '../game/seed';

const ResultScreen = ({ route }) => {
  const { won, score, coins, levelId } = route.params;
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{won ? 'Fastened off!' : 'Ran out of yarn.'}</Text>
        {won ? (
          <View style={styles.figures}>
            <Text style={styles.figure}>{score.toLocaleString()}</Text>
            <Text style={styles.label}>score</Text>
            <Text style={styles.figure}>{coins.toLocaleString()}</Text>
            <Text style={styles.label}>coins</Text>
          </View>
        ) : (
          <Text style={styles.label}>The goals were not finished in time.</Text>
        )}
        <View style={styles.buttons}>
          <Pressable
            onPress={() => replayLevel(levelId, newSeed())}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.home, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 42, 36, 0.45)',
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 34,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: PALETTE.cocoa },
  figures: { alignItems: 'center' },
  figure: { fontSize: 20, fontWeight: '700', color: PALETTE.cocoa },
  label: { fontSize: 12, color: PALETTE.cocoa, opacity: 0.7, marginBottom: 4 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 6 },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: PALETTE.rust,
  },
  home: { backgroundColor: PALETTE.cocoa },
  pressed: { opacity: 0.8 },
  buttonText: { color: CREAM, fontSize: 16, fontWeight: '700' },
});

export default ResultScreen;
