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
import { buildModel, describeDrift } from './model';
import { buildMove, quietCells } from './move';
import { fitBoard } from './geometry';
import { swipeTarget } from './input';
import { FINISH_SLACK_MS, SHUFFLE_IN_MS, SHUFFLE_OUT_MS } from './timings';
import { useSwipe } from './useSwipe';
import Piece from './Piece';

const NO_TRACKS = new Map();
const NO_GHOSTS = [];

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
  const moveIdRef = useRef(0);
  const timersRef = useRef([]);
  const [shuffling, setShuffling] = useState(false);

  const clock = useSharedValue(0);
  const fade = useSharedValue(1);

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
      setShuffling(false);
      // A swipe made while this move played, on cells it never touched: play it now.
      if (pending.buffered !== undefined) {
        const { col, row, dir } = pending.buffered;
        onSwipeRef.current(col, row, dir);
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
        pending.buffered = { col, row, dir };
        return;
      }

      const current = viewRef.current;
      const to = swipeTarget(current.model, from, dir);
      const release = () => {
        pendingRef.current = null;
      };
      if (to === null || current.model.grid[row][col] === null) return;
      const id = moveIdRef.current + 1;
      moveIdRef.current = id;
      pendingRef.current = { id };
      const base = current.nextBase;
      const { steps } = game.swap(from, to);
      if (steps.length === 0) {
        release(); // the game is over; phase 4 brings the result screen
        return;
      }
      let move;
      try {
        move = buildMove(current.model, steps, base);
      } catch (error) {
        if (__DEV__) console.warn(`${error.message} — rebuilding the board`);
        rebuild(game);
        release();
        return;
      }
      if (move.total === 0) {
        release();
        return;
      }
      pendingRef.current.model = move.model;
      pendingRef.current.quiet = quietCells(current.model, move);
      setView((v) => ({
        model: move.shuffle === null ? move.model : move.shuffle.before,
        tracks: move.tracks,
        ghosts: move.removed,
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
  onSwipeRef.current = onSwipe;

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

  // "Untangling…": the rebuilt board fades back in once its pieces exist.
  useEffect(() => {
    if (view.generation === 0) return;
    fade.value = withTiming(1, { duration: SHUFFLE_IN_MS });
  }, [view.generation, fade]);

  const gesture = useSwipe({ layout, onSwipe });
  const boardStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
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
              cell={layout.cell}
              ix={entry.x}
              iy={entry.y}
              track={tracks.get(entry.id)}
              clock={clock}
            />
          ))}
        </Animated.View>
      </GestureDetector>
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
