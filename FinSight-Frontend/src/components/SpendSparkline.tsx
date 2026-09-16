/**
 * Thirty days of spending as one drawn line.
 *
 * Replaces a 7-point polyline that sat under a "Last 30 days" heading, was
 * scaled by a viewBox that never matched the card width, and matched
 * transactions by UTC date so an evening entry in India landed on the next
 * day's point. This one takes measured pixels, local days, and draws itself
 * in on first paint.
 *
 * The line is a Catmull-Rom spline through the daily totals, filled to the
 * baseline with a gradient that fades to nothing, so the shape reads as
 * weight rather than as a stock chart. The heaviest day gets a dot and a
 * label; today gets a pulse-free ring so the eye lands on "now". Weekly
 * ticks along the baseline give the thirty days a scale without an axis.
 *
 * Draw-in uses stroke-dashoffset on a Reanimated-wrapped Path, on the UI
 * thread; reduced motion paints the finished line at once.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { COLORS, FONTS, MOTION } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SparkDay {
    /** 'YYYY-MM-DD', local. */
    key: string;
    amount: number;
}

interface Props {
    days: SparkDay[];
    height?: number;
}

/** Catmull-Rom to cubic bezier, so the curve passes through every point. */
function splinePath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
}

const dayLabel = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const SpendSparkline: React.FC<Props> = ({ days, height = 96 }) => {
    const [width, setWidth] = useState(0);
    const reduced = useReducedMotion();
    const progress = useSharedValue(reduced ? 1 : 0);

    const PAD_X = 6;
    const PAD_TOP = 22;
    const PAD_BOTTOM = 18;
    const baseline = height - PAD_BOTTOM;

    const model = useMemo(() => {
        if (width <= 0 || days.length < 2) return null;
        const max = Math.max(...days.map((d) => d.amount));
        const usable = height - PAD_TOP - PAD_BOTTOM;
        const pts = days.map((d, i) => ({
            x: PAD_X + (i / (days.length - 1)) * (width - PAD_X * 2),
            y: max > 0 ? baseline - (d.amount / max) * usable : baseline,
        }));
        const line = splinePath(pts);
        const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${baseline} L${pts[0].x.toFixed(1)},${baseline} Z`;
        let peakIdx = 0;
        days.forEach((d, i) => { if (d.amount > days[peakIdx].amount) peakIdx = i; });
        const ticks = pts.filter((_, i) => (days.length - 1 - i) % 7 === 0);
        // Generous upper bound on the path length, for the dash draw-in.
        const dash = width * 2 + height * 2;
        return { pts, line, area, peakIdx, max, ticks, dash };
    }, [days, width, height, baseline]);

    useEffect(() => {
        if (!model || reduced) return;
        progress.value = 0;
        progress.value = withTiming(1, { duration: 900, easing: Easing.bezier(...MOTION.easing.reveal) });
    }, [model, reduced, progress]);

    const lineProps = useAnimatedProps(() => ({
        strokeDashoffset: model ? model.dash * (1 - progress.value) : 0,
    }));
    const areaProps = useAnimatedProps(() => ({ opacity: progress.value }));

    const empty = !model || model.max <= 0;

    return (
        <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 ? (
                <Svg width={width} height={height}>
                    <Defs>
                        <LinearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={COLORS.brand.primary} stopOpacity={0.28} />
                            <Stop offset="1" stopColor={COLORS.brand.primary} stopOpacity={0} />
                        </LinearGradient>
                    </Defs>

                    {/* Baseline and weekly ticks: the scale, without an axis. */}
                    <Line x1={PAD_X} y1={baseline} x2={width - PAD_X} y2={baseline} stroke={COLORS.border.default} strokeWidth={1} />
                    {model?.ticks.map((t, i) => (
                        <Line key={i} x1={t.x} y1={baseline} x2={t.x} y2={baseline + 4} stroke={COLORS.border.strong} strokeWidth={1} />
                    ))}

                    {model && !empty ? (
                        <>
                            <AnimatedPath d={model.area} fill="url(#spendFill)" animatedProps={areaProps} />
                            <AnimatedPath
                                d={model.line}
                                fill="none"
                                stroke={COLORS.brand.primary}
                                strokeWidth={2.25}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray={[model.dash, model.dash]}
                                animatedProps={lineProps}
                            />
                            {/* Heaviest day */}
                            <Circle cx={model.pts[model.peakIdx].x} cy={model.pts[model.peakIdx].y} r={4} fill={COLORS.brand.primaryDark} />
                            {/* Today */}
                            <Circle cx={model.pts[model.pts.length - 1].x} cy={model.pts[model.pts.length - 1].y} r={5} fill={COLORS.surface.primary} stroke={COLORS.brand.primary} strokeWidth={2} />
                        </>
                    ) : null}
                </Svg>
            ) : null}

            {model && !empty ? (
                <Text
                    style={{
                        position: 'absolute',
                        top: Math.max(0, model.pts[model.peakIdx].y - 20),
                        left: Math.min(Math.max(0, model.pts[model.peakIdx].x - 40), width - 96),
                        width: 96,
                        textAlign: model.pts[model.peakIdx].x > width - 60 ? 'right' : model.pts[model.peakIdx].x < 60 ? 'left' : 'center',
                        fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.brand.primaryDark,
                        fontVariant: ['tabular-nums'],
                    }}
                >
                    {dayLabel(days[model.peakIdx].key)} {'·'} {Math.round(days[model.peakIdx].amount).toLocaleString('en-IN')}
                </Text>
            ) : null}

            {empty && width > 0 ? (
                <Text style={{ position: 'absolute', top: PAD_TOP + 8, left: 0, right: 0, textAlign: 'center', fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text.tertiary }}>
                    Nothing logged in the last 30 days
                </Text>
            ) : null}

            <View style={{ position: 'absolute', bottom: 0, left: PAD_X, right: PAD_X, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: COLORS.text.tertiary }}>{days.length > 0 ? dayLabel(days[0].key) : ''}</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: COLORS.text.tertiary }}>Today</Text>
            </View>
        </View>
    );
};
