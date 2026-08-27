/**
 * GoalAccelerationScreen.tsx
 *
 * Dynamic compound-interest simulator for any savings goal.
 * Receives { goalId } from route params, reads real goal from Redux.
 *
 * Sections:
 *   1. Goal hero card - real title, emoji, progress, deadline
 *   2. Contribution adjuster - +/− ₹1,000 steps, live recalc
 *   3. Smart budget tip - reads top over-budget category from transactions
 *   4. Side-by-side timeline card - Bank 4% vs SIP 9%
 *   5. Months-saved hero number
 */
import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Clock, TrendingUp, ShieldCheck, Zap,
    PiggyBank, Calendar, Minus, Plus, AlertCircle, Landmark,
} from 'lucide-react-native';
import { goalIcon } from '../theme/icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import { differenceInDays, format, parseISO, addMonths } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────

type RouteParams = { goalId?: string };

// ─── Math engine ──────────────────────────────────────────────

const BANK_RATE = 0.04;       // 4%  p.a. - standard savings account
const SIP_RATE  = 0.09;       // 9%  p.a. - conservative hybrid MF

/**
 * Iterative month-wise compound + contribution calculator.
 * Returns number of months until `target` is reached, capped at 600 (50 years).
 */
function monthsToGoal(
    target: number,
    current: number,
    annualRate: number,
    monthlyContrib: number,
): number {
    if (monthlyContrib <= 0) return 600;
    const r = annualRate / 12;
    let balance = current;
    let months = 0;
    while (balance < target && months < 600) {
        balance = balance * (1 + r) + monthlyContrib;
        months++;
    }
    return months;
}

function formatMonths(m: number): string {
    if (m >= 600) return '50+ yrs';
    const y = Math.floor(m / 12);
    const mo = m % 12;
    if (y === 0) return `${mo}m`;
    if (mo === 0) return `${y}y`;
    return `${y}y ${mo}m`;
}

function targetDate(months: number): string {
    if (months >= 600) return 'N/A';
    return format(addMonths(new Date(), months), 'MMM yyyy');
}

// ─── Category rules for smart tip ────────────────────────────

const NEEDS_CATS  = ['groceries','utilities','transport','healthcare','housing'];
const WANTS_CATS  = ['dining','shopping','entertainment','education'];

// ─── Component ───────────────────────────────────────────────

const GoalAccelerationScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
    const goalId = route.params?.goalId;

    // Redux
    const goals       = useAppSelector((s) => s.goals.items);
    const transactions = useAppSelector((s) => s.transactions.items);

    // Find the goal (fallback to first if no id passed)
    const goal = useMemo(
        () => (goalId ? goals.find((g) => g.id === goalId) : goals[0]) ?? null,
        [goals, goalId],
    );

    // Monthly contribution state (start at what they need per month to hit deadline)
    const defaultContrib = useMemo(() => {
        if (!goal) return 5000;
        const daysLeft = differenceInDays(parseISO(goal.deadline), new Date());
        const monthsLeft = Math.max(Math.ceil(daysLeft / 30), 1);
        const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
        return Math.max(Math.ceil(remaining / monthsLeft / 1000) * 1000, 1000);
    }, [goal]);

    const [monthlyContrib, setMonthlyContrib] = useState(defaultContrib);
    const step = monthlyContrib >= 10000 ? 2000 : 1000;

    // Timeline calc
    const bankMonths = useMemo(
        () => goal ? monthsToGoal(goal.targetAmount, goal.savedAmount, BANK_RATE, monthlyContrib) : 0,
        [goal, monthlyContrib],
    );
    const sipMonths = useMemo(
        () => goal ? monthsToGoal(goal.targetAmount, goal.savedAmount, SIP_RATE, monthlyContrib) : 0,
        [goal, monthlyContrib],
    );
    const monthsSaved = Math.max(bankMonths - sipMonths, 0);

    // Smart budget tip: find category most over-budget this month
    const smartTip = useMemo(() => {
        const thisMonth = format(new Date(), 'yyyy-MM');
        const catSpend: Record<string, number> = {};
        transactions.forEach((t) => {
            if (t.type === 'debit' && t.date.startsWith(thisMonth) && t.category) {
                catSpend[t.category] = (catSpend[t.category] ?? 0) + t.amount;
            }
        });
        // Find biggest "wants" category
        const topWant = WANTS_CATS
            .map((c) => ({ cat: c, spend: catSpend[c] ?? 0 }))
            .filter((x) => x.spend > 0)
            .sort((a, b) => b.spend - a.spend)[0];
        if (!topWant) return null;
        const redirect = Math.round(topWant.spend * 0.3 / 500) * 500; // suggest 30% redirect
        if (redirect <= 0) return null;
        const newSipMonths = goal
            ? monthsToGoal(goal.targetAmount, goal.savedAmount, SIP_RATE, monthlyContrib + redirect)
            : 0;
        const extraMonthsSaved = Math.max(sipMonths - newSipMonths, 0);
        return { category: topWant.cat, spend: topWant.spend, redirect, extraMonthsSaved };
    }, [transactions, goal, monthlyContrib, sipMonths]);

    // Progress %
    const progress = goal
        ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
        : 0;
    const daysLeft = goal
        ? differenceInDays(parseISO(goal.deadline), new Date())
        : 0;

    // ── Empty state ───────────────────────────────────────────
    if (!goal) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                    <PiggyBank size={56} color="#C7D2FE" />
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16, textAlign: 'center' }}>
                        No Goals Yet
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
                        Create a savings goal first, then come back to simulate your investment strategy.
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ marginTop: 24, backgroundColor: '#6366F1', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>

            {/* ── Header ─────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                >
                    <ChevronLeft size={20} color="#111827" />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Accelerate Goal</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Compound interest simulator</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
            >
                {/* ── 1. Goal Hero Card ──────────────────────── */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{
                            width: 48, height: 48, borderRadius: 14,
                            backgroundColor: `${goal.color}20`,
                            alignItems: 'center', justifyContent: 'center', marginRight: 14,
                        }}>
                            {React.createElement(goalIcon(goal.icon), { size: 24, color: goal.color })}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }} numberOfLines={1}>
                                {goal.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Calendar size={12} color="#9CA3AF" />
                                <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>
                                    {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
                                </Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: goal.color }}>
                                {Math.round(progress)}%
                            </Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>saved</Text>
                        </View>
                    </View>

                    {/* Amount row */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 }}>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: goal.color }}>
                            ₹{goal.savedAmount.toLocaleString('en-IN')}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 4 }}>
                            {' '}/ ₹{goal.targetAmount.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    {/* Progress bar */}
                    <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: goal.color, borderRadius: 4 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                        ₹{Math.max(goal.targetAmount - goal.savedAmount, 0).toLocaleString('en-IN')} remaining
                    </Text>
                </View>

                {/* ── 2. Contribution Adjuster ───────────────── */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                        Monthly Contribution
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                            onPress={() => setMonthlyContrib((v) => Math.max(v - step, 1000))}
                            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.7}
                        >
                            <Minus size={20} color="#374151" />
                        </TouchableOpacity>

                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -1 }}>
                                ₹{monthlyContrib.toLocaleString('en-IN')}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>per month</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => setMonthlyContrib((v) => v + step)}
                            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.7}
                        >
                            <Plus size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Quick presets */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'center' }}>
                        {[2000, 5000, 10000, 20000].map((v) => (
                            <TouchableOpacity
                                key={v}
                                onPress={() => setMonthlyContrib(v)}
                                style={{
                                    paddingHorizontal: 12, paddingVertical: 6,
                                    borderRadius: 20, borderWidth: 1.5,
                                    borderColor: monthlyContrib === v ? '#6366F1' : '#E5E7EB',
                                    backgroundColor: monthlyContrib === v ? '#EEF2FF' : '#F9FAFB',
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: monthlyContrib === v ? '#6366F1' : '#9CA3AF' }}>
                                    ₹{v >= 1000 ? `${v / 1000}K` : v}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── 3. Smart Budget Tip ────────────────────── */}
                {smartTip && smartTip.extraMonthsSaved > 0 && (
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: '#FFF7ED',
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: '#FED7AA',
                        alignItems: 'flex-start',
                    }}>
                        <AlertCircle size={18} color="#F97316" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#9A3412' }}>
                                Smart Tip
                            </Text>
                            <Text style={{ fontSize: 12, color: '#C2410C', marginTop: 2, lineHeight: 18 }}>
                                You spent{' '}
                                <Text style={{ fontWeight: '700' }}>
                                    ₹{smartTip.spend.toLocaleString('en-IN')}
                                </Text>
                                {' '}on {smartTip.category} this month. Redirect{' '}
                                <Text style={{ fontWeight: '700' }}>₹{smartTip.redirect.toLocaleString('en-IN')}</Text>
                                {' '}to this goal and reach it{' '}
                                <Text style={{ fontWeight: '700' }}>
                                    {formatMonths(smartTip.extraMonthsSaved)} sooner!
                                </Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => setMonthlyContrib((v) => v + smartTip.redirect)}
                                style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#F97316', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: 'white' }}>
                                    Apply +₹{smartTip.redirect.toLocaleString('en-IN')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── 4. Timeline Comparison Card ───────────────── */}
                <View style={{
                    backgroundColor: '#1E1B4B',
                    borderRadius: 24,
                    padding: 24,
                    marginBottom: 16,
                    overflow: 'hidden',
                }}>
                    {/* Decorative background clock */}
                    <View style={{ position: 'absolute', right: -16, top: -16, opacity: 0.07 }}>
                        <Clock size={120} color="#FFFFFF" />
                    </View>

                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Time Saved with Smart Investing
                    </Text>

                    {/* Hero number */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 }}>
                        <Text style={{ fontSize: 60, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 }}>
                            {monthsSaved}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#A5B4FC', marginLeft: 8 }}>
                            months saved
                        </Text>
                    </View>

                    {/* Two-path comparison */}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            {/* Bank path */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                    <Landmark size={12} color="#A5B4FC" />
                                    <Text style={{ fontSize: 11, color: '#A5B4FC' }}>Bank (4% p.a.)</Text>
                                </View>
                                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>
                                    {formatMonths(bankMonths)}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#818CF8', marginTop: 4 }}>
                                    {targetDate(bankMonths)}
                                </Text>
                            </View>

                            {/* Divider */}
                            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 }} />

                            {/* SIP path */}
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                    <TrendingUp size={12} color="#A5B4FC" />
                                    <Text style={{ fontSize: 11, color: '#A5B4FC' }}>SIP (9% p.a.)</Text>
                                </View>
                                <Text style={{ fontSize: 22, fontWeight: '800', color: '#34D399' }}>
                                    {formatMonths(sipMonths)}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#6EE7B7', marginTop: 4 }}>
                                    {targetDate(sipMonths)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Investment strategy chip */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: 14, padding: 14 }}>
                        <ShieldCheck size={20} color="#34D399" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#34D399' }}>
                                {daysLeft < 365 ? 'Liquid Debt Fund' : daysLeft < 1095 ? 'Conservative Hybrid Fund' : 'Flexi Cap Equity MF'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6EE7B7', marginTop: 2, lineHeight: 17 }}>
                                {daysLeft < 365
                                    ? 'Short horizon (<1 year) - 100% debt for capital protection'
                                    : daysLeft < 1095
                                    ? 'Medium horizon (1–3 years) - 80% Debt + 20% Equity'
                                    : 'Long horizon (3+ years) - 100% equity for maximum growth'
                                }
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── 5. Disclaimer ──────────────────────────── */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12 }}>
                    <Zap size={13} color="#9CA3AF" />
                    <Text style={{ flex: 1, fontSize: 11, color: '#9CA3AF', marginLeft: 6, lineHeight: 16 }}>
                        Returns shown are estimates and not guaranteed. Past performance of mutual funds does not indicate future returns. Invest based on your risk profile and consult a SEBI-registered financial advisor before investing.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default GoalAccelerationScreen;