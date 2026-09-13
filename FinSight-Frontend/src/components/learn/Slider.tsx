/**
 * A slider for the explorables.
 *
 * The whole point of an explorable is that the number under your thumb moves
 * the figures on screen at the same instant, so this is deliberately simple:
 * a PanResponder on the track, a value snapped to the step, and a haptic tick
 * on each step so the finger can feel the scale. No new dependency; the
 * gesture library is not in the project and this does not need it.
 *
 * The thumb grows under the finger through a Reanimated CSS transition, the
 * same mechanism PressableScale uses. The position is laid out from the
 * value, so it is always right after a resize or a theme change.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, PanResponder, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import * as haptics from '../../utils/haptics';
import { COLORS, FONTS, MOTION, TYPE } from '../../theme/tokens';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    /** How the value reads above the track. */
    format?: (value: number) => string;
    /** Optional captions under each end of the track. */
    minLabel?: string;
    maxLabel?: string;
    accentColor?: string;
}

const THUMB = 28;
const TRACK_H = 6;

export const Slider: React.FC<SliderProps> = ({
    label, value, min, max, step, onChange, format = (v) => String(v), minLabel, maxLabel, accentColor,
}) => {
    const [width, setWidth] = useState(0);
    const widthRef = useRef(0);
    const valueRef = useRef(value);
    useEffect(() => { valueRef.current = value; }, [value]);
    const [pressed, setPressed] = useState(false);
    const reduced = useReducedMotion();
    const accent = accentColor ?? COLORS.brand.primary;

    const pan = useMemo(() => {
        const clamp = (v: number) => Math.min(max, Math.max(min, v));
        const snap = (v: number) => clamp(Math.round(v / step) * step);
        const valueAt = (x: number) => {
            const w = widthRef.current;
            if (w <= 0) return valueRef.current;
            const ratio = Math.min(1, Math.max(0, x / w));
            return snap(min + ratio * (max - min));
        };
        const move = (x: number) => {
            const v = valueAt(x);
            if (v !== valueRef.current) { haptics.select(); onChange(v); }
        };
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                setPressed(true);
                move(e.nativeEvent.locationX);
            },
            onPanResponderMove: (e) => move(e.nativeEvent.locationX),
            onPanResponderRelease: () => setPressed(false),
            onPanResponderTerminate: () => setPressed(false),
        });
    }, [min, max, step, onChange]);

    const ratio = max > min ? (value - min) / (max - min) : 0;
    const left = Math.max(0, ratio * width - THUMB / 2);

    return (
        <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary }}>{label}</Text>
                <Text style={{ ...TYPE.amountSm, color: COLORS.text.primary }}>{format(value)}</Text>
            </View>
            <View
                // The hit area is taller than the track so a thumb can be caught.
                style={{ height: 40, justifyContent: 'center' }}
                onLayout={(e: LayoutChangeEvent) => {
                    widthRef.current = e.nativeEvent.layout.width;
                    setWidth(e.nativeEvent.layout.width);
                }}
                accessibilityRole="adjustable"
                accessibilityLabel={label}
                accessibilityValue={{ min, max, now: value, text: format(value) }}
                {...pan.panHandlers}
            >
                <View style={{ height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: COLORS.surface.tertiary }}>
                    <View style={{ width: `${ratio * 100}%`, height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: accent }} />
                </View>
                <Animated.View
                    pointerEvents="none"
                    style={[{
                        position: 'absolute',
                        left,
                        width: THUMB,
                        height: THUMB,
                        borderRadius: THUMB / 2,
                        backgroundColor: COLORS.surface.primary,
                        borderWidth: 2,
                        borderColor: accent,
                        shadowColor: '#3A2E22',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.12,
                        shadowRadius: 4,
                        elevation: 2,
                        transform: [{ scale: pressed && !reduced ? 1.15 : 1 }],
                        transitionProperty: ['transform'],
                        transitionDuration: MOTION.press,
                        transitionTimingFunction: 'ease-out',
                    } as ViewStyle]}
                />
            </View>
            {minLabel || maxLabel ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>{minLabel}</Text>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>{maxLabel}</Text>
                </View>
            ) : null}
        </View>
    );
};
