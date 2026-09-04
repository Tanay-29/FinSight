/**
 * BurnRateScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Financial Intelligence Layer:
 *  1. Predictive Burn Rate Engine
 *  2. Actionable Savings Engine (surplus detection)
 *  3. 50/30/20 Real-Time Visualiser with threshold alerts
 */
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    RefreshControl, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft, Flame, CheckCircle, AlertTriangle, XCircle,
    PiggyBank, RefreshCw, Lightbulb,
} from 'lucide-react-native';

/** Icon shown beside each 50/30/20 bucket. */
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resolveMonthlyIncome } from '../utils/income';
import { loadBurnRate, loadSavingsEngine } from '../store/slices/vitalsIntelSlice';
import { FONTS, COLORS } from '../theme/tokens';

// ── Gauge Bar ─────────────────────────────────────────────────────────────

const GaugeBar: React.FC<{
    value: number;
    max: number;
    color: string;
    targetPct?: number;
}> = ({ value, max, color, targetPct }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <View style={{ height: 12, backgroundColor: COLORS.surface.tertiary, borderRadius: 6, overflow: 'hidden', marginTop: 8, position: 'relative' }}>
            {targetPct !== undefined && (
                <View style={{
                    position: 'absolute', left: `${targetPct}%`, top: 0, bottom: 0,
                    width: 2, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 2,
                }} />
            )}
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 6 }} />
        </View>
    );
};

// ── Section Header ────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.surface.tertiary, alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </View>
        <View>
            <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text.primary }}>{title}</Text>
            <Text style={{ fontSize: 12, color: COLORS.text.tertiary, marginTop: 1 }}>{subtitle}</Text>
        </View>
    </View>
);

// ── Income Modal ──────────────────────────────────────────────────────────

const IncomeModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSave: (income: number) => void;
    current: number;
}> = ({ visible, onClose, onSave, current }) => {
    const [value, setValue] = useState(current > 0 ? current.toString() : '');
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '85%' }}>
                    <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text.primary, marginBottom: 8 }}>Set your monthly income</Text>
                    <Text style={{ fontSize: 13, color: COLORS.text.tertiary, marginBottom: 16 }}>Used to compute your 50/30/20 ratios and savings rate.</Text>
                    <TextInput
                        style={{ backgroundColor: COLORS.surface.secondary, borderWidth: 1.5, borderColor: COLORS.border.default, borderRadius: 12, padding: 12, fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text.primary, marginBottom: 20 }}
                        keyboardType="numeric"
                        value={value}
                        onChangeText={setValue}
                        placeholder="e.g. 50000"
                    />
                    <PressableScale
                        onPress={() => { const n = parseFloat(value); if (n > 0) onSave(n); onClose(); }}
                        style={{ backgroundColor: COLORS.brand.primary, borderRadius: 12, padding: 14, alignItems: 'center' }}
                    >
                        <Text style={{ color: '#FFF', fontFamily: FONTS.bold, fontSize: 15 }}>Save income</Text>
                    </PressableScale>
                </View>
            </View>
        </Modal>
    );
};

// ── Main Screen ──────────────────────────────────────────────────────────


