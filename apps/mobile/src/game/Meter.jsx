// The frog meter, as a placeholder. §11 puts the real thing beside the board as a round dial
// with the goals panel; that arrives with the HUD in phase 4-5. Until then a row of pips under
// the board is enough to watch the charge rise and the frog drop, which is what phase 3's
// "reads clearly" needs.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PALETTE } from '../art/palette';

const PIP = 8;

/**
 * @param {object} props
 * @param {{ kind: string, charge: number, full: number }} props.meter
 * @param {{ value: number }} props.fill  0 to 1, animated by the board
 * @param {number} props.width            the board's width, so the row lines up under it
 */
const Meter = ({ meter, fill, width }) => {
  const pips = Array.from({ length: meter.full }, (_, i) => i);
  return (
    <View style={[styles.row, { width }]} pointerEvents="none">
      {pips.map((i) => (
        <Pip key={i} index={i} total={meter.full} fill={fill} />
      ))}
    </View>
  );
};

const Pip = ({ index, total, fill }) => {
  const style = useAnimatedStyle(() => ({
    opacity: fill.value * total >= index + 1 ? 1 : 0.18,
  }));
  return <Animated.View style={[styles.pip, style]} />;
};

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    bottom: -PIP * 2.5,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  pip: { width: PIP, height: PIP, borderRadius: PIP / 2, backgroundColor: PALETTE.olive },
});

export default Meter;
