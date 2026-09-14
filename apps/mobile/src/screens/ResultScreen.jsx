// The end of a level (docs/DESIGN.md §6): "Fastened off!" with what it paid, or "Ran out of
// yarn." A transparent modal, so the board it just finished stays visible underneath. The
// Continue prompt belongs with lives and stitch markers in phase 6; until then losing offers
// another go or the way home.
//
// This is the screen the project illustration was drawn for: a win shows the finished piece, a
// loss shows the line drawing the goals were filling in. Both are drawn INSIDE the cream card and
// never on the scrim — the delivered PNGs carry a low-alpha cream wash at their border (alpha 6
// to 16 of 255), which is invisible on cream and a faint lighter halo on anything dark. The
// animated showpieces are still not here and are not this slice's: the coin pile and the confetti
// are commissioned after level 1's static art is in (QUESTIONS item 37), and the layer they mount
// into is at the bottom of this file.
//
// Nothing here mentions the room. It does not exist until phase 6, and a win screen that promises
// a shelf the player cannot visit is worse than one that says what the level paid (owner, phase 5).

import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SvgAst } from 'react-native-svg';
import { CREAM, PALETTE } from '../art/palette';
import { illustrationFor } from '../art/illustrations';
import { projectKeyOf } from '../art/projects';
import { COIN } from '../art/sprites';
import { FONT } from '../art/type';
import { goHome, replayLevel } from '../nav';
import { newSeed } from '../game/seed';

// The scrim over the level behind the card. It is cocoa at 45%, not a palette token: PALETTE
// holds yarn colours and this is a veil over the board, so it lives here with the screen it dims.
const SCRIM = 'rgba(58, 42, 36, 0.45)';

/**
 * How big the illustration is drawn. 200 is its ceiling because that is the art: the delivery is
 * 200 pt square at 1x with its @2x and @3x beside it, and anything larger is Metro upscaling a
 * bitmap. The floor and the fraction are what keep the card on the phone — the game is landscape,
 * so the card's room is the SHORT side of the screen, which is 360 pt on the minimum-spec Moto G
 * Play before the title, the figures and the buttons take their share. Sized from the screen and
 * clamped at both ends, the same knob as PlayScreen's dial.
 */
const ILLUS_MAX = 200;
const ILLUS_MIN = 96;
const ILLUS_SHARE = 0.4;

/**
 * The coin beside the coins figure. Bigger than the 20 pt number it stands next to on purpose:
 * `coin()` draws a disc of r=34 on a 100 viewBox with a contact shadow under it, so about two
 * thirds of this box is the coin itself and the rest is the air the drawing brings with it.
 */
const COIN_SIZE = 28;

/** How long the finished piece takes to arrive. */
const REVEAL_MS = 400;

