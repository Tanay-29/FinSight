/**
 * BarFill - the coloured part of a progress or comparison bar.
 *
 * Three screens were each carrying their own copy of this: a clipped track
 * with a childless fill inside, and a mount flag flipped by a setState in an
 * effect so the fill had something to animate from. That flag cost a second
 * render of the whole screen on every mount, which is a strange price for a
 * bar sweeping out.
 *
 * The width lives on a shared value instead, so the sweep runs on the UI
 * thread and React never re-renders for it.
 *
 * Width is the right property here despite the usual rule against animating
 * layout: the fill is childless and clipped by its parent, so nothing else
 * re-lays-out, and unlike scaleX it keeps the rounded cap from smearing.
 */
import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
    useReducedMotion,
} from 'react-native-reanimated';
import { MOTION } from '../theme/tokens';

/** Strong ease-out. The bar covers most of its length early, then settles. */
const EASE_OUT = Easing.bezier(...MOTION.easing.reveal);

interface BarFillProps {
    /** 0 to 100. Values above 100 are clamped by the caller if that matters. */
    percent: number;
    /** Track height in points. */
    height?: number;
    /** Fill colour. Pass either this or fillClassName. */
    color?: string;
    /** Tailwind class for the fill, when the colour is a theme token. */
    fillClassName?: string;
    /** Tailwind class for the track. */
    trackClassName?: string;
    /** Staggers this bar behind the ones above it. */
    delay?: number;
    style?: StyleProp<ViewStyle>;
}

export const BarFill: React.FC<BarFillProps> = ({
    percent,
    height = 8,
    color,
    fillClassName,
    trackClassName = 'bg-surface-tertiary',
    delay = 0,
    style,
}) => {
    const reduced = useReducedMotion();
    const width = useSharedValue(reduced ? percent : 0);

    useEffect(() => {
        if (reduced) {
            width.set(percent);
            return;
        }
        width.set(withDelay(delay, withTiming(percent, { duration: MOTION.reveal, easing: EASE_OUT })));
    }, [percent, delay, reduced, width]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${width.get()}%`,
    }));

    return (
        <View
            className={`rounded-full overflow-hidden ${trackClassName}`}
            style={[{ height }, style]}
        >
            {/* NativeWind classes do not reach a Reanimated view, so the
                animated node carries only the width and the fill colour sits
                on a plain View inside it. */}
            <Animated.View style={[{ height: '100%', borderRadius: 9999, overflow: 'hidden' }, animatedStyle]}>
                <View
                    className={`flex-1 rounded-full ${fillClassName ?? ''}`}
                    style={color ? { backgroundColor: color } : undefined}
                />
            </Animated.View>
        </View>
    );
};

export default BarFill;
