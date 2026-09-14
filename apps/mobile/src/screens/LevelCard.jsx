// The level card (docs/DESIGN.md §11): "Level N", the project the level makes, the goals with
// their counts, how many moves there are to do it in, three booster slots the shop unlocks at
// level 8, and Play.
//
// It is a STEP INSIDE PlayScreen rather than a modal route (owner, 2026-09-13, departing from §11
// §11 had it as a modal route until 2026-09-13), and the reason is the whole point of the
// card. Opening a 9x9 board costs 1845 ms on the minimum-spec device — about 55% of it the ~2,100
// svg nodes, the rest React and Reanimated mounting 162 memoised components; createGame is 9 ms
// and buildModel 2 ms, so the engine is not in it. A route cannot cover that mount: PlayScreen
// measures the arena on one commit and mounts <Board> on the next, so the expensive commit lands
// after onLayout returns no matter what screen is on top of it. The cover is the deferral in
// PlayScreen, not this file's presentation. This file is only what the player looks at while it
// happens — which is why it is static, and why it draws nothing the first frame cannot afford.
//
// Play is drawn from the first frame and inert until the board reports in. That is deliberate and
// not a placeholder: during the mount the JS thread is busy, so nothing on this card could answer
// a touch anyway, and a live-looking Play would take a press, drop it, and read as a broken
// button. It looks inert because it is. Back is the exception and is live from the first frame —
// it costs nothing to draw, and without it the card hides PlayScreen's only way home while Play is
// registered with `gestureEnabled: false`, so a player who opened the wrong level would be held
// here until the mount finished.

import { useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SvgAst } from 'react-native-svg';
import { CREAM, PALETTE } from '../art/palette';
import { GOAL_ICON } from '../art/sprites';
import { illustrationFor } from '../art/illustrations';
import { projectKeyOf } from '../art/projects';
import { FONT } from '../art/type';

/**
 * How long the card takes to get out of the way. This is the one animation in the slice that names
 * no `reduceMotion` (contrast the rule comment at Board.jsx:247): reanimated finishes a reduced
 * animation on its first frame, and a card that vanishes the instant Play is pressed is exactly
 * the right behaviour with the OS setting on. The completion callback still runs either way, so
 * the overlay still unmounts.
 */
const CARD_FADE_MS = 220;

/**
 * How big a goal icon is drawn here — 1:1 with the 24x24 viewBox the icons are authored on, a
 * touch bigger than the 22 the in-play panel squeezes into the left column. The size goes through
 * SvgAst's `override`, which is what lands width and height on the <Svg>; one frozen object rather
 * than one per render, the way GoalsPanel holds its own.
 */
const ICON = Object.freeze({ width: 24, height: 24 });

/** §11's three slots, from the Fishdom pass: empty in v1, and captioned so they read as coming. */
const BOOSTER_SLOTS = [0, 1, 2];

/**
 * @param {object} props
 * @param {object} props.level  the parsed level, as @hooked/levels loads it (docs/DESIGN.md §10)
 * @param {{ type: string, total: number, remaining: number, color?: string, blocker?: string }[]}
 *   props.goals  the engine's goals for this level, derived once by PlayScreen: the level JSON
 *   carries no totals, since a stitch goal's total is however many squares its board has
 * @param {{ top: number, bottom: number, left: number, right: number }} props.insets  the screen's
 *   safe area. The card is an absolute fill over the whole screen — PlayScreen's `styles.screen`
 *   carries no padding of its own, only the row inside it does — so the insets have to land here
 *   or the title runs under the Dynamic Island
 * @param {boolean} props.ready  the board is mounted and laid out behind the card; until it is,
 *   Play is drawn but does nothing
 * @param {() => void} props.onBack  the way home, live from the first frame
 * @param {() => void} props.onDismissed  called once, after the card has faded out: the overlay
 *   unmounts on it rather than on the press, so nothing reaches the board's gestures mid-fade
 */
