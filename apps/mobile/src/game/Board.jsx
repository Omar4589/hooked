// The board: the engine's game, the view model, and one clock per move. A swipe advances the
// engine, buildMove turns the steps into a timeline, and a single linear clock drives every
// piece through it (docs/DESIGN.md §11 "play steps sequentially", §16 for the durations). The
// JS thread does two commits per move and nothing in between — the meter's frames ride the same
// clock, and the dial that draws them lives in the left column and re-renders on its own.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SvgAst } from 'react-native-svg';
import { createGame } from '@hooked/engine';
import { PALETTE } from '../art/palette';
import { FONT } from '../art/type';
import { tileSheetFor } from '../art/sprites';
import { buildModel, cellEntries, describeDrift, inModel, inPlay, stitchPattern } from './model';
import { buildMove, quietCells } from './move';
import { fitBoard } from './geometry';
import { swipeTarget } from './input';
import { FINISH_SLACK_MS, SHUFFLE_IN_MS, SHUFFLE_OUT_MS } from './timings';
import { sampleShake } from './animate';
import { useBoardGestures } from './gestures';
import Cell from './Cell';
import Piece from './Piece';

const NO_TRACKS = new Map();
const NO_CELLS = new Map();
const NO_GHOSTS = [];
const NO_SHAKES = [];
const NO_FRAMES = [];

/**
 * What the meter reads `t` milliseconds into a move. A frame is an instant rather than a
 * segment — the charge jumps a notch and the dial takes it from there — so this is the last
 * frame at or before `t`, and `from` (what the previous move left on the dial) before any of
 * them.
 * @param {{ at: number, charge: number }[]} frames
 * @param {number} from
 * @param {number} t
 * @returns {number}
 */
const sampleFrames = (frames, from, t) => {
  'worklet';
  let charge = from;
  for (let i = 0; i < frames.length; i += 1) {
    if (t < frames[i].at) break;
    charge = frames[i].charge;
  }
  return charge;
};

/** Where a move's frames leave the readout: what the next move's dial counts on from. */
const endCharge = (readout) =>
  readout.frames.length === 0 ? readout.from : readout.frames[readout.frames.length - 1].charge;

/**
 * @param {object} props
 * @param {object} props.level  a parsed level file (docs/DESIGN.md §10)
 * @param {string} props.seed
 * @param {{ width: number, height: number }} props.arena  the measured area to fit into
 * @param {(state: object, settled: boolean) => void} props.onState  the HUD's readout: the move
 *   counter the moment a move is accepted, the goals when it settles
 * @param {(meter: object|null) => void} [props.onMeter]  the dial's props, published once when
 *   the board mounts: `{ kind, full, charge }`, where `charge` is a shared value this board
 *   writes from its own clock — or null on a level with no meter. §11 hangs the dial under the
 *   goals panel, so the screen that owns that column draws it: `<Meter {...dial} size={size} />`
 * @param {(state: object) => void} props.onEnd  called once, when the level is won or lost
 * @param {() => void} [props.onReady]  called once, from the root's own onLayout: the cells and
 *   the pieces are mounted and laid out. That commit is the expensive one, so this is the signal
 *   for anything covering the board's mount — the level card PlayScreen shows first waits on it.
 *   Not `onState`: that is a passive effect and runs when React commits, which is the *start* of
 *   native mounting, so a card lifted on it would uncover a half-painted board. There is no
 *   fallback behind it: an arena too small for a one-pixel cell draws no board at all and so
 *   never reports, and a cover that has to come off regardless brings its own timer.
 */
