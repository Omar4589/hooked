// One cell of the board beneath the pieces: the stitch square the level is making, the tangle
// sitting on it, the button buried under that tangle, or a moth. Like Piece it holds no state
// and runs no effects — it samples its own track against the board's clock on the UI thread —
// and like Piece it is deliberately not art: phase 5 replaces every shape here with the drawn
// tile (docs/DESIGN.md §16).

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { CREAM, PALETTE, STITCH_FILL, STITCH_LINE, TANGLE_FILL, TANGLE_LINE } from '../art/palette';
import { sampleCell } from './animate';

/** The most layers a tangle can have (docs/DESIGN.md §5). */
const LAYERS = [1, 2, 3];

const clamp01 = (v) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * @param {object} props
 * @param {number} props.tangle    layers left, 0 for none
 * @param {boolean} props.moth
 * @param {number} props.stitch    unstitched layers left
 * @param {boolean} props.buried   a button under the tangle
 * @param {boolean} props.stitched is this cell part of the level's pattern at all
 * @param {number} props.cell      cell size in points
 * @param {number} props.ix
 * @param {number} props.iy
 * @param {import('./timings').CellTrack} [props.track]
 * @param {{ value: number }} props.clock
 */
const Cell = memo(({ tangle, moth, stitch, buried, stitched, cell, ix, iy, track, clock }) => {
  const rest = {
    x: 0,
    y: 0,
    scale: 1,
    layers: tangle,
    moth: moth ? 1 : 0,
    stitch,
    button: buried ? 1 : 0,
  };
  const shown = useDerivedValue(() =>
    track === undefined ? rest : sampleCell(track, clock.value - track.base),
  );

  const box = useAnimatedStyle(() => ({
    transform: [
      { translateX: shown.value.x * cell },
      { translateY: shown.value.y * cell },
      { scale: shown.value.scale },
    ],
  }));
  // A square is stitched when nothing is left to stitch, so the fill and the outlines cross over.
  const fill = useAnimatedStyle(() => ({ opacity: 1 - clamp01(shown.value.stitch) }));
  const outer = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.stitch) }));
  const inner = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.stitch - 1) }));
  const mothStyle = useAnimatedStyle(() => ({
    opacity: clamp01(shown.value.moth),
    transform: [{ scale: clamp01(shown.value.moth) }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.button) }));

  const layerInset = Math.max(2, Math.round(cell * 0.1));
  const button = Math.round(cell * 0.24);
  const mothSize = Math.round(cell * 0.5);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.cell, { left: ix * cell, top: iy * cell, width: cell, height: cell }, box]}
    >
      {stitched ? (
        <>
          <Animated.View style={[styles.square, styles.stitched, fill]} />
          <Animated.View style={[styles.square, styles.unstitched, outer]} />
          <Animated.View
            style={[styles.square, styles.unstitched, { margin: layerInset + 2 }, inner]}
          />
        </>
      ) : null}
      {LAYERS.map((layer) => (
        <TangleLayer
          key={layer}
          layer={layer}
          inset={2 + (layer - 1) * layerInset}
          size={cell}
          shown={shown}
        />
      ))}
      <Animated.View
        style={[
          styles.button,
          { width: button, height: button, borderRadius: button / 2, right: 3, bottom: 3 },
          buttonStyle,
        ]}
      />
      <Animated.View style={[styles.mothBox, mothStyle]}>
        <View style={[styles.moth, { width: mothSize, height: mothSize }]}>
          <Text style={[styles.mothMark, { fontSize: Math.round(mothSize * 0.5) }]}>M</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

/** One layer of tangle, with its count. The innermost visible one carries the numeral. */
const TangleLayer = memo(({ layer, inset, size, shown }) => {
  const style = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.layers - (layer - 1)) }));
  const count = useAnimatedStyle(() => ({
    opacity: Math.round(shown.value.layers) === layer ? 1 : 0,
  }));
  return (
    <Animated.View
      style={[
        styles.square,
        styles.tangle,
        { margin: inset, borderRadius: Math.round(size * 0.12) },
        style,
      ]}
    >
      <Animated.Text style={[styles.count, { fontSize: Math.round(size * 0.34) }, count]}>
        {layer}
      </Animated.Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  square: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 2 },
  unstitched: { borderWidth: 2, borderColor: STITCH_LINE, borderRadius: 3 },
  stitched: { backgroundColor: STITCH_FILL, borderRadius: 3 },
  tangle: {
    backgroundColor: TANGLE_FILL,
    borderWidth: 2,
    borderColor: TANGLE_LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { color: PALETTE.cocoa, fontWeight: '800' },
  button: {
    position: 'absolute',
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: PALETTE.cocoa,
  },
  mothBox: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // a diamond: never mistakable for a ball (a circle) or a tangle (a rounded square)
  moth: {
    backgroundColor: PALETTE.cocoa,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mothMark: { color: CREAM, fontWeight: '800', transform: [{ rotate: '-45deg' }] },
});

export default Cell;
