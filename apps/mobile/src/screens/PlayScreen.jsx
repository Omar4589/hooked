// The level screen: the §11 landscape row, left to right — the goals panel, the board, and the
// booster panel that arrives in phase 6. The centre column is measured rather than read from
// the window (docs/DESIGN.md §11), so the panels shrink the arena and the board re-fits with no
// layout rewrite; nothing reserves a gutter. The left column is measured the same way: §11 hangs
// the frog meter's dial under the goals panel, and how much column is left for it is something
// only this screen can see.
//
// It opens on the level card, which is a step here rather than a modal route (owner, 2026-09-13,
// departing from §11, which had the level card as a modal route until 2026-09-13). The departure is the
// feature: opening a 9x9 board costs 1845 ms on the minimum-spec device, and a route cannot cover
// it, because the arena is measured on one commit and <Board> mounts on the next — so the
// expensive commit lands after onLayout returns, whatever screen was on top while it was waiting.
// What covers the stall is the deferral below: the board is held back past a painted frame, and
// the card is what that frame paints.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createGame } from '@hooked/engine';
import { loadLevel } from '@hooked/levels';
import Board from '../game/Board';
import GoalsPanel from '../game/GoalsPanel';
import Meter from '../game/Meter';
import { CREAM, PALETTE } from '../art/palette';
import { FONT } from '../art/type';
import { goHome, navigate } from '../nav';
import LevelCard from './LevelCard';

/** The booster panel of §11: four slots, empty until phase 6. */
const BOOSTER_WIDTH = 72;

/** How big the dial may be drawn (owner, phase 5): sized from the column, never fixed at 100. */
const DIAL_MAX = 100;
const DIAL_MIN = 56;

/**
 * What the column owes before the dial may have any of it: the Home button, the panel's level and
 * name, the move counter pinned to the bottom, one row per goal, and the air around the dial. The
 * panel is `flex: 1`, so its box is whatever this screen leaves it and its content height cannot
 * be seen from out here — these are read off its own type sizes rather than measured, and rounded
 * up. Being a few points out only moves the dial; running the column out would hide the move
 * counter, which is the one thing the owner asked never to happen. They are a phone-pass knob,
 * like the §16 durations.
 */
const PANEL_ROOM = 170;
const GOAL_ROW = 45;

/**
 * How long the card waits for the board before it lets the player in anyway. `onReady` is a
 * one-shot callback out of the board's own onLayout and there is nothing behind it — an arena too
 * small for a one-pixel cell draws no board at all and so never reports — so this flips the card's
 * Play regardless. It is a safety net, not a floor: a signal that arrives in 1.8 s is not waited
 * out, and a signal that never arrives degrades to a wait rather than to a trapped player.
 */
const READY_FALLBACK_MS = 4000;

/**
 * How big the dial is drawn: the measured left column, less what the panel above it needs, held
 * to the owner's 56–100. The dial takes this number as given — nothing downstream clamps it a
 * second time — so a four-goal level shrinks the dial here rather than pushing the move counter
 * off the screen.
 * @param {{ width: number, height: number }} column  the measured left column
 * @param {number} goals  how many goal rows the panel is showing
 */
const dialSize = (column, goals) =>
  Math.max(
    DIAL_MIN,
    Math.min(DIAL_MAX, column.width, column.height - PANEL_ROOM - goals * GOAL_ROW),
  );

/** A measured box, in whole points. */
const boxOf = (e) => ({
  width: Math.floor(e.nativeEvent.layout.width),
  height: Math.floor(e.nativeEvent.layout.height),
});

const sameBox = (a, b) => a.width === b.width && a.height === b.height;

const PlayScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const { levelId, seed } = route.params;
  const level = useMemo(() => loadLevel(levelId), [levelId]);
  const [arena, setArena] = useState({ width: 0, height: 0 });
  const [column, setColumn] = useState({ width: 0, height: 0 });
  const [hud, setHud] = useState(null);
  const [dial, setDial] = useState(null);
  // The three pieces of the card step. `mountBoard` is the deferral itself, `ready` is the board
  // reporting that its subtree is up, and `cardGone` is the overlay letting go — separately,
  // because the card fades out after Play and must stay in front of the board while it does.
  const [mountBoard, setMountBoard] = useState(false);
  const [ready, setReady] = useState(false);
  const [cardGone, setCardGone] = useState(false);

  // The card's goal counts. The level JSON has no numbers in it — a stitch goal's total is however
  // many squares its board carries — so they are derived, from a throwaway game on the same seed
  // the board will use. 9 ms in release on the minimum-spec device, and the shape that comes back
  // ({ type, total, remaining } plus colour or blocker) is what GOAL_ICON already consumes.
  const goals = useMemo(() => createGame(level, seed).state().goals, [level, seed]);

  // Both requestAnimationFrame handles, so the cleanup can cancel whichever is outstanding.
  const framesRef = useRef({ first: 0, second: 0 });
  const fallbackRef = useRef(null);
  // __DEV__ bookkeeping only: where the two console.logs below measure the gap from.
  const mountAtRef = useRef(0);

  const onLayout = useCallback((e) => {
    const next = boxOf(e);
    setArena((prev) => (sameBox(prev, next) ? prev : next));
  }, []);
  // The column's box is the row's to give — its width comes from the goals panel, its height from
  // the screen — so drawing the dial into what was measured here can never change the measurement.
  const onColumnLayout = useCallback((e) => {
    const next = boxOf(e);
    setColumn((prev) => (sameBox(prev, next) ? prev : next));
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
  // The dial is the board's readout — the charge belongs to the move in flight and is sampled
  // against the move's clock, and since the engine zeroes the charge inside the same call that
  // fills it, a full meter is visible nowhere else — but §11 hangs it under the goals panel, in
  // this screen's column. So the board hands the dial's props over once, when it mounts — which
  // meter this level runs on and the shared value the charge arrives through, or null for a level
  // with no meter — and the screen adds the one thing only the measured column knows: the size.
  const onMeter = useCallback((props) => setDial(props), []);
  // Not onState: that is a passive effect and runs when React commits, which is the *start* of
  // native mounting. This comes out of the board's own root onLayout, in the commit that mounts
  // the cells and the pieces, so by the time it lands the expensive subtree is on screen.
  const onBoardReady = useCallback(() => {
    if (__DEV__) {
      const at = performance.now();
      const gap = at - mountAtRef.current;
      console.log(
        `[card] board ready at ${at.toFixed(0)} ms — ${gap.toFixed(0)} ms under the card`,
      );
    }
    setReady(true);
  }, []);
  const onCardGone = useCallback(() => setCardGone(true), []);
  // The result screen draws the project this level made and names it, and the engine's own
  // snapshot of the level carries nothing but { id, name } — so both come off the loaded level
  // rather than off `state`, which keeps one source for the pair.
  const onEnd = useCallback(
    (state) =>
      navigate('Result', {
        won: state.status === 'won',
        score: state.score,
        coins: state.coins,
        levelId,
        project: level.project,
        name: level.name,
      }),
    [levelId, level],
  );

  // THE DEFERRAL. The arena has been measured, and mounting the board into it is the 1845 ms the
  // card exists to cover — so the mount waits for a frame to have been produced with the card on
  // it. Two frames rather than one: a requestAnimationFrame callback runs *before* the frame it
  // was scheduled for is drawn, so a single one would still put the stall on the card's first
  // frame; scheduling the second from inside the first lands it after one frame has actually gone
  // out. That is the standard React Native idiom for "let it paint first", and it is a heuristic,
  // not a proof — nothing in it guarantees the frame reached the glass. If it ever proves too
  // eager, the heavier alternative is InteractionManager.runAfterInteractions, which also waits
  // out the navigation animation and every other registered interaction.
  useEffect(() => {
    if (arena.width === 0 || arena.height === 0) return undefined;
    const frames = framesRef.current;
    frames.first = requestAnimationFrame(() => {
      frames.second = requestAnimationFrame(() => {
        if (__DEV__) {
          mountAtRef.current = performance.now();
          console.log(`[card] board mount at ${mountAtRef.current.toFixed(0)} ms`);
        }
        setMountBoard(true);
      });
    });
    return () => {
      cancelAnimationFrame(frames.first);
      cancelAnimationFrame(frames.second);
    };
  }, [arena.width, arena.height]);

  // And the net under it, armed from the first frame: whatever the board does or fails to do, the
  // card's Play comes alive. Nothing waits it out when the board reports in sooner.
  useEffect(() => {
    fallbackRef.current = setTimeout(() => setReady(true), READY_FALLBACK_MS);
    return () => clearTimeout(fallbackRef.current);
  }, []);

  // The goal rows are most of what the panel above the dial needs, so the dial is re-sized as
  // they arrive; they cannot come and go mid-level, since the engine snapshots every goal every
  // move whether it is met or not.
  const size = dialSize(column, hud?.goals?.length ?? 0);

  return (
    <View style={styles.screen}>
      <View
        // Hidden from a screen reader for exactly as long as the card is over it (the iOS half is
        // the card's own accessibilityViewIsModal): an opaque overlay stops touches, not a
        // VoiceOver swipe, and Home and the goals panel sit right under it.
        importantForAccessibility={cardGone ? 'auto' : 'no-hide-descendants'}
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
        <View onLayout={onColumnLayout} style={styles.left}>
          <Pressable onPress={goHome} hitSlop={12} accessibilityRole="button" style={styles.home}>
            <Text style={styles.homeText}>Home</Text>
          </Pressable>
          <GoalsPanel hud={hud} />
          {/* a level with no meter publishes no dial and so takes none of the column at all, and
              nothing is drawn before the column has been measured */}
          {dial === null || column.width === 0 ? null : (
            <View style={styles.dial}>
              <Meter {...dial} size={size} />
            </View>
          )}
        </View>
        <View onLayout={onLayout} style={styles.arena}>
          {/* Measured *and* deferred: the arena gate is what makes the measurement possible at
              all, and `mountBoard` is what keeps the expensive commit off the card's first
              frame. */}
          {arena.width > 0 && arena.height > 0 && mountBoard ? (
            <Board
              key={seed}
              level={level}
              seed={seed}
              arena={arena}
              onState={onState}
              onMeter={onMeter}
              onEnd={onEnd}
              onReady={onBoardReady}
            />
          ) : null}
        </View>
        <View style={styles.boosters} />
      </View>
      {/* Last child, and covering everything above it: the repo layers by document order and never
          by zIndex or elevation (Board.jsx:464). It is also why the card needs no elevation of its
          own to sit over the row. Retry needs nothing extra — replayLevel resets to [Home, Play]
          with a new seed, so this screen mounts again and the card plays again, which is right:
          skipping it would give the most-pressed button in a match-3 an uncovered freeze. */}
      {cardGone ? null : (
        <LevelCard
          level={level}
          goals={goals}
          insets={insets}
          ready={ready}
          onBack={goHome}
          onDismissed={onCardGone}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  row: { flex: 1, flexDirection: 'row' },
  left: { paddingTop: 6 },
  home: { paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start' },
  homeText: { fontSize: 14, fontFamily: FONT.regular, color: PALETTE.cocoa, opacity: 0.7 },
  // the dial is a square of its own size; this is the air around it and the middle of the column
  dial: { alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  arena: { flex: 1 },
  boosters: { width: BOOSTER_WIDTH },
});

export default PlayScreen;
