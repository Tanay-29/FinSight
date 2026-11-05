/**
 * The chart under an "Ask anything" tool: up to two lines over time, or a
 * breakdown of bars.
 *
 * Lines draw themselves in when a tool first opens and then follow the
 * sliders without redrawing, so dragging feels direct. The last point of each
 * line carries its value, so the chart can be read without an axis. Press and
 * slide on the chart to read every line at any point in time.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { smoothPath, areaPath, nearestIndex, niceCeil } from '../charts/curve';
import { ScrubOverlay } from '../charts/ScrubOverlay';
import { BarFill } from '../BarFill';
import * as haptics from '../../utils/haptics';
import type { ToolSeries, ToolBar } from '../../utils/askTools';
import { inrShort } from '../../utils/moneyMath';
import { COLORS, FONTS, MOTION } from '../../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const toneColour = (tone: ToolSeries['tone'] | ToolBar['tone']) =>
    tone === 'bad' ? COLORS.semantic.loss
        : tone === 'secondary' || tone === 'muted' ? COLORS.text.tertiary
            : COLORS.brand.primary;

/** Spread end labels apart so two lines ending close together stay readable. */
function labelTops(wanted: number[], maxTop: number, gap = 15): number[] {
    const order = wanted.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < order.length; k++) {
        const overlap = order[k - 1].y + gap - order[k].y;
        if (overlap > 0) { order[k - 1].y -= overlap / 2; order[k].y += overlap / 2; }
    }
    const out: number[] = [];
    order.forEach(({ y, i }) => { out[i] = Math.min(maxTop, Math.max(0, y)); });
    return out;
}

