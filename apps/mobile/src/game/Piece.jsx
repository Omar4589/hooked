// One piece on the board — a yarn ball, a bead or the frog — drawn from the parsed art in
// ../art/sprites.js and sampling its own track against the board's clock on the UI thread. It
// holds no state and runs no effects, so a move costs one React commit and the JS thread is free
// while the board animates.
//
// The sprite fills the whole cell: every image already carries its own margin inside its 100x100
// box, so scaling it down again would margin it twice. Size goes through SvgAst's `override`;
// position stays on the Animated.View around it, which is the one thing the svg must never do.

import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { SvgAst } from 'react-native-svg';
import { BEAD, FROG, spriteFor } from '../art/sprites';
import { sampleTrack } from './animate';
import { POSE } from './timings';

/**
 * @param {object} props
 * @param {string} [props.color]      yarn color; the frog and the bead have none
 * @param {string} [props.special]    which special this ball carries, if any
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
        ? { x: ix, y: iy, scale: 1, opacity: 1, pose: POSE.rest }
        : sampleTrack(track, clock.value - track.base);
    return {
      opacity: at.opacity,
      transform: [{ translateX: at.x * cell }, { translateY: at.y * cell }, { scale: at.scale }],
    };
  });

  // Dispatch on kind first: spriteFor draws yarn, and a frog or a bead handed to it has no color
  // of its own and would come back a cocoa ball.
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.piece, { width: cell, height: cell }, animated]}
    >
      {kind === 'frog' ? (
        <Frog size={cell} track={track} clock={clock} />
      ) : kind === 'bead' ? (
        <SvgAst ast={BEAD} override={{ width: cell, height: cell }} />
      ) : (
        <SvgAst
          ast={spriteFor({ color, special, knotted })}
          override={{ width: cell, height: cell }}
        />
      )}
    </Animated.View>
  );
});

/**
 * The frog, all three of his pictures at once. A pose is a swap between drawings rather than a
 * distance to cover, so they are stacked and the sampled pose decides which one is opaque — the
 * switch then happens on the UI thread, mid-move, without waiting for a React commit. Ghosts draw
 * through this same component, which is what lets a ripping frog keep his tongue out while he
 * fades.
 *
 * @param {object} props
 * @param {number} props.size
 * @param {import('./timings').Track} [props.track]
 * @param {{ value: number }} props.clock
 */
const Frog = memo(({ size, track, clock }) => {
  const pose = useDerivedValue(() =>
    track === undefined ? POSE.rest : Math.round(sampleTrack(track, clock.value - track.base).pose),
  );
  // The same floor frogFor() puts under an unknown pose: anything that is not a hop and not a
  // tongue is the resting frog, so he can never be drawn as nothing at all.
  const rest = useAnimatedStyle(() => ({
    opacity: pose.value === POSE.hop || pose.value === POSE.tongue ? 0 : 1,
  }));
  const hop = useAnimatedStyle(() => ({ opacity: pose.value === POSE.hop ? 1 : 0 }));
  const tongue = useAnimatedStyle(() => ({ opacity: pose.value === POSE.tongue ? 1 : 0 }));

  return (
    <>
      <Animated.View style={[styles.pose, rest]}>
        <SvgAst ast={FROG[POSE.rest]} override={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View style={[styles.pose, hop]}>
        <SvgAst ast={FROG[POSE.hop]} override={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View style={[styles.pose, tongue]}>
        <SvgAst ast={FROG[POSE.tongue]} override={{ width: size, height: size }} />
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
  pose: { position: 'absolute', left: 0, top: 0 },
});

export default Piece;
