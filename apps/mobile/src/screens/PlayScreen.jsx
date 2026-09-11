// The level screen: the §11 landscape row, left to right — the goals panel, the board, and the
// booster panel that arrives in phase 6. The centre column is measured rather than read from
// the window (docs/DESIGN.md §11), so the panels shrink the arena and the board re-fits with no
// layout rewrite; nothing reserves a gutter.

import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadLevel } from '@hooked/levels';
import Board from '../game/Board';
import GoalsPanel from '../game/GoalsPanel';
import { CREAM, PALETTE } from '../art/palette';
import { goHome, navigate } from '../nav';

/** The booster panel of §11: four slots, empty until phase 6. */
const BOOSTER_WIDTH = 72;

const PlayScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const { levelId, seed } = route.params;
  const level = useMemo(() => loadLevel(levelId), [levelId]);
  const [arena, setArena] = useState({ width: 0, height: 0 });
  const [hud, setHud] = useState(null);

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    const next = { width: Math.floor(width), height: Math.floor(height) };
    setArena((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
  }, []);

  // Two readouts per move: the counter the moment the move is accepted, everything else when
  // the board settles. Both land in one React commit beside Board's own.
  const onState = useCallback(
    (state, settled) =>
      setHud((previous) =>
        settled
          ? {
              levelId: state.level.id,
              name: state.level.name,
              goals: state.goals,
              moves: state.moves,
            }
          : { ...previous, moves: state.moves },
      ),
    [],
  );
  const onEnd = useCallback(
    (state) =>
      navigate('Result', {
        won: state.status === 'won',
        score: state.score,
        coins: state.coins,
        levelId,
      }),
    [levelId],
  );

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.row,
          {
            marginTop: insets.top,
            marginBottom: insets.bottom,
            marginLeft: insets.left,
            marginRight: insets.right,
          },
        ]}
      >
        <View style={styles.left}>
          <Pressable onPress={goHome} hitSlop={12} accessibilityRole="button" style={styles.home}>
            <Text style={styles.homeText}>Home</Text>
          </Pressable>
          <GoalsPanel hud={hud} />
        </View>
        <View onLayout={onLayout} style={styles.arena}>
          {arena.width > 0 && arena.height > 0 ? (
            <Board
              key={seed}
              level={level}
              seed={seed}
              arena={arena}
              onState={onState}
              onEnd={onEnd}
            />
          ) : null}
        </View>
        <View style={styles.boosters} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  row: { flex: 1, flexDirection: 'row' },
  left: { paddingTop: 6 },
  home: { paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start' },
  homeText: { fontSize: 14, color: PALETTE.cocoa, opacity: 0.7 },
  arena: { flex: 1 },
  boosters: { width: BOOSTER_WIDTH },
});

export default PlayScreen;
