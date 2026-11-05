/**
 * A progress ring that fills itself in.
 *
 * The arc grows from empty to its value when it first appears and glides to
 * any new value after that, on the UI thread, so a deposit is something you
 * watch happen rather than a number that changes. Optional `preview` draws a
 * second, lighter arc past the filled one: what the ring will look like after
 * an amount that has not been added yet.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
    /** 0 to 1. */
    value: number;
    /** 0 to 1, drawn lighter beyond `value`. */
    preview?: number;
    size: number;
    stroke?: number;
    color: string;
    trackColor?: string;
    children?: React.ReactNode;
}

export const ProgressRing: React.FC<Props> = ({ value, preview, size, stroke = 6, color, trackColor, children }) => {
    const reduced = useReducedMotion();
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const shown = useSharedValue(reduced ? value : 0);
    const ahead = useSharedValue(reduced ? (preview ?? 0) : 0);

    useEffect(() => {
        const v = Math.max(0, Math.min(1, value));
        shown.value = reduced ? v : withTiming(v, { duration: 900, easing: Easing.bezier(0.23, 1, 0.32, 1) });
    }, [value, reduced, shown]);

    useEffect(() => {
        const p = Math.max(0, Math.min(1, preview ?? 0));
        ahead.value = reduced ? p : withTiming(p, { duration: 320, easing: Easing.out(Easing.cubic) });
    }, [preview, reduced, ahead]);

    const fill = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - shown.value) }));
    const next = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(shown.value, ahead.value)) }));

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? COLORS.surface.tertiary} strokeWidth={stroke} fill="none" />
                {preview !== undefined ? (
                    <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={0.35} strokeWidth={stroke} fill="none"
                        strokeDasharray={[c, c]} strokeLinecap="round" animatedProps={next} />
                ) : null}
                <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
                    strokeDasharray={[c, c]} strokeLinecap="round" animatedProps={fill} />
            </Svg>
            {children}
        </View>
    );
};
