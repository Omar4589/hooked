// One yarn ball: a colored circle that samples its own track against the board's clock on the
// UI thread. It holds no state and runs no effects, so a move costs one React commit and the
// JS thread is free while the board animates. Real art replaces the circle in phase 5.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PALETTE, ringFor } from '../art/palette';
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
 * @param {number} props.cell         cell size in points
 * @param {number} props.ix           where it sits when it has nothing to do
 * @param {number} props.iy
 * @param {import('./timings').Track} [props.track]  what it does this move, if anything
 * @param {{ value: number }} props.clock  the board's move clock, in milliseconds
 */
const Piece = memo(({ color, special, kind, cell, ix, iy, track, clock }) => {
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
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
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
