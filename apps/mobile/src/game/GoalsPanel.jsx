// The goals panel (docs/DESIGN.md §11): the level at the top, what it still needs in the
// middle, the move counter at the bottom. The rows now show the real 24x24 icons — one parsed
// AST per picture, shared out of ../art/sprites — and every label is in Fredoka.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgAst } from 'react-native-svg';
import { PALETTE } from '../art/palette';
import { GOAL_ICON } from '../art/sprites';
import { FONT } from '../art/type';

/** How wide the panel is; the board fits into what is left (§11 "the panels shrink the arena"). */
export const GOALS_WIDTH = 116;

/**
 * How big a goal icon is drawn. The size goes through SvgAst's `override`, which is what lands
 * width and height on the <Svg>; the icon's own 24x24 viewBox rides along in the AST, so this is
 * all a row has to say. One frozen object rather than one per render — SvgAst only spreads it.
 */
const ICON = Object.freeze({ width: 22, height: 22 });

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
          {/* GOAL_ICON keys on the type and then on the colour or the blocker, and always comes
              back with a picture — a collect goal with no colour and a clear goal with no
              blocker each have a stand-in there, so no row is ever a count on its own. */}
          <SvgAst ast={GOAL_ICON(goal)} override={ICON} />
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

// Every label names a family and never a fontWeight, for the reason ../art/type spells out.
// `flex: 1` gives the panel the whole left column, which is what makes the move counter's
// `marginTop: 'auto'` pin it to the bottom with the dial below it, not under the last goal.
const styles = StyleSheet.create({
  panel: { width: GOALS_WIDTH, flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  level: { fontSize: 15, fontFamily: FONT.bold, color: PALETTE.cocoa },
  name: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: PALETTE.cocoa,
    opacity: 0.7,
    marginBottom: 10,
  },
  goals: { gap: 10 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remaining: { fontSize: 17, fontFamily: FONT.bold, color: PALETTE.cocoa },
  total: { fontSize: 10, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.6 },
  moves: { marginTop: 'auto', paddingTop: 12 },
  movesCount: { fontSize: 26, fontFamily: FONT.bold, color: PALETTE.cocoa },
  movesLabel: { fontSize: 11, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.6 },
});

export default GoalsPanel;
