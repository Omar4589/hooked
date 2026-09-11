// The level screen: safe-area insets around a measured arena, the board centred in it. The
// arena is measured rather than read from the window (docs/DESIGN.md §11), so the phase-4 goals
// and booster panels shrink it without a layout rewrite, and Android's edge-to-edge system bars
// take their space in landscape instead of covering the board.

import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CREAM, PALETTE } from '../art/palette';
import { goBack } from '../nav';
import Board from '../game/Board';
import { boardFor, newSeed } from '../game/sandbox';

const PlayScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const seedRef = useRef(route?.params?.seed ?? newSeed());
  const level = boardFor(route?.params?.board);
  const [arena, setArena] = useState({ width: 0, height: 0 });

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    const next = { width: Math.floor(width), height: Math.floor(height) };
    setArena((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
  }, []);

  return (
    <View style={styles.screen}>
      <View
        onLayout={onLayout}
        style={[
          styles.arena,
          {
            marginTop: insets.top,
            marginBottom: insets.bottom,
            marginLeft: insets.left,
            marginRight: insets.right,
          },
        ]}
      >
        {arena.width > 0 && arena.height > 0 ? (
          <Board key={seedRef.current} level={level} seed={seedRef.current} arena={arena} />
        ) : null}
      </View>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        style={[styles.home, { top: insets.top + 8, left: insets.left + 8 }]}
      >
        <Text style={styles.homeText}>Home</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  arena: { flex: 1 },
  home: { position: 'absolute', paddingVertical: 4, paddingHorizontal: 8 },
  homeText: { fontSize: 14, color: PALETTE.cocoa, opacity: 0.7 },
});

export default PlayScreen;
