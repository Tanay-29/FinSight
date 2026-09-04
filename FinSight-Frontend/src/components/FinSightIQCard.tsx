/**
 * FinSightIQCard.tsx
 *
 * The hero card on the Feed. A gauge showing the behavioural score out of
 * 1000, the model's read on it, and the three things worth doing next.
 *
 * The score used to be drawn as SvgText driven by a core Animated spring with
 * a listener calling setState on every frame. That is a React render per frame
 * during the exact moment the Feed is mounting everything else, and SvgText
 * ignores font weight on Android so the number rendered thin there and heavy
 * on iOS. It is a real Text node over the gauge now, counted up by the same
 * AnimatedNumber the rest of the app uses.
 */
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BrainCircuit, Target, BookOpen, TrendingUp, MessageCircle, RefreshCw, CloudOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAIAdvice, calculateIQScore } from '../store/slices/iqSlice';
import { selectIsPremium } from '../store/slices/premiumSlice';
import { AnimatedNumber } from './AnimatedNumber';
import { PressableScale } from './PressableScale';
import { Skeleton } from './Skeleton';
import { FONTS, COLORS, TYPE } from '../theme/tokens';

// ─── Gauge config ─────────────────────────────────────────────

const GAUGE_SIZE = 200;
const RADIUS = 80;
const STROKE = 12;
const CX = GAUGE_SIZE / 2;
const CY = GAUGE_SIZE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const s = polarToCartesian(cx, cy, r, startDeg);
    const e = polarToCartesian(cx, cy, r, endDeg);
    const large = (endDeg - startDeg + 360) % 360 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// The full track arc (210° → 330° going clockwise = 210° → 450°, i.e. 210°→330° via 360°)
const TRACK_D  = describeArc(CX, CY, RADIUS, 210, 360) + ` A ${RADIUS} ${RADIUS} 0 0 1 ${polarToCartesian(CX, CY, RADIUS, 330).x} ${polarToCartesian(CX, CY, RADIUS, 330).y}`;


// ─── Grade helper ──────────────────────────────────────────────

function getGrade(score: number): { label: string; color: string } {
    if (score >= 900) return { label: 'Financial Genius',  color: COLORS.semantic.profit };
    if (score >= 750) return { label: 'Expert',            color: '#17924A' };
    if (score >= 600) return { label: 'Disciplined',       color: '#5F8C0C' };
    if (score >= 450) return { label: 'Building Habits',   color: COLORS.semantic.alertAmberFill };
    if (score >= 300) return { label: 'Getting Started',   color: '#C2410C' };
    return                    { label: 'Needs Attention',  color: COLORS.semantic.loss };
}

/**
 * Icon and tint for quest 1, 2 and 3, in order.
 *
 * A function rather than a constant, because a constant is evaluated on import
 * and would hold whichever theme loaded first. Two of these three colours are
 * the same in both themes; the third is not.
 */
const questStyle = (idx: number) => ({
    Icon: [Target, BookOpen, TrendingUp][idx] ?? Target,
    color: [COLORS.brand.primary, COLORS.brand.primaryDark, COLORS.semantic.profit][idx]
        ?? COLORS.brand.primary,
});

// ─── Arc Gauge ────────────────────────────────────────────────

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const grade = getGrade(score);

    // Compute the fill arc end angle
    const fillPct = Math.min(score / 1000, 1);
    const totalDeg = 240; // 210→330 via 360 = 240 degrees of arc
    const fillDeg  = fillPct * totalDeg;
    const fillEndDeg = (210 + fillDeg) % 360;

    // Build fill arc path
    const fillD = fillDeg > 0
        ? describeArc(CX, CY, RADIUS,
            210,
            fillEndDeg === 0 ? 359.99 : fillEndDeg,
          )
        : '';

    // Needle dot position
    const dotAngle = 210 + fillDeg;
    const dot = polarToCartesian(CX, CY, RADIUS, dotAngle);

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={GAUGE_SIZE} height={GAUGE_SIZE * 0.75}>
                <Defs>
                    <LinearGradient id="gaugeFill" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={COLORS.brand.primary} />
                        <Stop offset="50%" stopColor={COLORS.brand.primaryDark} />
                        <Stop offset="100%" stopColor={COLORS.semantic.profit} />
                    </LinearGradient>
                </Defs>

                {/* Track */}
                <Path
                    d={TRACK_D}
                    fill="none"
                    stroke={COLORS.border.default}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                />

                {/* Filled arc */}
                {fillD.length > 0 && (
                    <Path
                        d={fillD}
                        fill="none"
                        stroke="url(#gaugeFill)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                    />
                )}

                {/* Needle dot */}
                {fillDeg > 0 && (
                    <Circle
                        cx={dot.x}
                        cy={dot.y}
                        r={STROKE / 2 + 2}
                        fill="#FFFFFF"
                        stroke={grade.color}
                        strokeWidth={3}
                    />
                )}

            </Svg>

            {/* Real text over the gauge rather than SvgText, which renders at
                the wrong weight on Android whatever fontWeight it is given. */}
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: GAUGE_SIZE * 0.75, alignItems: 'center', justifyContent: 'center',
                }}
            >
                {/* The one hero number in the app, and the reason the display
                    face exists. Instrument Serif ships a single weight, so
                    there is no fontWeight here on purpose: the emphasis comes
                    from the size. */}
                <AnimatedNumber
                    value={score}
                    style={{
                        ...TYPE.display,
                        color: COLORS.text.primary,
                        fontVariant: ['tabular-nums'],
                    }}
                />
                <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginTop: 2 }}>
                    of 1000
                </Text>
            </View>

            <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: grade.color, marginTop: -12 }}>
                {grade.label}
            </Text>
        </View>
    );
};

