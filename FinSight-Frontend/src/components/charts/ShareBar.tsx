/**
 * One bar split into parts, each part's width its share of the whole.
 *
 * The parts grow in from the left one after another on first paint, so the
 * eye reads them in order, biggest first. A selected part stays full colour
 * and the rest dim, which is how the list under it can point into the bar.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { COLORS } from '../../theme/tokens';

export interface Share { key: string; value: number; color: string }

const Part: React.FC<{ pct: number; color: string; delay: number; dim: boolean; first: boolean }> = ({ pct, color, delay, dim, first }) => {
    const reduced = useReducedMotion();
    const w = useSharedValue(reduced ? pct : 0);
    const o = useSharedValue(1);
    useEffect(() => {
        w.value = reduced ? pct : withDelay(delay, withTiming(pct, { duration: 700, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
    }, [pct, delay, reduced, w]);
    useEffect(() => {
        o.value = withTiming(dim ? 0.28 : 1, { duration: 180 });
    }, [dim, o]);
    const style = useAnimatedStyle(() => ({ width: `${w.value}%`, opacity: o.value }));
    return (
        <Animated.View style={[{ height: '100%', paddingLeft: first ? 0 : 2 }, style]}>
            <View style={{ flex: 1, borderRadius: 3, backgroundColor: color }} />
        </Animated.View>
    );
};

export const ShareBar: React.FC<{ parts: Share[]; height?: number; selected?: string | null }> = ({ parts, height = 14, selected }) => {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    return (
        <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: COLORS.surface.tertiary }}>
            {parts.map((p, i) => (
                <Part key={p.key} pct={(p.value / total) * 100} color={p.color} delay={i * 70} dim={!!selected && selected !== p.key} first={i === 0} />
            ))}
        </View>
    );
};