const Board = ({ level, seed, arena, onState, onMeter, onEnd, onReady }) => {
  const gameRef = useRef(null);
  if (gameRef.current === null) gameRef.current = createGame(level, seed);
  // The pattern the level is stitching, read once: the engine deletes a square's layers when the
  // last one goes, so a stitched square is only knowable by having seen it unstitched.
  const patternRef = useRef(null);
  if (patternRef.current === null)
    patternRef.current = stitchPattern(gameRef.current.state().board);

  const [view, setView] = useState(() => ({
    model: buildModel(gameRef.current.state().board),
    tracks: NO_TRACKS,
    cells: NO_CELLS,
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
  // The screen re-renders on every readout, so these are read through refs: finishMove's
  // identity is a dependency of the move clock, and a new one mid-move would replay the move.
  const onStateRef = useRef(onState);
  const onMeterRef = useRef(onMeter);
  const onEndRef = useRef(onEnd);
  const onReadyRef = useRef(onReady);
  const endedRef = useRef(false);
  const readyRef = useRef(false);
  const moveIdRef = useRef(0);
  const timersRef = useRef([]);
  const [shuffling, setShuffling] = useState(false);

  const clock = useSharedValue(0);
  const fade = useSharedValue(1);
  // What the dial is showing, and where in board time it is showing it. The engine's own charge
  // cannot be asked for it: addCharge is unclamped and finishMove zeroes the meter inside the
  // same swap() call that filled it (packages/engine/src/game.js), so by the time this component
  // reads game.state() a meter that just set the frog off already says 0. buildMove's
  // meterFrames are the only sighting of a full meter there is, which is why the dial samples
  // them against the board's clock like every other animation here.
  const [readout, setReadout] = useState(() => ({
    frames: NO_FRAMES,
    base: 0,
    from: gameRef.current.state().meter.charge ?? 0,
  }));
  const charge = useDerivedValue(
    () => sampleFrames(readout.frames, readout.from, clock.value - readout.base),
    [readout],
  );

  onStateRef.current = onState;
  onMeterRef.current = onMeter;
  onEndRef.current = onEnd;
  onReadyRef.current = onReady;

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
      cells: NO_CELLS,
      ghosts: NO_GHOSTS,
      move: null,
    }));
    // Between moves the engine's charge is the truth — it only lies about a meter that filled
    // and reset inside one — so a board taken back from the engine takes the dial with it. With
    // no frames the readout holds `from` whatever the clock does.
    setReadout({ frames: NO_FRAMES, base: 0, from: game.state().meter.charge ?? 0 });
  }, []);

  /**
   * The readout, and the end of the level. Taken from the engine rather than from how the
   * animation went, so a move that ends the game reports exactly once whichever path it took.
   * @returns {boolean} true when the game is over
   */
  const report = useCallback((game) => {
    const state = game.state();
    onStateRef.current(state, true);
    if (state.status === 'playing') return false;
    if (!endedRef.current) {
      endedRef.current = true;
      onEndRef.current(state);
    }
    return true;
  }, []);

  // The panel has the level's goals and move count before the first swipe, and the dial beside
  // it has the meter this level runs on. `kind` and `full` come from the level and never change,
  // so the dial's props are published once, with the shared value its charge arrives through;
  // a level with no meter publishes nothing to draw.
  useEffect(() => {
    const state = gameRef.current.state();
    onStateRef.current(state, true);
    const { kind, full } = state.meter;
    onMeterRef.current?.(kind === 'none' ? null : { kind, full, charge });
  }, [charge]);

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
        report(game);
        return;
      }
      // The dial, on the board's clock: the frames say what the readout shows and when, and the
      // charge it starts from is whatever the last move left it at. A move with nothing to
      // animate still lands its frames, which all sit at 0 there.
      setReadout((previous) => ({ frames: move.meterFrames, base, from: endCharge(previous) }));
      if (move.total === 0) {
        pendingRef.current = null; // nothing to animate, so nothing to wait for
        report(game);
        return;
      }
      pendingRef.current.model = move.model;
      pendingRef.current.quiet = quietCells(current.model, move);
      setView((v) => ({
        model: move.shuffle === null ? move.model : move.shuffle.before,
        tracks: move.tracks,
        cells: move.cells,
        ghosts: move.removed,
        shakes: move.shakes,
        move: { id, base, total: move.total },
        nextBase: base + move.total,
        generation: v.generation,
      }));
      if (move.shuffle !== null) {
        after(move.shuffle.at, () => {
          setShuffling(true);
          // `reduceMotion: Never` on every animation here that is a clock or a cross-fade rather
          // than movement. Reanimated finishes a reduced animation on its first frame — it sets
          // the value to its end and reports done (animation/util.ts) — so with the OS setting on
          // this fade would snap and the move clock below would land on its last instant before a
          // single frame was drawn. Motion that is only decoration says nothing and stays
          // suppressed: the frog's wiggle in Meter.jsx is the one that leaves it alone.
          fade.value = withTiming(0, {
            duration: SHUFFLE_OUT_MS,
            reduceMotion: ReduceMotion.Never,
          });
        });
        after(move.shuffle.at + SHUFFLE_OUT_MS, () => {
          setView((v) => ({
            ...v,
            model: move.model,
            tracks: NO_TRACKS,
            cells: NO_CELLS,
            ghosts: NO_GHOSTS,
            generation: v.generation + 1,
          }));
        });
      }
    },
    [after, fade, rebuild, report],
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
        report(game);
        return; // the buffered swipe was aimed at a board that turned out to be wrong
      }
      if (viewRef.current.ghosts.length > 0) setView((v) => ({ ...v, ghosts: NO_GHOSTS }));
      setShuffling(false);
      if (report(game)) return; // the level is over: the buffered gesture goes with it
      // A swipe or tap made while this move played, on cells it never touched: play it now.
      if (pending.buffered !== undefined) {
        const { kind, col, row, dir } = pending.buffered;
        if (kind === 'tap') onTapRef.current(col, row);
        else onSwipeRef.current(col, row, dir);
      }
    },
    [rebuild, report],
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
        if (!inPlay(pending.model, from)) return;
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
      // a knot, a tangle and a moth cannot be picked up at all, so the swipe never reaches the
      // engine and nothing slides
      if (to === null || !inPlay(current.model, from)) return;
      const id = moveIdRef.current + 1;
      moveIdRef.current = id;
      pendingRef.current = { id };
      const base = current.nextBase;
      const { steps } = game.swap(from, to);
      if (steps.length === 0) {
        pendingRef.current = null; // the level is already over; the Result screen has it
        return;
      }
      // the counter drops the moment the move is accepted; the goals wait for it to settle
      onStateRef.current(game.state(), false);
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
        pendingRef.current = null; // nothing to fire, or the level is over: no move spent
        return;
      }
      onStateRef.current(game.state(), false);
      playMove(id, base, current, steps, game);
    },
    [playMove],
  );
  onTapRef.current = onTap;

  // The move clock: linear from base to base + total, so every piece samples the same instant.
  // It is how the board tells the time rather than an effect, hence the `reduceMotion` above:
  // reduced, it would finish on its first frame and finishMove would run before anything moved.
  useEffect(() => {
    const move = view.move;
    if (move === null) return undefined;
    const { id, base, total } = move;
    clock.value = base;
    clock.value = withTiming(
      base + total,
      { duration: total, easing: Easing.linear, reduceMotion: ReduceMotion.Never },
      (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finishMove, id);
      },
    );
    const fallback = setTimeout(() => finishMove(id), total + FINISH_SLACK_MS);
    if (pendingRef.current !== null && pendingRef.current.id === id) {
      pendingRef.current.fallback = fallback;
    }
    return () => {
      clearTimeout(fallback);
      // An unmount mid-move would otherwise leave the timing running and land finishMove on a
      // board that is gone; a cancel reports finished === false, so the callback stays quiet.
      cancelAnimation(clock);
    };
  }, [view.move, clock, finishMove]);

  // "Untangling…": the rebuilt board fades back in once its pieces exist.
  useEffect(() => {
    if (view.generation === 0) return;
    fade.value = withTiming(1, { duration: SHUFFLE_IN_MS, reduceMotion: ReduceMotion.Never });
    return () => cancelAnimation(fade);
  }, [view.generation, fade]);

  // The board is up. This view renders only in the commit that also mounts the cells and the
  // pieces — the branch below hands back a bare arena until there is a layout — and Fabric
  // applies a commit's mount transaction before it dispatches that commit's layout events, so
  // this fires once the subtree that costs the stall is on screen. Once only: a rotation lays
  // the board out again and must not announce it twice.
  const onRootLayout = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReadyRef.current?.();
  }, []);

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
  // The cell layer under them: the level's stitch pattern, its blockers, and anything this move
  // is still animating away. Cells have no ids, so they cannot join the sorted piece list.
  const layer = useMemo(
    () => cellEntries(model, patternRef.current, view.cells),
    [model, view.cells],
  );
  // The floor: every open cell in one svg, so a hole reads as a gap in the blanket. One svg root
  // replaces 81 Views, but not 81 nodes — a 9x9 sheet is 244 of them, and the measured cost of
  // a plain View is near zero (DESIGN.md §16), so this is for the drawn tile, not for speed.
  // sprites.js
  // memoises the sheet on the identity of `open`, and cloneModel hands the same array from move
  // to move (holes are fixed for the level) — so only a shuffle or a board rebuilt from the
  // engine ever parses one, and never a move.
  const sheet = tileSheetFor(model.open);

  if (layout === null) return <View style={styles.arena} />;
  return (
    <View style={styles.arena}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          onLayout={onRootLayout}
          style={[styles.board, { width: layout.width, height: layout.height }, boardStyle]}
        >
          <View pointerEvents="none" style={styles.floor}>
            <SvgAst ast={sheet} override={{ width: layout.width, height: layout.height }} />
          </View>
          {layer.map((entry) => (
            <Cell
              key={entry.key}
              tangle={entry.tangle}
              moth={entry.moth}
              stitch={entry.stitch}
              buried={entry.buried}
              stitched={entry.stitched}
              cell={layout.cell}
              ix={entry.x}
              iy={entry.y}
              track={view.cells.get(entry.key)}
              clock={clock}
            />
          ))}
          {pieces.map((entry) => (
            <Piece
              key={entry.id}
              color={entry.piece.color}
              special={entry.piece.special}
              kind={entry.piece.kind}
              knotted={entry.piece.knotted === true}
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
  // Spawned pieces wait above the board and an exiting bead drops below it; the clip is what
  // keeps both out of sight. No elevation or zIndex anywhere on the board: on Android they
  // would reorder the children, and the whole layering rests on document order.
  board: { overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, top: 0 },
  untangling: {
    position: 'absolute',
    fontSize: 18,
    fontFamily: FONT.semibold,
    color: PALETTE.cocoa,
  },
});

export default Board;
