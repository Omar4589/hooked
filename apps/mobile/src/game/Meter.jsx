// The frog meter (docs/DESIGN.md §11): the round dial that hangs under the goals panel — the
// rim, the fill arc drawn over it, and the frog (or the hook) sitting in the middle. Every
// picture is parsed once in ../art/sprites.js and shared, so the dial mounts a handful of small
// svgs and never parses one twice.
//
// It is not on the board and it does not run off the move: Board.jsx samples the move's meter
// frames against its own clock and writes the charge into a shared value, PlayScreen hands that
// on with the size the column can spare, and this turns the number into a notch. The arc is a
// drawing per notch rather than an animated stroke, so the hop from the UI thread to React
// happens only when a whole notch changes — once or twice a move, in a small subtree that the
// board never re-renders.

import { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SvgAst } from 'react-native-svg';
import { DIAL_FROG, DIAL_HOOK, RING, arcFor } from '../art/sprites';
import { BLINK_GAP_MS, BLINK_MS, METER_MS, WIGGLE_DEG, WIGGLE_MS } from './timings';

/**
 * How much of the dial the piece in the middle takes, as a fraction of it. The frog runs to
 * y = 97.5 of its own 100 box — the contact shadow under its feet — so at the obvious 0.8 that
 * shadow laps over the r=40 fill arc. At 0.7 the whole of it stays inside the r=36 inner circle
 * the rim draws, and so does the wiggle, which swings that corner no further out.
 */
const CENTRE_RATIO = 0.7;

/**
 * And how far up the frog is nudged inside that box. Its ink runs from the top of the eye bumps
 * to the bottom of that shadow, which is low of centre, so the lift is what makes it sit in the
 * middle of the ring rather than merely inside it. The hook is drawn around its own centre and
 * wants none of it.
 */
const CENTRE_LIFT = 0.05;

/**
 * @param {object} props
 * @param {string} props.kind    'frog' or 'hook'; a level with no meter draws no dial at all
 * @param {number} props.full    notches in a full meter
 * @param {{ value: number }} props.charge  the board writes this from its own clock
 * @param {number} props.size    how big the column can draw it (PlayScreen measures it)
 */
const Meter = memo(({ kind, full, charge, size }) =>
  kind === undefined || kind === 'none' || !(size > 0) || charge === undefined ? null : (
    <Dial kind={kind} full={full} charge={charge} size={size} />
  ),
);

/**
 * The dial itself, once there is one to draw. Split from Meter so a level with no meter costs no
 * hooks at all, rather than running the blink and the wiggle over nothing.
 */