const LevelCard = ({ level, goals, insets, ready, onBack, onDismissed }) => {
  const opacity = useSharedValue(1);
  const goingRef = useRef(false);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const onPlay = useCallback(() => {
    if (goingRef.current) return; // a second press would restart the fade from halfway
    goingRef.current = true;
    opacity.value = withTiming(0, { duration: CARD_FADE_MS }, (finished) => {
      'worklet';
      // A cancelled fade reports finished === false — an unmount mid-fade is the only way there —
      // so the callback stays quiet rather than setting state on a screen that has gone.
      if (finished) scheduleOnRN(onDismissed);
    });
  }, [opacity, onDismissed]);

  useEffect(() => () => cancelAnimation(opacity), [opacity]);

  // Null is the documented answer for every level whose project has no art yet — every dev board
  // and the other fourteen Book 1 projects until phase 6 — so the whole block simply goes away.
  // `empty` is the line drawing the goal fills in; it is pale as delivered rather than dimmed here
  // (owner, 2026-09-13: the first pass ships as-is, a re-cut is queued with the designer).
  const art = illustrationFor(projectKeyOf(level));

  return (
    <Animated.View
      // pointerEvents stays auto for the whole fade: the card is still on top of the board while
      // it goes, and a pan that slipped through would reach useBoardGestures and spend a move.
      pointerEvents="auto"
      // Covering the pixels is not covering the view tree: VoiceOver walks the tree, so without
      // this it finds PlayScreen's Home button and the goals panel under an opaque card. This
      // prop is iOS-only and there is no one prop that does both — Android is held by the row's
      // own importantForAccessibility, which PlayScreen drops the moment the card is gone.
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.overlay, fade]}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.body}>
          <View style={styles.details}>
            <Text style={styles.level}>Level {level.id}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {level.name}
            </Text>
            <View style={styles.goals}>
              {goals.map((goal, i) => (
                // Same key as the in-play panel: a level may ask for two colours of the same type.
                <View key={`${goal.type}-${goal.color ?? goal.blocker ?? i}`} style={styles.goal}>
                  {/* GOAL_ICON keys on the type and then on the colour or the blocker and always
                      comes back with a picture, so no row is ever a count on its own. */}
                  <SvgAst ast={GOAL_ICON(goal)} override={ICON} />
                  {/* Nothing has been played yet, so `remaining` is `total`; the total is the one
                      of the two that stays true if this card is ever shown mid-level. */}
                  <Text style={styles.goalCount}>{goal.total}</Text>
                </View>
              ))}
            </View>
            <View style={styles.moves}>
              <Text style={styles.movesCount}>{level.moves}</Text>
              <Text style={styles.movesLabel}>moves</Text>
            </View>
          </View>
          {art === null ? null : (
            <Image source={art.empty} resizeMode="contain" style={styles.illustration} />
          )}
        </View>
        <View style={styles.footer}>
          <View style={styles.boosters}>
            <View style={styles.slots}>
              {BOOSTER_SLOTS.map((slot) => (
                <View key={slot} style={styles.slot} />
              ))}
            </View>
            <Text style={styles.slotsCaption}>Unlocked at level 8</Text>
          </View>
          <Pressable
            // No onPress at all until the board is up, rather than a handler that returns early:
            // `disabled` is also what tells a screen reader the button is not offering anything
            // yet. It is drawn at its full size from the first frame, so brightening moves nothing.
            onPress={ready ? onPlay : undefined}
            disabled={!ready}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.play,
              ready ? null : styles.playWaiting,
              pressed && styles.playPressed,
            ]}
          >
            <Text style={styles.playText}>Play</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

// The ground is opaque on purpose: it is what hides the board's mount, and the fade to nothing is
// what reveals it. No shadow and no card-within-a-card — this covers the whole screen rather than
// floating over it, because there is nothing behind it worth showing yet.
const styles = StyleSheet.create({
  overlay: { backgroundColor: CREAM },
  content: { flex: 1 },
  back: { paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start', marginTop: 6 },
  backText: { fontSize: 14, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.7 },
  // The landscape shape of §11: what the level asks for on the left, what it makes on the right.
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 24 },
  details: { flex: 1, gap: 2 },
  level: { fontSize: 30, fontFamily: FONT.bold, color: PALETTE.cocoa },
  name: { fontSize: 15, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.7 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalCount: { fontSize: 19, fontFamily: FONT.bold, color: PALETTE.cocoa },
  moves: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 },
  movesCount: { fontSize: 24, fontFamily: FONT.bold, color: PALETTE.cocoa },
  movesLabel: { fontSize: 12, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.6 },
  // The art is square (200 px at 1x) and takes whatever height the row can spare: `contain` keeps
  // it whole on a short landscape phone rather than cropping the border stitches off it.
  illustration: { flex: 1, height: '100%' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 16,
  },
  boosters: { gap: 6 },
  slots: { flexDirection: 'row', gap: 10 },
  // A solid outline rather than the dashed one an empty slot wants: React Native draws a dashed
  // border on Android through a path that ignores borderRadius, so the same style is a dashed
  // rounded square on iOS and a dashed *rectangle* on Android. Faint and solid is the same picture
  // on both, which is the trade this repo already makes for fontWeight.
  slot: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.cocoa,
    opacity: 0.25,
  },
  slotsCaption: { fontSize: 11, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.6 },
  play: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    backgroundColor: PALETTE.rust,
  },
  // Dim, not hidden and not smaller: the button holds its box from the first frame, so the moment
  // the board reports in nothing on the card moves.
  playWaiting: { opacity: 0.4 },
  playPressed: { opacity: 0.8 },
  playText: { color: CREAM, fontSize: 20, fontFamily: FONT.bold },
});

export default LevelCard;
