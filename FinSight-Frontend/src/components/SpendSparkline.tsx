/**
 * Thirty days of spending as one curve you can run a finger along.
 *
 * At rest it shows the shape of the month: a smooth line through each day's
 * total, a soft gradient under it, two faint gridlines with their amounts,
 * the heaviest day labelled, and a slow pulse on today.
 *
 * Press and slide to read any single day: a guide line follows the finger,
 * the point on the curve grows, and `onScrub` tells the card above which day
 * is under the finger, so its big number can show that day instead of the
 * month. A light tick of haptics marks each new day.
 *
 * One very large day (rent, say) would flatten every other day into the
 * baseline, so the scale stops short of it (see `softMax`) and that day is
 * drawn clipped at the top with a small mark, its real amount in the label.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useAnimatedProps, useSharedValue, withTiming, withRepeat, withDelay, Easing, useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { smoothPath, areaPath, nearestIndex, softMax, niceCeil } from './charts/curve';
import { ScrubOverlay } from './charts/ScrubOverlay';
import { inrShort } from '../utils/moneyMath';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface SparkDay {
    /** 'YYYY-MM-DD', local. */
    key: string;
    amount: number;
}

interface Props {
    days: SparkDay[];
    height?: number;
    /** The day under the finger, or null when the finger lifts. */
    onScrub?: (index: number | null) => void;
}

export const dayLabel = (key: string, withWeekday = false) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', withWeekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
};

const PAD_X = 8;
const PAD_RIGHT = 30;
const PAD_TOP = 24;
const PAD_BOTTOM = 20;

