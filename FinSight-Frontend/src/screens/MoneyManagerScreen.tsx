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
import { resolveMonthlyIncome, savingsRate } from '../utils/income';
import {
    ChevronLeft, ChevronDown, ChevronUp,
    ShoppingCart, Home, TrendingUp, TrendingDown,
    Coffee, Zap, CheckCircle, AlertTriangle, XCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { format, parseISO } from 'date-fns';
import { normaliseCategory, categoryLabel } from '../utils/categories';
import { FONTS, COLORS } from '../theme/tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Category mappings ────────────────────────────────────────

const BUCKET_MAP: Record<string, 'needs' | 'wants' | 'savings'> = {
    groceries:     'needs',
    utilities:     'needs',
    transport:     'needs',
    healthcare:    'needs',
    housing:       'needs',
    dining:        'wants',
    shopping:      'wants',
    entertainment: 'wants',
    education:     'wants',
    investments:   'savings',
    other:         'wants',  // default unknown to wants
};

type Bucket = 'needs' | 'wants' | 'savings';

/**
 * Built when a bucket renders, not at module scope.
 *
 * It carries colours and finished JSX icons, so as a constant it captured
 * whichever theme loaded first and kept it for the life of the process.
 */
const bucketMeta = (): Record<Bucket, {
    label: string;
    target: number;
    color: string;
    lightColor: string;
    icon: React.ReactNode;
    description: string;
}> => ({
    needs: {
        label: 'Needs',
        target: 50,
        color: COLORS.brand.primary,
        lightColor: COLORS.brand.soft,
        icon: <Home size={18} color={COLORS.brand.primary} />,
        description: 'Essentials - groceries, rent, utilities, transport, health',
    },
    wants: {
        label: 'Wants',
        target: 30,
        color: COLORS.brand.primaryDark,
        lightColor: COLORS.brand.soft,
        icon: <Coffee size={18} color={COLORS.brand.primaryDark} />,
        description: 'Lifestyle - dining, shopping, entertainment, education',
    },
    savings: {
        label: 'Savings',
        target: 20,
        color: COLORS.semantic.profit,
        lightColor: COLORS.semantic.profitBg,
        icon: <TrendingUp size={18} color={COLORS.semantic.profit} />,
        description: 'Future - investments, SIP, goal deposits',
    },
});

// Was a second copy of the category labels, keyed on `health` so anything
// filed as healthcare showed its raw key. categoryLabel already does this, and
// accepts every legacy spelling.

// ─── Sub-components ───────────────────────────────────────────

const GaugeBar: React.FC<{
    actual: number;
    target: number;
    color: string;
}> = ({ actual, target, color }) => {
    const clampedActual = Math.min(actual, 100);
    const isOver = actual > target;
    return (
        <View style={{ height: 10, backgroundColor: COLORS.surface.tertiary, borderRadius: 5, overflow: 'hidden', marginTop: 8, marginBottom: 4 }}>
            {/* Target marker */}
            <View style={{
                position: 'absolute', left: `${target}%`, top: -2, bottom: -2,
                width: 2, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 1, zIndex: 2,
            }} />
            {/* Actual bar */}
            <View style={{
                height: '100%',
                width: `${clampedActual}%`,
                backgroundColor: isOver ? COLORS.semantic.loss : color,
                borderRadius: 5,
            }} />
        </View>
    );
};

const BucketCard: React.FC<{
    bucket: Bucket;
    spend: number;
    /** Income for the month. The denominator the rule is actually defined on. */
    basis: number;
    totalSpend: number;
    categoryBreakdown: Record<string, number>;
    expanded: boolean;
    onToggle: () => void;
}> = ({ bucket, spend, basis, totalSpend, categoryBreakdown, expanded, onToggle }) => {
    const meta = bucketMeta()[bucket];
    // Fifty, thirty and twenty are shares of income. Dividing by spending
    // instead made the three buckets sum to a hundred whatever the user
    // earned, so the rule could neither be passed nor failed.
    const actualPct = basis > 0 ? (spend / basis) * 100 : 0;
    const delta = actualPct - meta.target;
    const isOver = delta > 0;
    const isGood = Math.abs(delta) <= 5; // within 5% is fine

    const statusColor = isGood ? COLORS.semantic.profit : isOver ? COLORS.semantic.loss : COLORS.semantic.alertAmberFill;
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
            borderColor: expanded ? meta.color + '40' : COLORS.surface.tertiary,
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
                            <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text.primary }}>{meta.label}</Text>
                            <Text style={{ fontSize: 11, color: COLORS.text.tertiary }}>Target: {meta.target}%</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8, alignSelf: 'center' }}>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text.primary }}>
                                {actualPct.toFixed(1)}%
                            </Text>
                            <Text style={{ fontSize: 12, color: COLORS.text.secondary }}>
                                ₹{spend.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        {expanded ? <ChevronUp size={16} color={COLORS.text.tertiary} /> : <ChevronDown size={16} color={COLORS.text.tertiary} />}
                    </View>
                </View>

                {/* Gauge */}
                <GaugeBar actual={actualPct} target={meta.target} color={meta.color} />

                {/* Status pill */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <StatusIcon size={13} color={statusColor} />
                        <Text style={{ fontSize: 12, color: statusColor, fontFamily: FONTS.semibold }}>
                            {isGood
                                ? 'On track'
                                : isOver
                                ? `${delta.toFixed(1)}% over target`
                                : `${Math.abs(delta).toFixed(1)}% under target`}
                        </Text>
                    </View>
                    {basis > 0 && (
                        <Text style={{ fontSize: 11, color: COLORS.text.tertiary }}>
                            ₹{Math.abs(((delta / 100) * basis)).toLocaleString('en-IN')}{' '}
                            {isOver ? 'over' : 'under'}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>

            {/* Expanded category breakdown */}
            {expanded && cats.length > 0 && (
                <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
                    <View style={{ height: 1, backgroundColor: COLORS.surface.tertiary, marginBottom: 12 }} />
                    <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                        Breakdown
                    </Text>
                    {cats.map(([cat, amt], i) => {
                        const catPct = (amt / largestCat) * 100;
                        return (
                            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: '#423C35' }}>
                                            {categoryLabel(cat)}
                                        </Text>
                                        <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text.primary }}>
                                            ₹{amt.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                    <BarFill
                                        percent={Math.max(catPct, 2)}
                                        height={4}
                                        color={meta.color + 'A0'}
                                        trackClassName="bg-surface-tertiary"
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
    const profile = useAppSelector((s) => s.auth.profile);
    const [expanded, setExpanded] = useState<Bucket | null>('wants');

    const thisMonth = format(new Date(), 'yyyy-MM');

    const income = useMemo(
        () => resolveMonthlyIncome(transactions as any, profile?.incomeRange, thisMonth),
        [transactions, profile?.incomeRange, thisMonth]
    );

    // Compute bucket totals from this month's debit transactions
    const { buckets, categoryByBucket, totalSpend } = useMemo(() => {
        const buckets: Record<Bucket, number> = { needs: 0, wants: 0, savings: 0 };
        const catSpend: Record<string, number> = {};

        transactions.forEach((t) => {
            if (t.type !== 'debit') return;
            const txMonth = format(parseISO(t.date), 'yyyy-MM');
            if (txMonth !== thisMonth) return;

            const cat = normaliseCategory(t.category);
            const bucket: Bucket = BUCKET_MAP[cat] ?? 'wants';
            buckets[bucket] += t.amount;
            catSpend[cat] = (catSpend[cat] ?? 0) + t.amount;
        });

        const totalSpend = buckets.needs + buckets.wants + buckets.savings;

        // Money left in the account is saved just as much as money moved into
        // a fund is. Counting only investment debits told a student who spent
        // four of their ten thousand that they had saved nothing.
        if (income.amount > 0) {
            buckets.savings = Math.max(income.amount - buckets.needs - buckets.wants, 0);
        }

        // Group categories by bucket
        const categoryByBucket: Record<Bucket, Record<string, number>> = {
            needs: {}, wants: {}, savings: {},
        };
        Object.entries(catSpend).forEach(([cat, amt]) => {
            const bucket: Bucket = BUCKET_MAP[cat] ?? 'wants';
            categoryByBucket[bucket][cat] = amt;
        });

        return { buckets, categoryByBucket, totalSpend };
    }, [transactions, thisMonth, income.amount]);

    // Summary insight
    const insight = useMemo(() => {
        if (totalSpend === 0) return null;

        // Without income there is no denominator, so the only honest thing to
        // say is what is missing.
        if (income.amount <= 0) {
            return {
                type: 'tip',
                msg: 'Add what came in this month and these three bars become the real 50/30/20 split. Without it they can only show how your spending divides up, not how much of your income it used.',
            };
        }

        const wantsPct = (buckets.wants / income.amount) * 100;
        const rate = savingsRate(income.amount, buckets.needs + buckets.wants) ?? 0;

        if (rate < 0) {
            return {
                type: 'warning',
                msg: `You spent ₹${Math.abs(Math.round((rate / 100) * income.amount)).toLocaleString('en-IN')} more than came in this month. That gap is the first thing worth closing.`,
            };
        }
        if (wantsPct > 35) {
            const excess = Math.round(((wantsPct - 30) / 100) * income.amount);
            return { type: 'warning', msg: `Wants took ${wantsPct.toFixed(0)}% of what you earned, against a 30% target. Moving ₹${excess.toLocaleString('en-IN')} of it would put you on the ratio.` };
        }
        if (rate < 20) {
            return { type: 'tip', msg: `You kept ${rate.toFixed(0)}% of what came in. Twenty is the number worth aiming at, and small amounts invested regularly do most of the work.` };
        }
        return { type: 'success', msg: `You kept ${rate.toFixed(0)}% of what came in this month, which is at or above the 20% the rule asks for.` };
    }, [buckets, totalSpend, income.amount]);

    const toggle = (b: Bucket) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => (prev === b ? null : b));
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top']}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface.tertiary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                >
                    <ChevronLeft size={20} color={COLORS.text.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text.primary }}>Money manager</Text>
                    <Text style={{ fontSize: 12, color: COLORS.text.tertiary }}>50 / 30 / 20 Rule · {format(new Date(), 'MMMM yyyy')}</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 48 }}
            >
                {/* ── Total spend summary ─────────────────────── */}
                <View style={{
                    backgroundColor: COLORS.brand.primary,
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 20,
                }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Spent this month
                    </Text>
                    <Text style={{ fontSize: 36, fontFamily: FONTS.bold, color: '#FFFFFF', letterSpacing: -1, marginTop: 4 }}>
                        ₹{totalSpend.toLocaleString('en-IN')}
                    </Text>

                    {/* Both sides of the ledger, and where the income figure
                        came from, because a banded guess should not be shown
                        as though it were measured. */}
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                        {income.source === 'unknown'
                            ? 'No income logged this month'
                            : `of ₹${income.amount.toLocaleString('en-IN')} ${income.source === 'logged' ? 'logged as income' : 'estimated from your profile'}`}
                    </Text>

                    {income.amount > 0 && (
                        <View style={{ flexDirection: 'row', marginTop: 14, gap: 12 }}>
                            {(['needs', 'wants', 'savings'] as Bucket[]).map((b) => {
                                const pct = ((buckets[b] / income.amount) * 100).toFixed(0);
                                return (
                                    <View key={b} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: '#FFFFFF' }}>{pct}%</Text>
                                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                                            {bucketMeta()[b].label}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                                            target {bucketMeta()[b].target}%
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
                        backgroundColor: insight.type === 'success' ? '#EFF7F2' : insight.type === 'warning' ? '#FDF5EC' : '#F2F5FD',
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: insight.type === 'success' ? '#CDE8D9' : insight.type === 'warning' ? '#EED9C0' : COLORS.brand.edge,
                        alignItems: 'flex-start',
                        gap: 10,
                    }}>
                        {insight.type === 'success'
                            ? <CheckCircle size={18} color={COLORS.semantic.profit} style={{ marginTop: 1 }} />
                            : insight.type === 'warning'
                            ? <TrendingDown size={18} color="#C2410C" style={{ marginTop: 1 }} />
                            : <Zap size={18} color="#1D4ED8" style={{ marginTop: 1 }} />}
                        <Text style={{
                            flex: 1, fontSize: 13, lineHeight: 19,
                            color: insight.type === 'success' ? '#0A5C43' : insight.type === 'warning' ? '#8A4210' : '#1A3C7A',
                            fontFamily: FONTS.medium,
                        }}>
                            {insight.msg}
                        </Text>
                    </View>
                )}

                {/* ── Bucket cards ────────────────────────────── */}
                {totalSpend === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <ShoppingCart size={48} color={COLORS.border.default} />
                        <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text.tertiary, marginTop: 16 }}>No transactions this month</Text>
                        <Text style={{ fontSize: 13, color: COLORS.border.strong, marginTop: 6, textAlign: 'center' }}>
                            Add some transactions and your 50/30/20 breakdown will appear here.
                        </Text>
                    </View>
                ) : (
                    (['needs', 'wants', 'savings'] as Bucket[]).map((b) => (
                        <BucketCard
                            key={b}
                            bucket={b}
                            spend={buckets[b]}
                            basis={income.amount}
                            totalSpend={totalSpend}
                            categoryBreakdown={categoryByBucket[b]}
                            expanded={expanded === b}
                            onToggle={() => toggle(b)}
                        />
                    ))
                )}

                {/* ── About the rule ──────────────────────────── */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.surface.tertiary, marginTop: 4 }}>
                    <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: '#423C35', marginBottom: 8 }}>About the 50/30/20 Rule</Text>
                    <Text style={{ fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 }}>
                        Popularised by US Senator Elizabeth Warren, this framework splits after-tax income into three buckets:
                        {'\n\n'}
                        <Text style={{ fontFamily: FONTS.bold, color: '#1D4ED8' }}>50% Needs</Text> - Everything non-negotiable: rent, food, medicine, travel to work.{'\n'}
                        <Text style={{ fontFamily: FONTS.bold, color: COLORS.brand.primaryDark }}>30% Wants</Text> - Lifestyle spending you choose: dining out, streaming, gadgets.{'\n'}
                        <Text style={{ fontFamily: FONTS.bold, color: COLORS.semantic.profit }}>20% Savings</Text> - Pay yourself first: SIPs, emergency fund, goal deposits.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default MoneyManagerScreen;