const ResultScreen = ({ route }) => {
  const { won, score, coins, levelId, name } = route.params;
  const { height } = useWindowDimensions();

  // The params carry the level's `project` verbatim (PlayScreen's onEnd), and that one field is
  // all projectKeyOf reads. A null from either half is the documented answer rather than a fault:
  // illustrations.js maps `coaster_olive` and nothing else today, so all five development boards
  // come back null, as do the other fourteen Book 1 projects until phase 6 draws them. The card
  // then lays out exactly as it did before there was an illustration at all — the numbers, and no
  // placeholder box where a picture would go.
  const art = illustrationFor(projectKeyOf(route.params));

  // The win reveal: the finished piece fades up, a plain opacity tween. It is NOT `done` growing
  // over a stationary `empty`, which is the obvious reading of "it fills in" and is wrong for
  // this art. Measured off the two delivered PNGs: they are the same drawing on the same 200 pt
  // crop — ink bounds identical to the pixel (21,23)-(174,174) at any sensible alpha threshold,
  // their centres inside half a pixel of each other, `done` larger by well under 1%. A scale
  // tween of one over the other therefore spends most of its run showing a small coloured
  // coaster sitting inside a larger pale one, which reads as two objects rather than as one
  // being finished. Opacity is the one that reads right.
  //
  // No `reduceMotion` named here, the way Meter.jsx's wiggle leaves it alone: this is decoration,
  // not a clock and not a readout. Reduced, reanimated finishes it on its first frame, which
  // lands the opacity at 1 — the finished piece simply on screen, with nothing lost but the fade.
  const reveal = useSharedValue(0);
  useEffect(() => {
    if (!won || art === null) return undefined;
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: REVEAL_MS });
    return () => cancelAnimation(reveal);
  }, [won, art, reveal]);
  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const side = Math.max(ILLUS_MIN, Math.min(ILLUS_MAX, Math.round(height * ILLUS_SHARE)));
  const frame = { width: side, height: side };

  // react-native's own <Image> rather than expo-image, deliberately: expo-image is a native
  // module, so adding it moves the fingerprint runtime version app.json pins and
  // scripts/ota-check.mjs polices — every fielded binary orphaned from its OTA channel and a new
  // build needed — to draw two PNGs that are already in the bundle and want none of what it
  // offers: no remote fetching, no disk cache, no blurhash. Its real case is phase 6's room
  // backgrounds, which is a build boundary worth crossing once, with the room.
  //
  // The loss ghost is drawn at FULL opacity and never dimmed, which looks like a missing style
  // and is not. Composited on this card and measured over its own ink, the line drawing is
  // already a ghost: 20.8 grey values off the cream on average, 49.9 at its darkest pixel. Taking
  // it to the 0.55 that "unfinished" suggests leaves 11.5 average — not a fainter picture, no
  // picture. `empty` says unfinished by being the drawing with nothing filled in.
  //
  // `alt` rather than `accessibilityLabel`, on both: react-native's Image marks itself an
  // accessibility element only when `alt` is set (Image.ios.js computes `accessible` from it,
  // Image.android.js sets nativeProps.accessible), and it carries the text through as the label
  // either way. A bare accessibilityLabel is a caption on a view VoiceOver never stops on — it
  // reads on Android and is silent on iOS, which is the shape a bare fontWeight has too.
  const illustration =
    art === null ? null : won ? (
      <Animated.View style={revealStyle}>
        <Image source={art.done} style={[styles.illus, frame]} alt="the finished project" />
      </Animated.View>
    ) : (
      <Image source={art.empty} style={[styles.illus, frame]} alt="the project, still unfinished" />
    );

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{won ? 'Fastened off!' : 'Ran out of yarn.'}</Text>
        {name ? <Text style={styles.name}>{name}</Text> : null}
        {/* the illustration and what the level paid, side by side: the card's room is the short
            side of a landscape phone, so the picture takes the width there is and not the height
            there is not. With no illustration the row holds one centred child and the card reads
            as it always has. */}
        <View style={styles.body}>
          {illustration}
          {won ? (
            <View style={styles.figures}>
              <Text style={styles.figure}>{score.toLocaleString()}</Text>
              <Text style={styles.label}>score</Text>
              <View style={styles.coins}>
                <SvgAst ast={COIN} override={{ width: COIN_SIZE, height: COIN_SIZE }} />
                <Text style={styles.figure}>{coins.toLocaleString()}</Text>
              </View>
              <Text style={styles.label}>coins</Text>
            </View>
          ) : (
            <Text style={styles.label}>The goals were not finished in time.</Text>
          )}
        </View>
        <View style={styles.buttons}>
          <Pressable
            onPress={() => replayLevel(levelId, newSeed())}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.home, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Home</Text>
          </Pressable>
        </View>
      </View>
      {/* Empty on purpose, and not dead: this is where the confetti and the coin burst mount when
          they are commissioned (QUESTIONS item 37). They belong over the whole screen rather than
          inside the card, and a layer that exists now is one the next slice fills instead of
          re-laying the card out around it — it takes part in no layout, takes no touches, and is
          above the card by document order, which is the only layering this app uses (see the
          comment at Board.jsx:464). */}
      <View pointerEvents="none" style={styles.effects} />
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SCRIM,
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 34,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 26, fontFamily: FONT.bold, color: PALETTE.cocoa },
  name: { fontSize: 13, fontFamily: FONT.medium, color: PALETTE.cocoa, opacity: 0.75 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  // the PNG is square and so is the box, so `contain` changes nothing today; it is what keeps the
  // queued re-cut from stretching if it arrives at another aspect
  illus: { resizeMode: 'contain' },
  figures: { alignItems: 'center' },
  figure: { fontSize: 20, fontFamily: FONT.bold, color: PALETTE.cocoa },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: PALETTE.cocoa,
    opacity: 0.7,
    marginBottom: 4,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 6 },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: PALETTE.rust,
  },
  home: { backgroundColor: PALETTE.cocoa },
  pressed: { opacity: 0.8 },
  buttonText: { color: CREAM, fontSize: 16, fontFamily: FONT.bold },
  // full bleed, so the burst above is placed against the screen and not against the card
  effects: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
});

export default ResultScreen;
