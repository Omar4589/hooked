// The board's two gestures: swipe to swap, double-tap to fire a special in place (§4). Both run
// on the UI thread (react-native-gesture-handler workletizes their callbacks when Reanimated is
// installed), so the cell and the direction are worked out there and only numbers cross to JS,
// where the engine lives. onBegin records the touch-down point because both native pan handlers
// reset their translation the moment the gesture activates.
//
// They race rather than wait on each other: the pan only activates once the finger has travelled
// past the swipe threshold, so a tap can never also be a swipe, and racing keeps a swipe from
// sitting out the double-tap window before it starts.
//
// Every gesture is sent, including during playback: the board decides whether it can play it
// now, remember it for when the move settles, or let it go.

import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { cellAt } from './geometry';
import { swipeDirection, swipeThreshold } from './input';

/**
 * @param {object} props
 * @param {ReturnType<typeof import('./geometry').fitBoard>} props.layout  null until measured
 * @param {(col: number, row: number, dir: string) => void} props.onSwipe  keep it stable
 * @param {(col: number, row: number) => void} props.onTap  keep it stable
 */
export const useBoardGestures = ({ layout, onSwipe, onTap }) => {
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const cell = layout === null ? 0 : layout.cell;
  const columns = layout === null ? 0 : layout.columns;
  const rows = layout === null ? 0 : layout.rows;
  const threshold = cell === 0 ? 1 : swipeThreshold(cell);
  return useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .activeOffsetX([-threshold, threshold])
      .activeOffsetY([-threshold, threshold])
      .onBegin((e) => {
        'worklet';
        originX.value = e.x;
        originY.value = e.y;
      })
      .onStart((e) => {
        'worklet';
        if (cell === 0) return;
        const dir = swipeDirection(e.x - originX.value, e.y - originY.value);
        if (dir === null) return;
        const from = cellAt(originX.value, originY.value, cell, columns, rows);
        if (from === null) return;
        scheduleOnRN(onSwipe, from.x, from.y, dir);
      });
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(300)
      .onEnd((e) => {
        'worklet';
        if (cell === 0) return;
        const target = cellAt(e.x, e.y, cell, columns, rows);
        if (target === null) return;
        scheduleOnRN(onTap, target.x, target.y);
      });
    return Gesture.Race(pan, doubleTap);
  }, [cell, columns, rows, threshold, onSwipe, onTap, originX, originY]);
};
