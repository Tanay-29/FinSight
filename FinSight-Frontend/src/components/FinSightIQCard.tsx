/**
 * FinSightIQCard.tsx
 *
 * The hero card on the Feed screen. Shows:
 *   - Animated semi-circular gauge (0–1000 score)
 *   - Grade label (Novice → Expert)
 *   - AI "Sensei" mood bubble
 *   - Collapsible 3 Level-Up Quests
 *
 * All text is English-only.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity,
    Animated, ActivityIndicator,
    LayoutAnimation, Platform, UIManager,
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
    BrainCircuit, ChevronDown, ChevronUp,
    Zap, Target, BookOpen, TrendingUp,
    MessageCircle, RefreshCw,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAIAdvice, calculateIQScore } from '../store/slices/iqSlice';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Gauge config ─────────────────────────────────────────────

const GAUGE_SIZE = 200;
const RADIUS = 80;
const STROKE = 12;
const CX = GAUGE_SIZE / 2;
const CY = GAUGE_SIZE / 2;

// Semi-arc: from 210° to -30° (clockwise, bottom-left to bottom-right)
const startAngle = 210 * (Math.PI / 180);
const endAngle   = 330 * (Math.PI / 180); // 360-30
const ARC_LENGTH = (330 - 210 + 360) % 360; // 240 degrees

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
    if (score >= 900) return { label: 'Financial Genius',  color: '#10B981' };
    if (score >= 750) return { label: 'Expert',            color: '#22C55E' };
    if (score >= 600) return { label: 'Disciplined',       color: '#84CC16' };
    if (score >= 450) return { label: 'Building Habits',   color: '#F59E0B' };
    if (score >= 300) return { label: 'Getting Started',   color: '#F97316' };
    return                    { label: 'Needs Attention',  color: '#EF4444' };
}

const QUEST_ICONS: React.ReactNode[] = [
    <Target size={14} color="#6366F1" />,
    <BookOpen size={14} color="#8B5CF6" />,
    <TrendingUp size={14} color="#10B981" />,
];

// ─── Arc Gauge ────────────────────────────────────────────────

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        Animated.spring(anim, {
            toValue: score,
            useNativeDriver: false,
            tension: 40,
            friction: 8,
        }).start();
        anim.addListener(({ value }) => setDisplayScore(Math.round(value)));
        return () => anim.removeAllListeners();
    }, [score]);

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
                        <Stop offset="0%" stopColor="#6366F1" />
                        <Stop offset="50%" stopColor="#8B5CF6" />
                        <Stop offset="100%" stopColor="#10B981" />
                    </LinearGradient>
                </Defs>

                {/* Track */}
                <Path
                    d={TRACK_D}
                    fill="none"
                    stroke="#E5E7EB"
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

                {/* Score text */}
                <Text
                    x={CX}
                    y={CY - 4}
                    textAnchor="middle"
                    fontSize="32"
                    fontWeight="900"
                    fill="#111827"
                >
                    {displayScore}
                </Text>
                <Text
                    x={CX}
                    y={CY + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#9CA3AF"
                >
                    / 1000
                </Text>
            </Svg>
            <Text style={{ fontSize: 14, fontWeight: '700', color: grade.color, marginTop: -12 }}>
                {grade.label}
            </Text>
        </View>
    );
};

// ─── Main Card ────────────────────────────────────────────────

const FinSightIQCard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { score, advice, adviceLoading, lastFetchedAt } = useAppSelector((s) => s.iq);
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

    const [questsOpen, setQuestsOpen] = useState(false);

    // Fetch AI advice on mount (once per session)
    useEffect(() => {
        if (!lastFetchedAt) {
            dispatch(fetchAIAdvice());
        }
    }, []);

    const handleRefresh = () => {
        dispatch(fetchAIAdvice());
    };

    const toggleQuests = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setQuestsOpen((v) => !v);
    };

    return (
        <View style={{
            marginHorizontal: 16, marginTop: 12, marginBottom: 4,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: '#EEF2FF',
            shadowColor: '#6366F1',
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
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <BrainCircuit size={18} color="#6366F1" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>FinSight IQ</Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Behavioral Financial Score</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleRefresh}
                    disabled={adviceLoading}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}
                >
                    {adviceLoading
                        ? <ActivityIndicator size="small" color="#6366F1" />
                        : <RefreshCw size={15} color="#9CA3AF" />}
                </TouchableOpacity>
            </View>

            {/* Gauge */}
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                <ScoreGauge score={liveScore} />
            </View>

            {/* AI Mood Bubble */}
            {advice ? (
                <View style={{
                    marginHorizontal: 16, marginBottom: 12,
                    backgroundColor: '#F5F3FF',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#EDE9FE',
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <MessageCircle size={15} color="#6366F1" style={{ marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1', marginBottom: 3 }}>
                                Sensei says
                            </Text>
                            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19, fontWeight: '500' }}>
                                {advice.mood}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 4 }}>
                                {advice.explanation}
                            </Text>
                        </View>
                    </View>
                </View>
            ) : adviceLoading ? (
                <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Analyzing your finances...</Text>
                </View>
            ) : null}

            {/* Level-Up Quests */}
            {advice?.quests && (
                <>
                    <TouchableOpacity
                        onPress={toggleQuests}
                        style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 20, paddingVertical: 12,
                            borderTopWidth: 1, borderTopColor: '#F3F4F6',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Zap size={14} color="#F59E0B" />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                                Level-Up Quests
                            </Text>
                            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                                    +{advice.quests.reduce((s, q) => s + q.points, 0)} IQ available
                                </Text>
                            </View>
                        </View>
                        {questsOpen ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                    </TouchableOpacity>

                    {questsOpen && (
                        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                            {advice.quests.map((quest, idx) => (
                                <View
                                    key={idx}
                                    style={{
                                        flexDirection: 'row',
                                        backgroundColor: '#FAFAFA',
                                        borderRadius: 14,
                                        padding: 14,
                                        marginBottom: idx < 2 ? 8 : 0,
                                        borderWidth: 1,
                                        borderColor: '#F3F4F6',
                                        gap: 12,
                                    }}
                                >
                                    <View style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        backgroundColor: ['#EEF2FF', '#F5F3FF', '#ECFDF5'][idx],
                                        alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {QUEST_ICONS[idx]}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 }}>
                                                {quest.title}
                                            </Text>
                                            <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280' }}>+{quest.points}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 17 }}>
                                            {quest.description}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    );
};

export default FinSightIQCard;
