// One yarn ball: a colored circle that samples its own track against the board's clock on the
// UI thread. It holds no state and runs no effects, so a move costs one React commit and the
// JS thread is free while the board animates. Real art replaces the circle in phase 5.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { CREAM, PALETTE, ringFor } from '../art/palette';
import { sampleTrack } from './animate';

/** How much of its cell a ball fills. */
const PIECE_RATIO = 0.84;

/**
 * Which special a ball carries, as one letter. Deliberately not art: phase 5 replaces every one
 * of these with the real overlay, and until then a letter is the clearest way to tell a Popcorn
 * from a Yarn Bomb on a board of plain circles.
 */
const MARK = { puff: 'P', bobble: 'B', popcorn: 'C', yarnbomb: 'Y', hook: 'H', frog: 'F' };

/**
 * @param {object} props
 * @param {string} [props.color]      yarn color; the frog has none and draws in cocoa
 * @param {string} [props.special]    marks a ball that carries a special (placeholder, phase 5)
 * @param {string} [props.kind]       'yarn', 'frog' or 'bead'
 * @param {boolean} [props.knotted]   a ball tied in place, which cannot be swapped (§5)
 * @param {number} props.cell         cell size in points
 * @param {number} props.ix           where it sits when it has nothing to do
 * @param {number} props.iy
 * @param {import('./timings').Track} [props.track]  what it does this move, if anything
 * @param {{ value: number }} props.clock  the board's move clock, in milliseconds
 */
const Piece = memo(({ color, special, kind, knotted, cell, ix, iy, track, clock }) => {
  const animated = useAnimatedStyle(() => {
    const at =
      track === undefined
        ? { x: ix, y: iy, scale: 1, opacity: 1 }
        : sampleTrack(track, clock.value - track.base);
    return {
      opacity: at.opacity,
      transform: [{ translateX: at.x * cell }, { translateY: at.y * cell }, { scale: at.scale }],
    };
  });

  const size = Math.round(cell * PIECE_RATIO);
  const inset = (cell - size) / 2;
  const mark = special === undefined ? MARK[kind] : MARK[special];
  const knob = Math.round(size * 0.26);

  // A bead is not a ball: it never matches and nothing destroys it, so it is a different shape
  // rather than a circle with a letter on it.
  if (kind === 'bead') {
    const body = Math.round(size * 0.62);
    const dot = Math.round(size * 0.18);
    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.piece, { left: inset, top: inset, width: size, height: size }, animated]}
      >
        <View style={styles.centre}>
          <View style={[styles.bead, { width: body, height: body }]}>
            <View style={[styles.beadDot, { width: dot, height: dot, borderRadius: dot / 2 }]} />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          left: inset,
          top: inset,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: PALETTE[color] ?? PALETTE.cocoa,
          borderWidth: knotted ? 3 : 0,
          borderColor: ringFor(color),
        },
        animated,
      ]}
    >
      {mark === undefined ? null : (
        <>
          <View
            style={[styles.ring, { borderRadius: (size - 8) / 2, borderColor: ringFor(color) }]}
          />
          <Text style={[styles.mark, { color: ringFor(color), fontSize: Math.round(size * 0.44) }]}>
            {mark}
          </Text>
        </>
      )}
      {knotted ? (
        // the knot rides the outer edge, so a knotted ball carrying a special still shows both
        <View
          style={[
            styles.knot,
            {
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              top: -knob / 3,
              backgroundColor: ringFor(color),
            },
          ]}
        />
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // a diamond with a hole through it, the way a bead on a thread reads
  bead: {
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: PALETTE.cocoa,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  beadDot: { backgroundColor: PALETTE.cocoa },
  knot: { position: 'absolute', alignSelf: 'center' },
  ring: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 2 },
  mark: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: undefined,
    fontWeight: '800',
  },
});

export default Piece;