const Dial = ({ kind, full, charge, size }) => {
  // The notch the arc is coming from and the one it is going to: two drawings, crossfaded, which
  // is what "the meter fills a notch" looks like when the fill is art and not a stroke (§16).
  const [arc, setArc] = useState({ from: 0, to: 0 });
  const blend = useSharedValue(1);
  const blink = useSharedValue(0);
  const wiggle = useSharedValue(0);

  const showNotch = useCallback((notch) => {
    setArc((previous) => (previous.to === notch ? previous : { from: previous.to, to: notch }));
  }, []);

  // The charge is a number on the UI thread and the arc is a picture on the JS thread; a whole
  // notch is the only thing that ever has to cross. The comparison is in the reaction rather
  // than in what it prepares, because a mapper runs on every write to the value it watches,
  // changed or not.
  useAnimatedReaction(
    () => Math.round(charge.value),
    (notch, previous) => {
      if (notch !== previous) scheduleOnRN(showNotch, notch);
    },
    [charge, showNotch],
  );

  // A readout, not motion, so it keeps its cross-fade with Reduce Motion on — same rule as the
  // board's clock and its shuffle fades, written out in Board.jsx.
  useEffect(() => {
    blend.value = 0;
    blend.value = withTiming(1, { duration: METER_MS, reduceMotion: ReduceMotion.Never });
    return () => cancelAnimation(blend);
  }, [arc, blend]);

  // One value for the life of the dial, on the UI thread: the eyes shut for BLINK_MS every
  // BLINK_GAP_MS (§12). The two frogs are stacked and the blink swaps between them instantly, so
  // there is no JS timer and nothing to blend halfway.
  useEffect(() => {
    if (kind !== 'frog') return undefined;
    // A blink is a pose swap, which is information rather than vestibular motion, so it keeps
    // its cadence. It has to be said on the repeat: reduced, withRepeat stops after a single
    // repetition and withDelay drops its delay, which is a frog that shuts its eyes once at
    // mount and never blinks again. The sequence and both delays inherit the setting from here.
    blink.value = withRepeat(
      withSequence(
        withDelay(BLINK_GAP_MS, withTiming(1, { duration: 0 })),
        withDelay(BLINK_MS, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.Never,
    );
    return () => cancelAnimation(blink);
  }, [kind, blink]);

  // "the frog wiggles when it's full" (§16 `meter`): one lean over and back per WIGGLE_MS, for
  // as long as the readout reads full. That is the whole point of running the dial off the move
  // clock — the engine has already zeroed the charge by the time the move ends, so a dial fed
  // from game.state() could never show this.
  //
  // The one animation that names no `reduceMotion`, deliberately: this is decoration, and a
  // player who asked for less motion should get less. With the setting on it settles at 0 on its
  // first frame and the frog sits still.
  const atFull = full > 0 && arc.to >= full;
  useEffect(() => {
    wiggle.value = atFull
      ? withRepeat(
          withSequence(
            withTiming(1, { duration: WIGGLE_MS / 4 }),
            withTiming(-1, { duration: WIGGLE_MS / 2 }),
            withTiming(0, { duration: WIGGLE_MS / 4 }),
          ),
          -1,
        )
      : withTiming(0, { duration: WIGGLE_MS / 4 });
    return () => cancelAnimation(wiggle);
  }, [atFull, wiggle]);

  // The old arc only fades out when the readout *shrank* — the drop. One that grew is drawn over
  // by an arc that contains it, so holding it lit underneath keeps the dial from dimming while
  // the two opacities cross.
  const emptying = arc.to < arc.from;
  const under = useAnimatedStyle(() => ({ opacity: emptying ? 1 - blend.value : 1 }));
  const over = useAnimatedStyle(() => ({ opacity: blend.value }));
  const eyes = useAnimatedStyle(() => ({ opacity: blink.value }));
  const lean = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wiggle.value * WIGGLE_DEG}deg` }],
  }));

  const dial = { width: size, height: size };
  const centre = Math.round(size * CENTRE_RATIO);
  const box = { width: centre, height: centre };
  const inset = Math.round((size - centre) / 2);
  const lift = kind === 'frog' ? Math.round(size * CENTRE_LIFT) : 0;

  return (
    <View style={dial} pointerEvents="none">
      <View style={styles.layer}>
        <SvgAst ast={RING} override={dial} />
      </View>
      <Animated.View style={[styles.layer, under]}>
        <SvgAst ast={arcFor(arc.from, full)} override={dial} />
      </Animated.View>
      <Animated.View style={[styles.layer, over]}>
        <SvgAst ast={arcFor(arc.to, full)} override={dial} />
      </Animated.View>
      <Animated.View style={[styles.layer, { left: inset, top: inset - lift, ...box }, lean]}>
        {kind === 'frog' ? (
          <>
            <View style={styles.layer}>
              <SvgAst ast={DIAL_FROG.idle} override={box} />
            </View>
            <Animated.View style={[styles.layer, eyes]}>
              <SvgAst ast={DIAL_FROG.blink} override={box} />
            </Animated.View>
          </>
        ) : (
          <SvgAst ast={DIAL_HOOK} override={box} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // every part of the dial is stacked on the same square: the rim, the arc over it, the frog in
  // the middle of both
  layer: { position: 'absolute', left: 0, top: 0 },
});

export default Meter;
