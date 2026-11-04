/**
 * The chart under an "Ask anything" tool: up to two lines over time, or a
 * breakdown of bars.
 *
 * Lines draw themselves in when a tool first opens, the same stroke-dashoffset
 * technique as SpendSparkline, and then follow the sliders without redrawing
 * so dragging feels direct. The last point of each line carries its value, so
 * the chart can be read without an axis.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import type { ToolSeries, ToolBar } from '../../utils/askTools';
import { inrShort } from '../../utils/moneyMath';
import { COLORS, FONTS, MOTION } from '../../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const toneColour = (tone: ToolSeries['tone'] | ToolBar['tone']) =>
    tone === 'bad' ? COLORS.semantic.loss
        : tone === 'secondary' || tone === 'muted' ? COLORS.text.tertiary
            : COLORS.brand.primary;

function linePath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ` L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    return d;
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
        const max = Math.max(1, ...series.flatMap((s) => s.points.filter(Number.isFinite)));
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
            const d = linePath(pts);
            const area = `${d} L${pts[pts.length - 1].x.toFixed(1)},${baseline} L${pts[0].x.toFixed(1)},${baseline} Z`;
            return { s, pts, d, area, end: pts[pts.length - 1], last: s.points[s.points.length - 1] };
        });
        const dash = (width + height) * 3;
        return { lines, len, dash };
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
                        <Line x1={PAD_L} y1={baseline} x2={width - PAD_R} y2={baseline} stroke={COLORS.border.default} strokeWidth={1} />
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
                        {model.lines.map((l, i) => (
                            <Circle key={`c${i}`} cx={l.end.x} cy={l.end.y} r={4} fill={COLORS.surface.primary} stroke={toneColour(l.s.tone)} strokeWidth={2} />
                        ))}
                    </Svg>
                ) : null}
                {model ? model.lines.map((l, i) => (
                    <Text
                        key={`t${i}`}
                        numberOfLines={1}
                        style={{
                            position: 'absolute', left: l.end.x + 8, top: Math.min(height - PAD_BOTTOM - 14, Math.max(0, l.end.y - 8 + (i === 1 && model.lines[0] && Math.abs(model.lines[0].end.y - l.end.y) < 16 ? 16 : 0))),
                            width: PAD_R - 8, fontFamily: FONTS.bold, fontSize: 12, color: toneColour(l.s.tone),
                        }}
                    >
                        {Number.isFinite(l.last) ? `₹${inrShort(l.last)}` : ''}
                    </Text>
                )) : null}
                <Text style={{ position: 'absolute', left: PAD_L, bottom: 2, fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>Now</Text>
                <Text style={{ position: 'absolute', right: PAD_R, bottom: 2, fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>{spanLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
                {series.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: toneColour(s.tone), marginRight: 6 }} />
                        <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text.secondary }}>{s.label}</Text>
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
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: COLORS.surface.tertiary, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.max(2, (b.value / scaleMax) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: toneColour(b.tone) }} />
                        </View>
                    </View>
                );
            })}
        </View>
    );
};