/** Thin a long series so a 240-month line is not 240 path segments. */
function thin(points: number[], max = 90): number[] {
    if (points.length <= max) return points;
    const step = (points.length - 1) / (max - 1);
    return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

export const LinesChart: React.FC<{ series: ToolSeries[]; xUnit: 'year' | 'month'; drawKey: string; height?: number }> = ({
    series, xUnit, drawKey, height = 190,
}) => {
    const [width, setWidth] = useState(0);
    const [at, setAt] = useState<number | null>(null);
    const reduced = useReducedMotion();
    const progress = useSharedValue(reduced ? 1 : 0);

    const PAD_L = 4;
    const PAD_R = 64;
    const PAD_TOP = 14;
    const PAD_BOTTOM = 22;
    const baseline = height - PAD_BOTTOM;

    const model = useMemo(() => {
        if (width <= 0) return null;
        const len = Math.max(...series.map((s) => s.points.length));
        const max = niceCeil(Math.max(1, ...series.flatMap((s) => s.points.filter(Number.isFinite))));
        const usable = height - PAD_TOP - PAD_BOTTOM;
        const plotW = width - PAD_L - PAD_R;
        const lines = series.map((s) => {
            const raw = thin(s.points);
            // A shorter series ends early along the same time axis.
            const reach = (s.points.length - 1) / Math.max(1, len - 1);
            const pts = raw.map((v, i) => ({
                x: PAD_L + (i / Math.max(1, raw.length - 1)) * reach * plotW,
                y: baseline - (Math.max(0, Number.isFinite(v) ? v : 0) / max) * usable,
            }));
            const d = smoothPath(pts);
            const area = areaPath(d, pts, baseline);
            return { s, raw, pts, d, area, end: pts[pts.length - 1], last: s.points[s.points.length - 1] };
        });
        const dash = (width + height) * 3;
        // Scrub positions come from the longest line, so every line can be
        // read at the same moment in time.
        const longest = lines.reduce((m, l) => (l.pts.length > m.pts.length ? l : m), lines[0]);
        return { lines, len, dash, max, usable, plotW, longest };
    }, [series, width, height, baseline]);

    // Redraw only when a new tool opens, not on every slider tick.
    useEffect(() => {
        if (reduced) return;
        progress.value = 0;
        progress.value = withTiming(1, { duration: 900, easing: Easing.bezier(...MOTION.easing.reveal) });
    }, [drawKey, reduced, progress]);

    const lineProps = useAnimatedProps(() => ({ strokeDashoffset: model ? model.dash * (1 - progress.value) : 0 }));
    const areaProps = useAnimatedProps(() => ({ opacity: progress.value }));

    const span = model ? model.len - 1 : 0;

    const scrub = (x: number) => {
        if (!model) return;
        const i = nearestIndex(model.longest.pts, x);
        if (i !== at) { haptics.select(); setAt(i); }
    };
    // Where along the time axis the finger is, 0 to 1, and each line's value there.
    const frac = model && at !== null ? at / Math.max(1, model.longest.pts.length - 1) : null;
    const readings = model && frac !== null ? model.lines.map((l) => {
        const reach = (l.s.points.length - 1) / Math.max(1, model.len - 1);
        if (frac > reach + 1e-6) return null;
        const j = Math.round((frac / Math.max(reach, 1e-6)) * (l.raw.length - 1));
        return { l, v: l.raw[j], p: l.pts[j] };
    }) : null;
    const atX = model && at !== null ? model.longest.pts[at].x : 0;
    const atSpan = frac !== null ? Math.round(frac * span) : 0;
    const atLabel = xUnit === 'year' ? `Year ${atSpan}` : atSpan >= 24 ? `Year ${Math.round(atSpan / 12)}` : `Month ${atSpan}`;
    const spanLabel = xUnit === 'year' ? `${span} yr` : span >= 24 ? `${Math.round(span / 12)} yr` : `${span} mo`;

    return (
        <View>
            <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
                {model ? (
                    <Svg width={width} height={height}>
                        <Defs>
                            <LinearGradient id="askFill" x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={toneColour(series[0].tone)} stopOpacity={0.22} />
                                <Stop offset="1" stopColor={toneColour(series[0].tone)} stopOpacity={0} />
                            </LinearGradient>
                        </Defs>
                        {[1, 0.5].map((f) => (
                            <Line key={f} x1={PAD_L} y1={baseline - f * model.usable} x2={width - PAD_R} y2={baseline - f * model.usable} stroke={COLORS.border.default} strokeWidth={1} strokeDasharray={[2, 4]} />
                        ))}
                        <Line x1={PAD_L} y1={baseline} x2={width - PAD_R} y2={baseline} stroke={COLORS.border.strong} strokeWidth={1} />
                        {model.lines[0] ? <AnimatedPath d={model.lines[0].area} fill="url(#askFill)" animatedProps={areaProps} /> : null}
                        {model.lines.map((l, i) => (
                            <AnimatedPath
                                key={i}
                                d={l.d}
                                fill="none"
                                stroke={toneColour(l.s.tone)}
                                strokeWidth={i === 0 ? 2.75 : 2}
                                strokeDasharray={[model.dash, model.dash]}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                animatedProps={lineProps}
                            />
                        ))}
                        {readings ? (
                            <>
                                <Line x1={atX} y1={PAD_TOP - 6} x2={atX} y2={baseline} stroke={COLORS.text.tertiary} strokeWidth={1} />
                                {readings.map((r, i) => r ? (
                                    <Circle key={`s${i}`} cx={r.p.x} cy={r.p.y} r={5} fill={COLORS.surface.primary} stroke={toneColour(r.l.s.tone)} strokeWidth={2.5} />
                                ) : null)}
                            </>
                        ) : model.lines.map((l, i) => (
                            <Circle key={`c${i}`} cx={l.end.x} cy={l.end.y} r={4} fill={COLORS.surface.primary} stroke={toneColour(l.s.tone)} strokeWidth={2} />
                        ))}
                    </Svg>
                ) : null}
                {model ? labelTops(model.lines.map((l) => l.end.y - 8), height - PAD_BOTTOM - 14).map((top, i) => (
                    <Text
                        key={`t${i}`}
                        numberOfLines={1}
                        style={{ position: 'absolute', left: model.lines[i].end.x + 8, top, width: PAD_R - 8, fontFamily: FONTS.bold, fontSize: 12, color: toneColour(model.lines[i].s.tone) }}
                    >
                        {Number.isFinite(model.lines[i].last) ? `₹${inrShort(model.lines[i].last)}` : ''}
                    </Text>
                )) : null}
                <Text style={{ position: 'absolute', left: PAD_L, bottom: 2, fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>Now</Text>
                {model ? <ScrubOverlay onScrub={scrub} onEnd={() => setAt(null)} label="Chart. Press and slide to read it at any point." /> : null}
                <Text style={{ position: 'absolute', right: PAD_R, bottom: 2, fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>{spanLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 8, minHeight: 18 }}>
                {readings ? <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, color: COLORS.text.primary }}>{atLabel}</Text> : null}
                {series.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: toneColour(s.tone), marginRight: 6 }} />
                        <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text.secondary }}>
                            {s.label}
                            {readings && readings[i] && Number.isFinite(readings[i]!.v) ? (
                                <Text style={{ fontFamily: FONTS.bold, color: toneColour(s.tone) }}> ₹{inrShort(readings[i]!.v)}</Text>
                            ) : null}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

export const BarsChart: React.FC<{ bars: ToolBar[] }> = ({ bars }) => {
    const max = Math.max(1, ...bars.map((b) => b.value));
    const extras = bars.filter((b) => b.tone === 'bad').reduce((s, b) => s + b.value, 0);
    return (
        <View>
            {bars.map((b, i) => {
                // The price dwarfs the fees; give the fees their own scale so they read.
                const scaleMax = b.tone === 'bad' ? Math.max(1, extras) : max;
                return (
                    <View key={i} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text.secondary }}>{b.label}</Text>
                            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: b.tone === 'bad' ? COLORS.semantic.alertCritical : COLORS.text.primary }}>₹{inrShort(b.value)}</Text>
                        </View>
                        <BarFill percent={Math.max(2, (b.value / scaleMax) * 100)} color={toneColour(b.tone)} height={10} delay={i * 80} />
                    </View>
                );
            })}
        </View>
    );
};