// ─── Main Card ────────────────────────────────────────────────

const FinSightIQCard: React.FC = () => {
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();
    const navigation = useNavigation<any>();
    const isPremium = useAppSelector(selectIsPremium);
    const { advice, adviceLoading, adviceError, lastFetchedAt } = useAppSelector((s) => s.iq);
    const transactions  = useAppSelector((s) => s.transactions.items);
    const budgets       = useAppSelector((s) => s.budgets.items);
    const goals         = useAppSelector((s: any) => s.goals?.items ?? []);
    const streak        = useAppSelector((s: any) => s.auth?.profile?.streak ?? 0);
    const completedModules = useAppSelector((s: any) => {
        const progress = s.learning?.userProgress ?? {};
        return Object.values(progress).reduce(
            (acc: number, p: any) => acc + (p.completedModules?.length ?? 0), 0
        );
    });

    // Live score calculated on frontend
    const liveScore = calculateIQScore(transactions, budgets, goals, completedModules, streak);


    // Fetch AI advice on mount (once per session)
    useEffect(() => {
        if (!lastFetchedAt) {
            dispatch(fetchAIAdvice());
        }
    }, []);

    // The first read of the session is free for everyone, so nobody meets a
    // paywall before they have seen what is behind it. Asking for another one
    // is the paid action, because each is a call that costs money to serve.
    const handleRefresh = () => {
        if (!isPremium && lastFetchedAt) {
            navigation.navigate('Paywall', { feature: 'ai-coach' });
            return;
        }
        dispatch(fetchAIAdvice());
    };


    return (
        <Animated.View
            entering={reduced ? FadeIn.duration(180) : FadeIn.duration(320)}
            style={{
            marginHorizontal: 16, marginTop: 12, marginBottom: 4,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: COLORS.brand.soft,
            shadowColor: COLORS.brand.primary,
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
                        <BrainCircuit size={18} color={COLORS.brand.primary} />
                    </View>
                    <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text.primary }}>FinSight IQ</Text>
                </View>
                <PressableScale
                    onPress={handleRefresh}
                    disabled={adviceLoading}
                    activeScale={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Get a fresh read on your score"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface.secondary, alignItems: 'center', justifyContent: 'center' }}
                >
                    {adviceLoading
                        ? <ActivityIndicator size="small" color={COLORS.brand.primary} />
                        : <RefreshCw size={15} color={COLORS.text.tertiary} />}
                </PressableScale>
            </View>

            {/* Gauge */}
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                <ScoreGauge score={liveScore} />
            </View>

            {/* AI Mood Bubble */}
            {advice ? (
                <View style={{
                    marginHorizontal: 16, marginBottom: 12,
                    backgroundColor: COLORS.brand.soft,
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.brand.soft,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <MessageCircle size={15} color={COLORS.brand.primary} style={{ marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: COLORS.brand.primary, marginBottom: 3 }}>
                                Sensei says
                            </Text>
                            <Text style={{ fontSize: 13, color: '#423C35', lineHeight: 19, fontFamily: FONTS.medium }}>
                                {advice.mood}
                            </Text>
                            <Text style={{ fontSize: 12, color: COLORS.text.secondary, lineHeight: 17, marginTop: 4 }}>
                                {advice.explanation}
                            </Text>
                        </View>
                    </View>
                </View>
            ) : adviceLoading ? (
                <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: COLORS.surface.secondary, borderRadius: 16 }}>
                    <Skeleton width="30%" height={11} />
                    <View style={{ height: 10 }} />
                    <Skeleton width="95%" height={12} />
                    <View style={{ height: 6 }} />
                    <Skeleton width="70%" height={12} />
                </View>
            ) : adviceError ? (
                // The score above is computed on the phone and is always right.
                // Only the model's read on it needs the server, so say that
                // rather than leaving the space blank or spinning for ever.
                <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: COLORS.surface.secondary, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start' }}>
                    <CloudOff size={14} color={COLORS.text.tertiary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 12, color: COLORS.text.secondary, lineHeight: 17 }}>
                            {adviceError}
                        </Text>
                        <Text
                            onPress={handleRefresh}
                            style={{ fontSize: 12, fontFamily: FONTS.bold, color: COLORS.brand.primary, marginTop: 6 }}
                        >
                            Try again
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* What to do next.
                This was an accordion holding three bordered cards, each with
                its own tint, badge and padding, under a header carrying a
                second badge totalling the points. Five nested surfaces to say
                "do these three things". It is a plain list now, always open,
                because a card on a feed that has to be unfolded before it says
                anything is a card that says nothing. */}
            {advice?.quests?.length ? (
                <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
                    <Text style={{
                        fontSize: 11, fontFamily: FONTS.bold, color: COLORS.text.tertiary,
                        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
                    }}>
                        Do next
                    </Text>

                    {advice.quests.slice(0, 3).map((quest, idx) => {
                        const { Icon, color } = questStyle(idx);
                        return (
                            <View
                                key={idx}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    paddingVertical: 9,
                                    borderTopWidth: idx === 0 ? 0 : 1,
                                    borderTopColor: COLORS.surface.tertiary,
                                }}
                            >
                                <Icon size={15} color={color} style={{ marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text.primary }}>
                                        {quest.title}
                                    </Text>
                                    <Text
                                        numberOfLines={2}
                                        style={{ fontSize: 12, color: COLORS.text.secondary, lineHeight: 17, marginTop: 1 }}
                                    >
                                        {quest.description}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: COLORS.text.tertiary, marginTop: 1 }}>
                                    +{quest.points}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            ) : null}
        </Animated.View>
    );
};

export default FinSightIQCard;
