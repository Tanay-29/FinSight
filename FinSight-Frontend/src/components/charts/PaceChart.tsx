/**
 * The month as a running total.
 *
 * A solid line climbs through each day so far, filled underneath. From today
 * a dashed line carries on to the last day at the current pace, ending on the
 * projected total. A flat line marks what came in (income), so the question
 * "will I run out?" is answered by whether the dash crosses it.
 *
 * Press and slide to read the running total on any day so far.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { smoothPath, areaPath, nearestIndex, niceCeil } from './curve';
import { ScrubOverlay } from './ScrubOverlay';
import { inrShort } from '../../utils/moneyMath';
import * as haptics from '../../utils/haptics';
import { COLORS, FONTS } from '../../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
    cumulative: number[];
    daysInMonth: number;
    projected: number;
    /** Drawn as a flat line when above zero. */
    limit?: number;
    limitLabel?: string;
    onScrub?: (day: number | null) => void;
    height?: number;
}

const PAD_L = 6;
const PAD_R = 34;
const PAD_TOP = 18;
const PAD_BOTTOM = 20;

export const PaceChart: React.FC<Props> = ({ cumulative, daysInMonth, projected, limit = 0, limitLabel, onScrub, height = 180 }) => {
    const [width, setWidth] = useState(0);
    const [at, setAt] = useState<number | null>(null);
    const reduced = useReducedMotion();
    const draw = useSharedValue(reduced ? 1 : 0);
    const dashIn = useSharedValue(reduced ? 1 : 0);
    const baseline = height - PAD_BOTTOM;

    const model = useMemo(() => {
        if (width <= 0 || cumulative.length === 0) return null;
        const top = niceCeil(Math.max(projected, limit, ...cumulative, 1) * 1.05);
        const plotW = width - PAD_L - PAD_R;
        // x runs from the start of the 1st (0) to the end of the last day.
        const xOf = (d: number) => PAD_L + (d / daysInMonth) * plotW;
        const yOf = (v: number) => baseline - (v / top) * (baseline - PAD_TOP);
        // From zero at the start of the month, so a rent payment on the 1st
        // reads as the jump it was.
        const pts = [{ x: xOf(0), y: yOf(0) }, ...cumulative.map((v, i) => ({ x: xOf(i + 1), y: yOf(v) }))];
        const line = smoothPath(pts);
        const area = areaPath(line, pts, baseline);
        const now = pts[pts.length - 1];
        const end = { x: xOf(daysInMonth), y: yOf(projected) };
        return { top, pts, line, area, now, end, limitY: limit > 0 ? yOf(limit) : null, dash: width * 3 + height * 3, plotW };
    }, [width, cumulative, daysInMonth, projected, limit, baseline, height]);

    useEffect(() => {
        if (!model || reduced) return;
        draw.value = 0;
        dashIn.value = 0;
        draw.value = withTiming(1, { duration: 900, easing: Easing.bezier(0.23, 1, 0.32, 1) });
        dashIn.value = withDelay(750, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.line, reduced]);

    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: model ? model.dash * (1 - draw.value) : 0 }));
    const areaProps = useAnimatedProps(() => ({ opacity: draw.value }));
    const projProps = useAnimatedProps(() => ({ opacity: dashIn.value }));

    const over = limit > 0 && projected > limit;
    const projColor = over ? COLORS.semantic.loss : COLORS.semantic.profit;

    const scrub = (x: number) => {
        if (!model) return;
        const i = nearestIndex(model.pts, x);
        if (i !== at) { haptics.select(); setAt(i); onScrub?.(Math.max(0, i - 1)); }
    };
    const end = () => { setAt(null); onScrub?.(null); };
    const a = model && at !== null ? model.pts[at] : null;

    return (
        <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {model ? (
                <Svg width={width} height={height}>
                    <Defs>
                        <LinearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={COLORS.brand.primary} stopOpacity={0.28} />
                            <Stop offset="1" stopColor={COLORS.brand.primary} stopOpacity={0} />
                        </LinearGradient>
                    </Defs>
                    {[1, 0.5].map((f) => (
                        <Line key={f} x1={PAD_L} x2={PAD_L + model.plotW} y1={baseline - f * (baseline - PAD_TOP)} y2={baseline - f * (baseline - PAD_TOP)} stroke={COLORS.border.default} strokeDasharray={[2, 4]} />
                    ))}
                    <Line x1={PAD_L} x2={PAD_L + model.plotW} y1={baseline} y2={baseline} stroke={COLORS.border.strong} />
                    {model.limitY !== null ? (
                        <Line x1={PAD_L} x2={PAD_L + model.plotW} y1={model.limitY} y2={model.limitY} stroke={COLORS.text.secondary} strokeWidth={1.25} strokeDasharray={[6, 4]} />
                    ) : null}

                    <AnimatedPath d={model.area} fill="url(#paceFill)" animatedProps={areaProps} />
                    <AnimatedPath d={model.line} fill="none" stroke={COLORS.brand.primary} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[model.dash, model.dash]} animatedProps={lineProps} />

                    {/* Today onwards, at the current pace. */}
                    <AnimatedPath
                        d={`M${model.now.x},${model.now.y} L${model.end.x},${model.end.y}`}
                        stroke={projColor} strokeWidth={2} strokeDasharray={[5, 5]} strokeLinecap="round" fill="none"
                        animatedProps={projProps}
                    />
                    <Circle cx={model.end.x} cy={model.end.y} r={4.5} fill={COLORS.surface.primary} stroke={projColor} strokeWidth={2.5} />

                    {a ? (
                        <>
                            <Line x1={a.x} x2={a.x} y1={PAD_TOP - 6} y2={baseline} stroke={COLORS.text.tertiary} />
                            <Circle cx={a.x} cy={a.y} r={10} fill={COLORS.brand.primary} opacity={0.16} />
                            <Circle cx={a.x} cy={a.y} r={5} fill={COLORS.surface.primary} stroke={COLORS.brand.primaryDark} strokeWidth={2.5} />
                        </>
                    ) : (
                        <Circle cx={model.now.x} cy={model.now.y} r={5} fill={COLORS.brand.primary} stroke={COLORS.surface.primary} strokeWidth={2} />
                    )}
                </Svg>
            ) : null}

            {model ? (
                <>
                    {[1, 0.5].map((f) => (
                        <Text key={f} style={{ position: 'absolute', right: 0, width: PAD_R - 4, top: baseline - f * (baseline - PAD_TOP) - 7, textAlign: 'right', fontFamily: FONTS.medium, fontSize: 10, color: COLORS.text.tertiary }}>
                            {inrShort(model.top * f)}
                        </Text>
                    ))}
                    {model.limitY !== null && limitLabel ? (
                        <Text style={{ position: 'absolute', left: PAD_L + 2, top: model.limitY - 16, fontFamily: FONTS.semibold, fontSize: 11, color: COLORS.text.secondary }}>
                            {limitLabel}
                        </Text>
                    ) : null}
                    <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: PAD_L, right: PAD_R, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: COLORS.text.tertiary }}>1st</Text>
                        <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: COLORS.text.tertiary }}>{daysInMonth}{daysInMonth === 31 ? 'st' : 'th'}</Text>
                    </View>
                    <ScrubOverlay onScrub={scrub} onEnd={end} label="Running total this month. Press and slide to read a day." />
                </>
            ) : null}
        </View>
    );
};