const BurnRateScreen: React.FC = () => {
    const dispatch   = useAppDispatch();
    const navigation = useNavigation();

    const burnRate      = useAppSelector((s) => s.vitalsIntel.burnRate);
    const savingsEngine = useAppSelector((s) => s.vitalsIntel.savingsEngine);
    const loading       = useAppSelector((s) => s.vitalsIntel.loading);
    const totalBudget   = useAppSelector((s) =>
        s.budgets.items.reduce((sum: number, b: any) => sum + (b.monthlyLimit || 0), 0)
    );
    const profile       = useAppSelector((s) => s.auth.profile);

    const transactions = useAppSelector((s) => s.transactions.items);

    // This used to open on a midpoint of the onboarding band, so a student who
    // had logged 8,000 of real income was shown a burn rate built on 27,500.
    // What they actually logged wins; the band is only the fallback.
    const resolvedIncome = useMemo(
        () => resolveMonthlyIncome(
            transactions as any,
            profile?.incomeRange,
            new Date().toISOString().slice(0, 7),
        ),
        [transactions, profile?.incomeRange]
    );
    const [income, setIncome] = useState(() => resolvedIncome.amount);

    // Adopt a logged figure when one appears, unless the user has typed over it.
    const [incomeTouched, setIncomeTouched] = useState(false);
    useEffect(() => {
        if (!incomeTouched && resolvedIncome.amount > 0) setIncome(resolvedIncome.amount);
    }, [resolvedIncome.amount, incomeTouched]);
    const [incomeModalVisible, setIncomeModalVisible] = useState(false);
    const [refreshing, setRefreshing]     = useState(false);

    const loadAll = useCallback(() => {
        dispatch(loadBurnRate(totalBudget));
        dispatch(loadSavingsEngine(income));
    }, [dispatch, totalBudget, income]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const STATUS_COLORS: Record<string, string> = {
        ON_TRACK: COLORS.semantic.profit,
        WARNING:  COLORS.semantic.alertAmberFill,
        OVER_BUDGET: COLORS.semantic.loss,
    };

    const REC_COLORS: Record<string, { bg: string; text: string }> = {
        INVEST:     { bg: COLORS.brand.soft, text: COLORS.brand.primaryDark },
        SAVE:       { bg: '#EFF7F2', text: '#0B6A4D' },
        REALLOCATE: { bg: '#FDF5EC', text: COLORS.semantic.alertAmber },
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top']}>
            <IncomeModal
                visible={incomeModalVisible}
                onClose={() => setIncomeModalVisible(false)}
                // A figure typed here is the user overriding both the logged
                // total and the band, so stop adopting either afterwards.
                onSave={(n) => { setIncomeTouched(true); setIncome(n); }}
                current={income}
            />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface.tertiary, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronLeft size={20} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text.primary }}>Spending pace</Text>
                        <Text style={{ fontSize: 12, color: COLORS.text.tertiary }}>Where this month is heading</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => setIncomeModalVisible(true)}
                        style={{ backgroundColor: COLORS.brand.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
                    >
                        <Text style={{ fontSize: 12, color: COLORS.brand.primaryDark, fontFamily: FONTS.bold }}>₹{(income / 1000).toFixed(0)}k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={loadAll}>
                        <RefreshCw size={18} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading && !burnRate ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={COLORS.brand.primary} size="large" />
                    <Text style={{ color: COLORS.text.tertiary, marginTop: 12 }}>Working out your pace</Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand.primary} />}
                >
                    {/* ── Section 1: Burn Rate ─────────────────────────────── */}
                    <SectionHeader
                        icon={<Flame size={22} color={COLORS.semantic.loss} />}
                        title="Where the month is heading"
                        subtitle="Today's pace, carried to the end of the month"
                    />

                    {burnRate && (
                        <>
                            {/* Status Alert */}
                            <View style={{
                                backgroundColor: STATUS_COLORS[burnRate.status] + '15',
                                borderWidth: 1, borderColor: STATUS_COLORS[burnRate.status] + '40',
                                borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
                            }}>
                                {burnRate.status === 'ON_TRACK'
                                    ? <CheckCircle size={18} color={STATUS_COLORS[burnRate.status]} />
                                    : burnRate.status === 'WARNING'
                                    ? <AlertTriangle size={18} color={STATUS_COLORS[burnRate.status]} />
                                    : <XCircle size={18} color={STATUS_COLORS[burnRate.status]} />
                                }
                                <Text style={{ flex: 1, fontSize: 13, color: STATUS_COLORS[burnRate.status], fontFamily: FONTS.semibold, lineHeight: 19 }}>
                                    {burnRate.alert}
                                </Text>
                            </View>

                            {/* Metrics Row */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: 'So far', value: `₹${burnRate.current_month_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: `Day ${burnRate.days_elapsed}/${burnRate.days_in_month}`, color: COLORS.brand.primary },
                                    { label: 'Per day', value: `₹${burnRate.daily_avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: 'per day', color: COLORS.semantic.alertAmberFill },
                                    { label: 'On track for', value: `₹${burnRate.projected_monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: 'this month', color: STATUS_COLORS[burnRate.status] },
                                ].map((m) => (
                                    <View key={m.label} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.surface.tertiary }}>
                                        <Text style={{ fontSize: 10, color: COLORS.text.tertiary, fontFamily: FONTS.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</Text>
                                        <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: m.color, marginTop: 4 }}>{m.value}</Text>
                                        <Text style={{ fontSize: 10, color: COLORS.text.tertiary, marginTop: 2 }}>{m.sub}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Projection vs Budget */}
                            {burnRate.total_budget > 0 && (
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.surface.tertiary }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 13, color: COLORS.text.secondary, fontFamily: FONTS.semibold }}>Against your budget</Text>
                                        <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: burnRate.budget_variance && burnRate.budget_variance > 0 ? COLORS.semantic.loss : COLORS.semantic.profit }}>
                                            {burnRate.budget_variance && burnRate.budget_variance > 0 ? `+₹${burnRate.budget_variance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} over` : 'Within budget'}
                                        </Text>
                                    </View>
                                    <GaugeBar value={burnRate.projected_monthly} max={burnRate.total_budget * 1.3} color={STATUS_COLORS[burnRate.status]} targetPct={76} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                        <Text style={{ fontSize: 11, color: COLORS.text.tertiary }}>₹0</Text>
                                        <Text style={{ fontSize: 11, color: COLORS.text.tertiary }}>Budget: ₹{burnRate.total_budget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Top Categories */}
                            {burnRate.top_categories.length > 0 && (
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.surface.tertiary }}>
                                    <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: '#423C35', marginBottom: 12 }}>Top categories</Text>
                                    {burnRate.top_categories.map((cat, i) => (
                                        <View key={cat.category} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, color: COLORS.text.secondary, textTransform: 'capitalize', flex: 1 }}>
                                                {i + 1}. {cat.category}
                                            </Text>
                                            <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text.primary }}>
                                                ₹{cat.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
                    )}

                    {/* ── Section 2: Savings Engine ────────────────────────── */}
                    <SectionHeader
                        icon={<PiggyBank size={22} color={COLORS.semantic.profit} />}
                        title="Where you could cut"
                        subtitle="Categories running under what you budgeted"
                    />

                    {savingsEngine && (
                        <>
                            {savingsEngine.total_surplus > 0 && (
                                <View style={{ backgroundColor: '#EFF7F2', borderWidth: 1, borderColor: '#CDE8D9', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ fontSize: 12, color: '#0A5C43', fontFamily: FONTS.semibold }}>TOTAL SURPLUS AVAILABLE</Text>
                                        <Text style={{ fontSize: 24, fontFamily: FONTS.bold, color: '#0B6A4D', marginTop: 2 }}>
                                            ₹{savingsEngine.total_surplus.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </Text>
                                    </View>
                                    {savingsEngine.savings_rate !== null && (
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 11, color: '#0A5C43' }}>Savings rate</Text>
                                            <Text style={{ fontSize: 22, fontFamily: FONTS.bold, color: '#0B6A4D' }}>{savingsEngine.savings_rate.toFixed(1)}%</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {savingsEngine.events.length === 0 ? (
                                <View style={{ backgroundColor: COLORS.surface.secondary, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 }}>
                                    <Text style={{ color: COLORS.text.tertiary, fontSize: 14 }}>No surpluses detected yet. Keep budgeting!</Text>
                                </View>
                            ) : (
                                savingsEngine.events.map((event, i) => {
                                    const recStyle = REC_COLORS[event.recommendation] || REC_COLORS.REALLOCATE;
                                    return (
                                        <View
                                            key={i}
                                            style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.surface.tertiary }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text.primary, textTransform: 'capitalize' }}>{event.category}</Text>
                                                    <Text style={{ fontSize: 12, color: COLORS.text.tertiary, marginTop: 2 }}>
                                                        Spent ₹{event.actual_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹{event.planned_budget.toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
                                                    </Text>
                                                </View>
                                                <View style={{ backgroundColor: recStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                                    <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: recStyle.text }}>{event.recommendation}</Text>
                                                </View>
                                            </View>
                                            <GaugeBar value={event.actual_spend} max={event.planned_budget} color={COLORS.semantic.profit} />
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
                                                <Lightbulb size={14} color={recStyle.text} style={{ marginTop: 2 }} />
                                                <Text style={{ flex: 1, fontSize: 13, color: recStyle.text, fontFamily: FONTS.semibold, lineHeight: 18 }}>
                                                    {event.action_text}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 12, color: COLORS.semantic.profit, fontFamily: FONTS.bold, marginTop: 6 }}>
                                                Surplus: ₹{event.surplus.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({event.surplus_pct.toFixed(0)}% unspent)
                                            </Text>
                                        </View>
                                    );
                                })
                            )}
                        </>
                    )}

                    {/* The 50/30/20 breakdown used to be a third section here,
                        rebuilding what the Money Manager screen already shows in
                        more detail. Two copies of one rule on two screens is how
                        they drift apart, and it was most of what made this screen
                        feel like a wall. It is reached from the monthly budget card
                        on Vitals. */}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default BurnRateScreen;