export const SpendSparkline: React.FC<Props> = ({ days, height = 132, onScrub }) => {
    const [width, setWidth] = useState(0);
    const [active, setActive] = useState<number | null>(null);
    const reduced = useReducedMotion();
    const progress = useSharedValue(reduced ? 1 : 0);
    const pulse = useSharedValue(0);
    const baseline = height - PAD_BOTTOM;

    const model = useMemo(() => {
        if (width <= 0 || days.length < 2) return null;
        const amounts = days.map((d) => d.amount);
        const max = Math.max(...amounts);
        const top = niceCeil(softMax(amounts));
        const usable = baseline - PAD_TOP;
        const plotW = width - PAD_X - PAD_RIGHT;
        const pts = days.map((d, i) => ({
            x: PAD_X + (i / (days.length - 1)) * plotW,
            y: top > 0 ? baseline - (Math.min(d.amount, top) / top) * usable : baseline,
        }));
        const line = smoothPath(pts);
        const area = areaPath(line, pts, baseline);
        let peak = 0;
        amounts.forEach((a, i) => { if (a > amounts[peak]) peak = i; });
        const clipped = amounts.map((a) => top > 0 && a > top);
        const dash = width * 3 + height * 4;
        return { pts, line, area, peak, max, top, clipped, dash, plotW };
    }, [days, width, height, baseline]);

    useEffect(() => {
        if (!model || reduced) return;
        progress.value = 0;
        progress.value = withTiming(1, { duration: 1100, easing: Easing.bezier(0.23, 1, 0.32, 1) });
        pulse.value = 0;
        pulse.value = withDelay(1100, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
        // Draw once per new data and width, not on every scrub.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.line, reduced]);

    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: model ? model.dash * (1 - progress.value) : 0 }));
    const areaProps = useAnimatedProps(() => ({ opacity: progress.value }));
    const pulseProps = useAnimatedProps(() => ({ r: 5 + pulse.value * 9, opacity: 0.35 * (1 - pulse.value) }));

    const empty = !model || model.max <= 0;

    const scrub = (x: number) => {
        if (!model || empty) return;
        const i = nearestIndex(model.pts, x);
        if (i !== active) {
            haptics.select();
            setActive(i);
            onScrub?.(i);
        }
    };
    const end = () => { setActive(null); onScrub?.(null); };

    const last = model ? model.pts[model.pts.length - 1] : null;
    const a = active !== null && model ? model.pts[active] : null;

    return (
        <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 ? (
                <Svg width={width} height={height}>
                    <Defs>
                        <LinearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={COLORS.brand.primary} stopOpacity={0.30} />
                            <Stop offset="0.7" stopColor={COLORS.brand.primary} stopOpacity={0.06} />
                            <Stop offset="1" stopColor={COLORS.brand.primary} stopOpacity={0} />
                        </LinearGradient>
                    </Defs>

                    {/* Two faint gridlines give the curve a scale without an axis. */}
                    {model && !empty ? [1, 0.5].map((f) => {
                        const y = baseline - f * (baseline - PAD_TOP);
                        return <Line key={f} x1={PAD_X} y1={y} x2={PAD_X + model.plotW} y2={y} stroke={COLORS.border.default} strokeWidth={1} strokeDasharray={[2, 4]} />;
                    }) : null}
                    <Line x1={PAD_X} y1={baseline} x2={width - PAD_RIGHT} y2={baseline} stroke={COLORS.border.strong} strokeWidth={1} />

                    {model && !empty ? (
                        <>
                            <AnimatedPath d={model.area} fill="url(#spendFill)" animatedProps={areaProps} />
                            <AnimatedPath
                                d={model.line}
                                fill="none"
                                stroke={COLORS.brand.primary}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray={[model.dash, model.dash]}
                                animatedProps={lineProps}
                            />
                            {/* A day too big for the scale: a cap mark where it leaves the chart. */}
                            {model.clipped.map((c, i) => c ? (
                                <Path key={`cap${i}`} d={`M${model.pts[i].x - 4},${PAD_TOP + 2} L${model.pts[i].x},${PAD_TOP - 3} L${model.pts[i].x + 4},${PAD_TOP + 2}`} stroke={COLORS.brand.primaryDark} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            ) : null)}

                            {a ? (
                                <>
                                    <Line x1={a.x} y1={PAD_TOP - 6} x2={a.x} y2={baseline} stroke={COLORS.text.tertiary} strokeWidth={1} />
                                    <Circle cx={a.x} cy={a.y} r={10} fill={COLORS.brand.primary} opacity={0.16} />
                                    <Circle cx={a.x} cy={a.y} r={5} fill={COLORS.surface.primary} stroke={COLORS.brand.primaryDark} strokeWidth={2.5} />
                                </>
                            ) : (
                                <>
                                    <Circle cx={model.pts[model.peak].x} cy={model.pts[model.peak].y} r={3.5} fill={COLORS.brand.primaryDark} />
                                    {last ? <AnimatedCircle cx={last.x} cy={last.y} fill={COLORS.brand.primary} animatedProps={pulseProps} /> : null}
                                    {last ? <Circle cx={last.x} cy={last.y} r={4.5} fill={COLORS.surface.primary} stroke={COLORS.brand.primary} strokeWidth={2.5} /> : null}
                                </>
                            )}
                        </>
                    ) : null}
                </Svg>
            ) : null}

            {/* Gridline amounts, on the right edge. */}
            {model && !empty ? [1, 0.5].map((f) => (
                <Text key={f} style={{ position: 'absolute', right: 0, width: PAD_RIGHT - 4, top: baseline - f * (baseline - PAD_TOP) - 7, textAlign: 'right', fontFamily: FONTS.medium, fontSize: 10, color: COLORS.text.tertiary, fontVariant: ['tabular-nums'] }}>
                    {inrShort(model.top * f)}
                </Text>
            )) : null}

            {/* Resting label on the heaviest day; hidden while scrubbing. */}
            {model && !empty && active === null ? (
                <Text
                    style={{
                        position: 'absolute',
                        top: Math.max(0, Math.min(model.pts[model.peak].y, PAD_TOP) - 22),
                        left: Math.min(Math.max(0, model.pts[model.peak].x - 50), width - PAD_RIGHT - 100),
                        width: 100,
                        textAlign: model.pts[model.peak].x > width - 80 ? 'right' : model.pts[model.peak].x < 50 ? 'left' : 'center',
                        fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.brand.link, fontVariant: ['tabular-nums'],
                    }}
                >
                    {dayLabel(days[model.peak].key)} {'·'} ₹{inrShort(days[model.peak].amount)}
                </Text>
            ) : null}

            {empty && width > 0 ? (
                <Text style={{ position: 'absolute', top: PAD_TOP + 14, left: 0, right: 0, textAlign: 'center', fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text.tertiary }}>
                    Nothing logged in the last 30 days
                </Text>
            ) : null}

            <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: PAD_X, right: PAD_RIGHT, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: COLORS.text.tertiary }}>{days.length > 0 ? dayLabel(days[0].key) : ''}</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: COLORS.text.tertiary }}>Today</Text>
            </View>

            {!empty ? <ScrubOverlay onScrub={scrub} onEnd={end} label="Daily spending chart. Press and slide to read a day." /> : null}
        </View>
    );
};
