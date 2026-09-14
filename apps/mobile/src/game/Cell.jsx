// One cell of the board beneath the pieces: the stitch square the level is making, the tangle
// sitting on it, the button buried under that tangle, or a moth — the drawn tiles from
// ../art/sprites.js. Every one of them already fills its own 100x100 box, so a tile is given the
// cell's size and nothing else. Like Piece it holds no state and runs no effects: it samples its
// own track against the board's clock on the UI thread.
//
// A cell swaps between drawings mid-move (three layers of tangle down to two, unstitched to
// stitched), and that swap has to happen on the UI thread without waiting for a React commit, so
// every tile a cell can show is mounted at once and cross-faded by opacity. That makes the mount
// count the thing to watch: everything this file can draw, on every cell of a 9x9, is eight svg
// roots x 81 cells, most of them at opacity 0 for the whole level. So a cell mounts only what it
// can actually use — no stitch square outside the level's pattern, no more tangle densities than
// it has layers, and no moth or button unless this cell is one of the few that has one.

import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { SvgAst } from 'react-native-svg';
import { BUTTON, MOTH, STITCH, TANGLE } from '../art/sprites';
import { sampleCell } from './animate';

/** The most layers a tangle can have (docs/DESIGN.md §5). */
const LAYERS = 3;

/** Which tangle densities a cell with n layers mounts: a table, so a render allocates none. */
const UP_TO = Object.freeze([[], [1], [1, 2], [1, 2, 3]]);

/** How much of the cell the buried button fills, down in the corner of the tangle over it. */
const BUTTON_RATIO = 0.34;

const clamp01 = (v) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * The most layers this cell will be asked to draw. The `tangle` prop is the model *after* the
 * move in flight — the board commits the finished model and lets the tracks play back up to it,
 * so a cell untangling 3 down to 1 arrives here as 1 and would mount one density for a move that
 * shows three. The track's initial value is what the cell had before the move, and layers only
 * ever come off (nothing in move.js pushes `layers` upward), so it is the ceiling for the whole
 * move and for everything after it.
 */
const layerCap = (tangle, track) => {
  const most = track === undefined ? tangle : Math.max(tangle, track.initial.layers);
  return Math.min(Math.max(Math.round(most), 0), LAYERS);
};

/**
 * Does this cell ever draw `key` — as it stands, or at any point in the move it is playing? The
 * model alone cannot say: a moth spreads onto a clean cell mid-move and a button is uncovered and
 * collected inside one. The track's initial value covers where the cell started and a segment
 * covers anything the move puts there.
 * @param {boolean} resting  what the committed model says
 * @param {import('./timings').CellTrack} [track]
 * @param {'moth'|'button'} key
 */
const shows = (resting, track, key) =>
  resting || (track !== undefined && (track.initial[key] > 0 || track[key].length > 0));

/**
 * @param {object} props
 * @param {number} props.tangle    layers left, 0 for none
 * @param {boolean} props.moth
 * @param {number} props.stitch    unstitched layers left
 * @param {boolean} props.buried   a button under the tangle
 * @param {boolean} props.stitched is this cell part of the level's pattern at all
 * @param {number} props.cell      cell size in points
 * @param {number} props.ix
 * @param {number} props.iy
 * @param {import('./timings').CellTrack} [props.track]
 * @param {{ value: number }} props.clock
 */
const Cell = memo(({ tangle, moth, stitch, buried, stitched, cell, ix, iy, track, clock }) => {
  const rest = {
    x: 0,
    y: 0,
    scale: 1,
    layers: tangle,
    moth: moth ? 1 : 0,
    stitch,
    button: buried ? 1 : 0,
  };
  const shown = useDerivedValue(() =>
    track === undefined ? rest : sampleCell(track, clock.value - track.base),
  );

  const box = useAnimatedStyle(() => ({
    transform: [
      { translateX: shown.value.x * cell },
      { translateY: shown.value.y * cell },
      { scale: shown.value.scale },
    ],
  }));
  // The three stitch tiles are stacked finished-first, and `stitch` — 2, 1 or 0 layers left —
  // decides how much of each one shows: un1 covers the stitched tile from one layer up, un2
  // covers un1 from two, and a tween between two counts cross-fades them.
  const fill = useAnimatedStyle(() => ({ opacity: 1 - clamp01(shown.value.stitch) }));
  const outer = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.stitch) }));
  const inner = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.stitch - 1) }));
  const mothStyle = useAnimatedStyle(() => ({
    opacity: clamp01(shown.value.moth),
    transform: [{ scale: clamp01(shown.value.moth) }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: clamp01(shown.value.button) }));

  const fullCell = { width: cell, height: cell };
  const buttonSize = Math.round(cell * BUTTON_RATIO);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.cell, { left: ix * cell, top: iy * cell, width: cell, height: cell }, box]}
    >
      {stitched ? (
        <>
          <Animated.View style={[styles.tile, fill]}>
            <SvgAst ast={STITCH.done} override={fullCell} />
          </Animated.View>
          <Animated.View style={[styles.tile, outer]}>
            <SvgAst ast={STITCH.un1} override={fullCell} />
          </Animated.View>
          <Animated.View style={[styles.tile, inner]}>
            <SvgAst ast={STITCH.un2} override={fullCell} />
          </Animated.View>
        </>
      ) : null}
      {UP_TO[layerCap(tangle, track)].map((layer) => (
        <TangleLayer key={layer} layer={layer} size={cell} shown={shown} />
      ))}
      {shows(buried, track, 'button') ? (
        // Buried, but drawn over the tangle: a button nobody can see is a goal nobody can plan
        // for. It keeps its own margin inside its box, so the corner needs no inset here.
        <Animated.View
          style={[styles.button, { width: buttonSize, height: buttonSize }, buttonStyle]}
        >
          <SvgAst ast={BUTTON} override={{ width: buttonSize, height: buttonSize }} />
        </Animated.View>
      ) : null}
      {shows(moth, track, 'moth') ? (
        <Animated.View style={[styles.tile, mothStyle]}>
          <SvgAst ast={MOTH} override={fullCell} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
});

/**
 * One tangle density. The three are exclusive rather than stacked: each drawing already covers
 * the whole cell at its own density, so two of them showing at once is mud rather than two
 * layers. clamp01(1 - |layers - k|) gives the k-layer tile the cell to itself at rest — at 2
 * layers the 2 is opaque and the 1 and the 3 are at nothing — and cross-fades only the two
 * either side of a value mid-tween, where 1.5 layers is half of each.
 */
const TangleLayer = memo(({ layer, size, shown }) => {
  const style = useAnimatedStyle(() => ({
    opacity: clamp01(1 - Math.abs(shown.value.layers - layer)),
  }));
  return (
    <Animated.View style={[styles.tile, style]}>
      <SvgAst ast={TANGLE[layer]} override={{ width: size, height: size }} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cell: { position: 'absolute' },
  tile: { position: 'absolute', left: 0, top: 0 },
  button: { position: 'absolute', right: 0, bottom: 0 },
});

export default Cell;
