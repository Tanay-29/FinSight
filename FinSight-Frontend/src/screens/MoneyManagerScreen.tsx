/**
 * MoneyManagerScreen.tsx
 *
 * The 50/30/20 Money Manager - auto-classifies this month's transactions
 * into Needs (50%), Wants (30%), and Savings (20%) buckets.
 *
 * Reads entirely from Redux state.transactions.items - no Firestore calls.
 */
import React, { useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarFill } from '../components/BarFill';
import {
    ChevronLeft, ChevronDown, ChevronUp,
    ShoppingCart, Home, TrendingUp, TrendingDown,
    Coffee, Zap, CheckCircle, AlertTriangle, XCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { format, parseISO } from 'date-fns';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Category mappings ────────────────────────────────────────

const BUCKET_MAP: Record<string, 'needs' | 'wants' | 'savings'> = {
    groceries:     'needs',
    utilities:     'needs',
    transport:     'needs',
    health:        'needs',
    housing:       'needs',
    dining:        'wants',
    shopping:      'wants',
    entertainment: 'wants',
    education:     'wants',
    investments:   'savings',
    other:         'wants',  // default unknown to wants
};

type Bucket = 'needs' | 'wants' | 'savings';

const BUCKET_META: Record<Bucket, {
    label: string;
    target: number;
    color: string;
    lightColor: string;
    icon: React.ReactNode;
    description: string;
}> = {
    needs: {
        label: 'Needs',
        target: 50,
        color: '#3B82F6',
        lightColor: '#EFF6FF',
        icon: <Home size={18} color="#3B82F6" />,
        description: 'Essentials - groceries, rent, utilities, transport, health',
    },
    wants: {
        label: 'Wants',
        target: 30,
        color: '#8B5CF6',
        lightColor: '#F5F3FF',
        icon: <Coffee size={18} color="#8B5CF6" />,
        description: 'Lifestyle - dining, shopping, entertainment, education',
    },
    savings: {
        label: 'Savings',
        target: 20,
        color: '#10B981',
        lightColor: '#ECFDF5',
        icon: <TrendingUp size={18} color="#10B981" />,
        description: 'Future - investments, SIP, goal deposits',
    },
};

const CATEGORY_DISPLAY: Record<string, string> = {
    groceries: 'Groceries', utilities: 'Utilities', transport: 'Transport',
    health: 'Health', housing: 'Housing', dining: 'Dining',
    shopping: 'Shopping', entertainment: 'Entertainment', education: 'Education',
    investments: 'Investments', other: 'Other',
};

// ─── Sub-components ───────────────────────────────────────────

const GaugeBar: React.FC<{
    actual: number;
    target: number;
    color: string;
}> = ({ actual, target, color }) => {
    const clampedActual = Math.min(actual, 100);
    const isOver = actual > target;
    return (
        <View style={{ height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginTop: 8, marginBottom: 4 }}>
            {/* Target marker */}
            <View style={{
                position: 'absolute', left: `${target}%`, top: -2, bottom: -2,
                width: 2, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 1, zIndex: 2,
            }} />
            {/* Actual bar */}
            <View style={{
                height: '100%',
                width: `${clampedActual}%`,
                backgroundColor: isOver ? '#EF4444' : color,
                borderRadius: 5,
            }} />
        </View>
    );
};

const BucketCard: React.FC<{
    bucket: Bucket;
    spend: number;
    totalSpend: number;
    categoryBreakdown: Record<string, number>;
    expanded: boolean;
    onToggle: () => void;
}> = ({ bucket, spend, totalSpend, categoryBreakdown, expanded, onToggle }) => {
    const meta = BUCKET_META[bucket];
    const actualPct = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
    const delta = actualPct - meta.target;
    const isOver = delta > 0;
    const isGood = Math.abs(delta) <= 5; // within 5% is fine

    const statusColor = isGood ? '#10B981' : isOver ? '#EF4444' : '#F59E0B';
    const StatusIcon = isGood ? CheckCircle : isOver ? XCircle : AlertTriangle;

    const cats = Object.entries(categoryBreakdown)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);

    // The breakdown bars used to be drawn at the category's share of total
    // spending multiplied by three, which meant anything above a third of the
    // month filled the bar and two very different categories looked the same.
    // They are drawn relative to the largest category in this bucket instead.
    const largestCat = cats.length > 0 ? cats[0][1] : 1;

    return (
        <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            marginBottom: 12,
            borderWidth: 1.5,
            borderColor: expanded ? meta.color + '40' : '#F3F4F6',
            overflow: 'hidden',
        }}>
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.85}
                style={{ padding: 18 }}
            >
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{
                            width: 40, height: 40, borderRadius: 12,
                            backgroundColor: meta.lightColor,
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            {meta.icon}
                        </View>
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{meta.label}</Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Target: {meta.target}%</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8, alignSelf: 'center' }}>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                                {actualPct.toFixed(1)}%
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                ₹{spend.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        {expanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
                    </View>
                </View>

                {/* Gauge */}
                <GaugeBar actual={actualPct} target={meta.target} color={meta.color} />

                {/* Status pill */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <StatusIcon size={13} color={statusColor} />
                        <Text style={{ fontSize: 12, color: statusColor, fontWeight: '600' }}>
                            {isGood
                                ? 'On track'
                                : isOver
                                ? `${delta.toFixed(1)}% over target`
                                : `${Math.abs(delta).toFixed(1)}% under target`}
                        </Text>
                    </View>
                    {totalSpend > 0 && (
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                            ₹{Math.abs(((delta / 100) * totalSpend)).toLocaleString('en-IN')}{' '}
                            {isOver ? 'over' : 'under'}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            {/* Expanded category breakdown */}
            {expanded && cats.length > 0 && (
                <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
                    <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                        Breakdown
                    </Text>
                    {cats.map(([cat, amt], i) => {
                        const catPct = (amt / largestCat) * 100;
                        return (
                            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                                            {CATEGORY_DISPLAY[cat] ?? cat}
                                        </Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                                            ₹{amt.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                    <BarFill
                                        percent={Math.max(catPct, 2)}
                                        height={4}
                                        color={meta.color + 'A0'}
                                        trackClassName="bg-gray-100"
                                        delay={i * 40}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────

const MoneyManagerScreen: React.FC = () => {
    const navigation = useNavigation();
    const transactions = useAppSelector((s) => s.transactions.items);
    const [expanded, setExpanded] = useState<Bucket | null>('wants');

    const thisMonth = format(new Date(), 'yyyy-MM');

    // Compute bucket totals from this month's debit transactions
    const { buckets, categoryByBucket, totalSpend } = useMemo(() => {
        const buckets: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };
        const catSpend: Record<string, number> = {};

        transactions.forEach((t) => {
            if (t.type !== 'debit') return;
            const txMonth = format(parseISO(t.date), 'yyyy-MM');
            if (txMonth !== thisMonth) return;

            const cat = (t.category ?? 'other').toLowerCase();
            const bucket: Bucket = BUCKET_MAP[cat] ?? 'wants';
            buckets[bucket] += t.amount;
            catSpend[cat] = (catSpend[cat] ?? 0) + t.amount;
        });

        const totalSpend = buckets.needs + buckets.wants + buckets.savings;

        // Group categories by bucket
        const categoryByBucket: Record<Bucket, Record<string, number>> = {
            needs: {}, wants: {}, savings: {},
        };
        Object.entries(catSpend).forEach(([cat, amt]) => {
            const bucket: Bucket = BUCKET_MAP[cat] ?? 'wants';
            categoryByBucket[bucket][cat] = amt;
        });

        return { buckets, categoryByBucket, totalSpend };
    }, [transactions, thisMonth]);

    // Summary insight
    const insight = useMemo(() => {
        if (totalSpend === 0) return null;
        const wantsPct = (buckets.wants / totalSpend) * 100;
        const savePct  = (buckets.savings / totalSpend) * 100;

        if (wantsPct > 35) {
            const excess = Math.round(((wantsPct - 30) / 100) * totalSpend);
            return { type: 'warning', msg: `You're spending ${(wantsPct - 30).toFixed(1)}% more than the 30% Wants target. Moving ₹${excess.toLocaleString('en-IN')} to savings would hit the golden ratio.` };
        }
        if (savePct < 15) {
            return { type: 'tip', msg: `Your savings rate is ${savePct.toFixed(1)}%. Aim for at least 20% - even small SIPs compound significantly over time.` };
        }
        return { type: 'success', msg: `Great balance! You're close to the 50/30/20 golden ratio. Keep maintaining this discipline.` };
    }, [buckets, totalSpend]);

    const toggle = (b: Bucket) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => (prev === b ? null : b));
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                >
                    <ChevronLeft size={20} color="#111827" />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Money manager</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>50 / 30 / 20 Rule · {format(new Date(), 'MMMM yyyy')}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 48 }}
            >
                {/* ── Total spend summary ─────────────────────── */}
                <View style={{
                    backgroundColor: '#6366F1',
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 20,
                }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Total Spend This Month
                    </Text>
                    <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1, marginTop: 4 }}>
                        ₹{totalSpend.toLocaleString('en-IN')}
                    </Text>

                    {totalSpend > 0 && (
                        <View style={{ flexDirection: 'row', marginTop: 14, gap: 12 }}>
                            {(['needs', 'wants', 'savings'] as Bucket[]).map((b) => {
                                const pct = ((buckets[b] / totalSpend) * 100).toFixed(0);
                                return (
                                    <View key={b} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{pct}%</Text>
                                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                                            {BUCKET_META[b].label}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                                            target {BUCKET_META[b].target}%
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ── Insight card ────────────────────────────── */}
                {insight && (
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: insight.type === 'success' ? '#ECFDF5' : insight.type === 'warning' ? '#FFF7ED' : '#EFF6FF',
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: insight.type === 'success' ? '#BBF7D0' : insight.type === 'warning' ? '#FED7AA' : '#BFDBFE',
                        alignItems: 'flex-start',
                        gap: 10,
                    }}>
                        {insight.type === 'success'
                            ? <CheckCircle size={18} color="#10B981" style={{ marginTop: 1 }} />
                            : insight.type === 'warning'
                            ? <TrendingDown size={18} color="#F97316" style={{ marginTop: 1 }} />
                            : <Zap size={18} color="#3B82F6" style={{ marginTop: 1 }} />}
                        <Text style={{
                            flex: 1, fontSize: 13, lineHeight: 19,
                            color: insight.type === 'success' ? '#065F46' : insight.type === 'warning' ? '#9A3412' : '#1E3A8A',
                            fontWeight: '500',
                        }}>
                            {insight.msg}
                        </Text>
                    </View>
                )}

                {/* ── Bucket cards ────────────────────────────── */}
                {totalSpend === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <ShoppingCart size={48} color="#E5E7EB" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#9CA3AF', marginTop: 16 }}>No transactions this month</Text>
                        <Text style={{ fontSize: 13, color: '#D1D5DB', marginTop: 6, textAlign: 'center' }}>
                            Add some transactions and your 50/30/20 breakdown will appear here.
                        </Text>
                    </View>
                ) : (
                    (['needs', 'wants', 'savings'] as Bucket[]).map((b) => (
                        <BucketCard
                            key={b}
                            bucket={b}
                            spend={buckets[b]}
                            totalSpend={totalSpend}
                            categoryBreakdown={categoryByBucket[b]}
                            expanded={expanded === b}
                            onToggle={() => toggle(b)}
                        />
                    ))
                )}

                {/* ── About the rule ──────────────────────────── */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginTop: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 }}>About the 50/30/20 Rule</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>
                        Popularised by US Senator Elizabeth Warren, this framework splits after-tax income into three buckets:
                        {'\n\n'}
                        <Text style={{ fontWeight: '700', color: '#3B82F6' }}>50% Needs</Text> - Everything non-negotiable: rent, food, medicine, travel to work.{'\n'}
                        <Text style={{ fontWeight: '700', color: '#8B5CF6' }}>30% Wants</Text> - Lifestyle spending you choose: dining out, streaming, gadgets.{'\n'}
                        <Text style={{ fontWeight: '700', color: '#10B981' }}>20% Savings</Text> - Pay yourself first: SIPs, emergency fund, goal deposits.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default MoneyManagerScreen;
