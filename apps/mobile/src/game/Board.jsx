// The board: the engine's game, the view model, and one clock per move. A swipe advances the
// engine, buildMove turns the steps into a timeline, and a single linear clock drives every
// piece through it (docs/DESIGN.md §11 "play steps sequentially", §16 for the durations). The
// JS thread does two commits per move and nothing in between.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { createGame } from '@hooked/engine';
import { PALETTE } from '../art/palette';
import { buildModel, describeDrift, inModel } from './model';
import { buildMove, quietCells } from './move';
import { fitBoard } from './geometry';
import { swipeTarget } from './input';
import { FINISH_SLACK_MS, METER_MS, SHUFFLE_IN_MS, SHUFFLE_OUT_MS } from './timings';
import { sampleShake } from './animate';
import { useBoardGestures } from './gestures';
import Meter from './Meter';
import Piece from './Piece';

const NO_TRACKS = new Map();
const NO_GHOSTS = [];
const NO_SHAKES = [];

/**
 * @param {object} props
 * @param {object} props.level  a parsed level file (docs/DESIGN.md §10)
 * @param {string} props.seed
 * @param {{ width: number, height: number }} props.arena  the measured area to fit into
 */
const Board = ({ level, seed, arena }) => {
  const gameRef = useRef(null);
  if (gameRef.current === null) gameRef.current = createGame(level, seed);

  const [view, setView] = useState(() => ({
    model: buildModel(gameRef.current.state().board),
    tracks: NO_TRACKS,
    ghosts: NO_GHOSTS,
    shakes: NO_SHAKES,
    move: null,
    nextBase: 0,
    generation: 0,
  }));
  const viewRef = useRef(view);
  viewRef.current = view;

  // The move in flight: written before the engine advances, cleared by whichever of the clock
  // and its fallback timer gets there first, so completion happens exactly once. While it is set
  // the board is playing, and a swipe is either remembered on it or let go.
  const pendingRef = useRef(null);
  const onSwipeRef = useRef(null);
  const onTapRef = useRef(null);
  const moveIdRef = useRef(0);
  const timersRef = useRef([]);
  const [shuffling, setShuffling] = useState(false);

  const clock = useSharedValue(0);
  const fade = useSharedValue(1);
  const fill = useSharedValue(0);
  const [meter, setMeter] = useState(() => gameRef.current.state().meter);

  const { model, tracks, ghosts } = view;
  const layout = useMemo(
    () => fitBoard(arena, { width: model.width, height: model.height }),
    [arena.width, arena.height, model.width, model.height],
  );

  const after = useCallback((ms, fn) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(
    () => () => {
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current = [];
    },
    [],
  );

  const rebuild = useCallback((game) => {
    setView((v) => ({
      ...v,
      model: buildModel(game.state().board, v.model.nextId),
      tracks: NO_TRACKS,
      ghosts: NO_GHOSTS,
      move: null,
    }));
  }, []);

  /**
   * Turns a step stream into the move the board plays: one commit, the clock, and the shuffle
   * timers. Shared by a swipe and a double-tap, which differ only in how they asked the engine.
   */
  const playMove = useCallback(
    (id, base, current, steps, game) => {
      let move;
      try {
        move = buildMove(current.model, steps, base);
      } catch (error) {
        if (__DEV__) console.warn(`${error.message} — rebuilding the board`);
        rebuild(game);
        pendingRef.current = null;
        return;
      }
      if (move.meter !== null) setMeter(game.state().meter);
      if (move.total === 0) {
        pendingRef.current = null; // nothing to animate, so nothing to wait for
        return;
      }
      pendingRef.current.model = move.model;
      pendingRef.current.quiet = quietCells(current.model, move);
      setView((v) => ({
        model: move.shuffle === null ? move.model : move.shuffle.before,
        tracks: move.tracks,
        ghosts: move.removed,
        shakes: move.shakes,
        move: { id, base, total: move.total },
        nextBase: base + move.total,
        generation: v.generation,
      }));
      if (move.shuffle !== null) {
        after(move.shuffle.at, () => {
          setShuffling(true);
          fade.value = withTiming(0, { duration: SHUFFLE_OUT_MS });
        });
        after(move.shuffle.at + SHUFFLE_OUT_MS, () => {
          setView((v) => ({
            ...v,
            model: move.model,
            tracks: NO_TRACKS,
            ghosts: NO_GHOSTS,
            generation: v.generation + 1,
          }));
        });
      }
    },
    [after, fade, rebuild],
  );

  const finishMove = useCallback(
    (id) => {
      const pending = pendingRef.current;
      if (pending === null || pending.id !== id) return;
      if (pending.fallback !== undefined) clearTimeout(pending.fallback);
      pendingRef.current = null;
      const game = gameRef.current;
      // The board and the engine must agree cell for cell; if they ever do not, say so in dev
      // and take the engine's word for it rather than playing on from a wrong picture.
      const drift = describeDrift(viewRef.current.model, game.state().board);
      if (drift !== null) {
        if (__DEV__) console.warn(`board drift after a move, rebuilding:\n${drift}`);
        rebuild(game);
        setShuffling(false);
        return; // the buffered swipe was aimed at a board that turned out to be wrong
      }
      if (viewRef.current.ghosts.length > 0) setView((v) => ({ ...v, ghosts: NO_GHOSTS }));
      setMeter(game.state().meter);
      setShuffling(false);
      // A swipe or tap made while this move played, on cells it never touched: play it now.
      if (pending.buffered !== undefined) {
        const { kind, col, row, dir } = pending.buffered;
        if (kind === 'tap') onTapRef.current(col, row);
        else onSwipeRef.current(col, row, dir);
      }
    },
    [rebuild],
  );

  const onSwipe = useCallback(
    (col, row, dir) => {
      const game = gameRef.current;
      const pending = pendingRef.current;
      const from = { x: col, y: row };

      // The board is mid-move. The engine has no half-played board to swap on, so the choice is
      // to remember the swipe or drop it. Remember it only when both its cells sit out the whole
      // move: there, what the player aimed at is what they will get when it settles, with none
      // of the "it swapped something else" of a blind queue. The last such swipe wins.
      if (pending !== null) {
        if (pending.quiet === undefined) return;
        const target = swipeTarget(pending.model, from, dir);
        if (target === null) return;
        if (!pending.quiet.has(`${col},${row}`) || !pending.quiet.has(`${target.x},${target.y}`)) {
          return;
        }
        pending.buffered = { kind: 'swipe', col, row, dir };
        return;
      }

      const current = viewRef.current;
      const to = swipeTarget(current.model, from, dir);
      if (to === null || current.model.grid[row][col] === null) return;
      const id = moveIdRef.current + 1;
      moveIdRef.current = id;
      pendingRef.current = { id };
      const base = current.nextBase;
      const { steps } = game.swap(from, to);
      if (steps.length === 0) {
        pendingRef.current = null; // the game is over; phase 4 brings the result screen
        return;
      }
      playMove(id, base, current, steps, game);
    },
    [playMove],
  );
  onSwipeRef.current = onSwipe;

  // A double-tap fires whatever is under the finger. It takes one cell, so mid-move it only has
  // to wait for that cell to sit still, and it goes through the same one-move-at-a-time gate.
  const onTap = useCallback(
    (col, row) => {
      const pending = pendingRef.current;
      if (pending !== null) {
        if (pending.quiet === undefined || !pending.quiet.has(`${col},${row}`)) return;
        pending.buffered = { kind: 'tap', col, row };
        return;
      }
      const game = gameRef.current;
      const current = viewRef.current;
      if (!inModel(current.model, { x: col, y: row })) return;
      const id = moveIdRef.current + 1;
      moveIdRef.current = id;
      pendingRef.current = { id };
      const base = current.nextBase;
      const { steps } = game.tap({ x: col, y: row });
      if (steps.length === 0) {
        pendingRef.current = null; // nothing there to fire: no move spent, nothing to play
        return;
      }
      playMove(id, base, current, steps, game);
    },
    [playMove],
  );
  onTapRef.current = onTap;

  // The move clock: linear from base to base + total, so every piece samples the same instant.
  useEffect(() => {
    const move = view.move;
    if (move === null) return undefined;
    const { id, base, total } = move;
    clock.value = base;
    clock.value = withTiming(
      base + total,
      { duration: total, easing: Easing.linear },
      (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finishMove, id);
      },
    );
    const fallback = setTimeout(() => finishMove(id), total + FINISH_SLACK_MS);
    if (pendingRef.current !== null && pendingRef.current.id === id) {
      pendingRef.current.fallback = fallback;
    }
    return () => clearTimeout(fallback);
  }, [view.move, clock, finishMove]);

  // The readout fills as the charge rises; it runs off its own clock, not the move's.
  useEffect(() => {
    if (meter.kind === 'none') return;
    fill.value = withTiming(meter.charge / meter.full, { duration: METER_MS });
  }, [meter, fill]);

  // "Untangling…": the rebuilt board fades back in once its pieces exist.
  useEffect(() => {
    if (view.generation === 0) return;
    fade.value = withTiming(1, { duration: SHUFFLE_IN_MS });
  }, [view.generation, fade]);

  const gesture = useBoardGestures({ layout, onSwipe, onTap });
  const cell = layout === null ? 0 : layout.cell;
  const shakes = view.shakes;
  // the shakes are in move time, and the clock runs in board time
  const shakeBase = view.move === null ? 0 : view.move.base;
  const boardStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: sampleShake(shakes, clock.value - shakeBase) * cell }],
  }));
  // Ids only ever grow, so sorting by id keeps the child order stable across a move and a piece
  // created on a cleared cell draws over the one fading out under it.
  const pieces = useMemo(
    () => [...model.pieces.values(), ...ghosts].sort((a, b) => a.id - b.id),
    [model, ghosts],
  );

  if (layout === null) return <View style={styles.arena} />;
  return (
    <View style={styles.arena}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.board, { width: layout.width, height: layout.height }, boardStyle]}
        >
          {pieces.map((entry) => (
            <Piece
              key={entry.id}
              color={entry.piece.color}
              special={entry.piece.special}
              kind={entry.piece.kind}
              cell={layout.cell}
              ix={entry.x}
              iy={entry.y}
              track={tracks.get(entry.id)}
              clock={clock}
            />
          ))}
        </Animated.View>
      </GestureDetector>
      {meter.kind === 'none' ? null : <Meter meter={meter} fill={fill} width={layout.width} />}
      {shuffling ? <Text style={styles.untangling}>Untangling…</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Spawned pieces wait above the board; the clip is what keeps them out of sight.
  board: { overflow: 'hidden' },
  untangling: { position: 'absolute', fontSize: 18, fontWeight: '600', color: PALETTE.cocoa },
});

export default Board;
