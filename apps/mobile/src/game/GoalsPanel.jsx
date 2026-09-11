// The goals panel (docs/DESIGN.md §11): the level at the top, what it still needs in the
// middle, the move counter at the bottom. The icons are placeholder shapes in the same spirit
// as the letters on the specials — phase 5 replaces every one of them with the real art.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CREAM, PALETTE, STITCH_FILL, STITCH_LINE, TANGLE_FILL, TANGLE_LINE } from '../art/palette';

/** How wide the panel is; the board fits into what is left (§11 "the panels shrink the arena"). */
export const GOALS_WIDTH = 116;

const ICON = 22;

const GoalIcon = ({ goal }) => {
  if (goal.type === 'collect') {
    return <View style={[styles.icon, styles.round, { backgroundColor: PALETTE[goal.color] }]} />;
  }
  if (goal.type === 'stitch') {
    return <View style={[styles.icon, styles.square]} />;
  }
  if (goal.type === 'beads') {
    return <View style={[styles.icon, styles.bead]} />;
  }
  if (goal.type === 'buried') {
    return (
      <View style={[styles.icon, styles.round, styles.button]}>
        <View style={styles.buttonHole} />
      </View>
    );
  }
  if (goal.blocker === 'moth') {
    return (
      <View style={[styles.icon, styles.moth]}>
        <Text style={styles.mothMark}>M</Text>
      </View>
    );
  }
  if (goal.blocker === 'knot') {
    return <View style={[styles.icon, styles.round, styles.knot]} />;
  }
  return <View style={[styles.icon, styles.tangle]} />;
};

/**
 * @param {object} props
 * @param {object|null} props.hud  the engine's state, as PlayScreen keeps it
 */
const GoalsPanel = memo(({ hud }) => (
  <View style={styles.panel}>
    <Text style={styles.level}>{hud === null ? '' : `Level ${hud.levelId}`}</Text>
    <Text style={styles.name} numberOfLines={2}>
      {hud === null ? '' : hud.name}
    </Text>
    <View style={styles.goals}>
      {(hud?.goals ?? []).map((goal, i) => (
        <View key={`${goal.type}-${goal.color ?? goal.blocker ?? i}`} style={styles.goal}>
          <GoalIcon goal={goal} />
          <View>
            <Text style={styles.remaining}>{goal.remaining}</Text>
            <Text style={styles.total}>of {goal.total}</Text>
          </View>
        </View>
      ))}
    </View>
    <View style={styles.moves}>
      <Text style={styles.movesCount}>{hud === null ? '' : hud.moves}</Text>
      <Text style={styles.movesLabel}>moves</Text>
    </View>
  </View>
));

const styles = StyleSheet.create({
  panel: { width: GOALS_WIDTH, paddingHorizontal: 8, paddingVertical: 4 },
  level: { fontSize: 15, fontWeight: '800', color: PALETTE.cocoa },
  name: { fontSize: 12, color: PALETTE.cocoa, opacity: 0.7, marginBottom: 10 },
  goals: { gap: 10 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center' },
  round: { borderRadius: ICON / 2 },
  square: {
    borderWidth: 2,
    borderColor: STITCH_LINE,
    backgroundColor: STITCH_FILL,
    borderRadius: 3,
  },
  tangle: {
    borderWidth: 2,
    borderColor: TANGLE_LINE,
    backgroundColor: TANGLE_FILL,
    borderRadius: 5,
  },
  knot: { backgroundColor: PALETTE.rust, borderWidth: 3, borderColor: PALETTE.cocoa },
  moth: { backgroundColor: PALETTE.cocoa, transform: [{ rotate: '45deg' }] },
  mothMark: { color: CREAM, fontSize: 11, fontWeight: '800', transform: [{ rotate: '-45deg' }] },
  bead: {
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: PALETTE.cocoa,
    transform: [{ rotate: '45deg' }],
  },
  button: { backgroundColor: CREAM, borderWidth: 2, borderColor: PALETTE.cocoa },
  buttonHole: { width: 5, height: 5, borderRadius: 3, backgroundColor: PALETTE.cocoa },
  remaining: { fontSize: 17, fontWeight: '800', color: PALETTE.cocoa },
  total: { fontSize: 10, color: PALETTE.cocoa, opacity: 0.6 },
  moves: { marginTop: 'auto', paddingTop: 12 },
  movesCount: { fontSize: 26, fontWeight: '800', color: PALETTE.cocoa },
  movesLabel: { fontSize: 11, color: PALETTE.cocoa, opacity: 0.6 },
});

export default GoalsPanel;
