/**
 * BurnRateScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Financial Intelligence Layer:
 *  1. Predictive Burn Rate Engine
 *  2. Actionable Savings Engine (surplus detection)
 *  3. 50/30/20 Real-Time Visualiser with threshold alerts
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    RefreshControl, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft, Flame, TrendingDown, TrendingUp, Zap,
    CheckCircle, AlertTriangle, XCircle, Target, PiggyBank, RefreshCw,
    Lightbulb, Home, Coffee, Wallet,
} from 'lucide-react-native';

/** Icon shown beside each 50/30/20 bucket. */
const BUCKET_ICONS = {
    needs: Home,
    wants: Coffee,
    savings: Wallet,
} as const;
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadBurnRate, loadSavingsEngine, loadRule503020 } from '../store/slices/vitalsIntelSlice';

// ── Gauge Bar ─────────────────────────────────────────────────────────────

const GaugeBar: React.FC<{
    value: number;
    max: number;
    color: string;
    targetPct?: number;
}> = ({ value, max, color, targetPct }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <View style={{ height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden', marginTop: 8, position: 'relative' }}>
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
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </View>
        <View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{title}</Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{subtitle}</Text>
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
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 }}>Set Monthly Income</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Used to compute your 50/30/20 ratios and savings rate.</Text>
                    <TextInput
                        style={{ backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 }}
                        keyboardType="numeric"
                        value={value}
                        onChangeText={setValue}
                        placeholder="e.g. 50000"
                    />
                    <TouchableOpacity
                        onPress={() => { const n = parseFloat(value); if (n > 0) onSave(n); onClose(); }}
                        style={{ backgroundColor: '#6366F1', borderRadius: 12, padding: 14, alignItems: 'center' }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Save Income</Text>
                    </TouchableOpacity>
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
    const rule503020    = useAppSelector((s) => s.vitalsIntel.rule503020);
    const loading       = useAppSelector((s) => s.vitalsIntel.loading);
    const totalBudget   = useAppSelector((s) =>
        s.budgets.items.reduce((sum: number, b: any) => sum + (b.monthlyLimit || 0), 0)
    );

    const [income, setIncome]             = useState(50000);
    const [incomeModalVisible, setIncomeModalVisible] = useState(false);
    const [refreshing, setRefreshing]     = useState(false);

    const loadAll = useCallback(() => {
        dispatch(loadBurnRate(totalBudget));
        dispatch(loadSavingsEngine(income));
        dispatch(loadRule503020(income));
    }, [dispatch, totalBudget, income]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const STATUS_COLORS: Record<string, string> = {
        ON_TRACK: '#10B981',
        WARNING:  '#F59E0B',
        OVER_BUDGET: '#EF4444',
    };

    const BUCKET_COLORS: Record<string, string> = {
        needs:   '#3B82F6',
        wants:   '#8B5CF6',
        savings: '#10B981',
    };

    const BUCKET_TARGETS: Record<string, number> = {
        needs: 50, wants: 30, savings: 20,
    };

    const REC_COLORS: Record<string, { bg: string; text: string }> = {
        INVEST:     { bg: '#EDE9FE', text: '#7C3AED' },
        SAVE:       { bg: '#ECFDF5', text: '#059669' },
        REALLOCATE: { bg: '#FFF7ED', text: '#D97706' },
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
            <IncomeModal
                visible={incomeModalVisible}
                onClose={() => setIncomeModalVisible(false)}
                onSave={(n) => { setIncome(n); }}
                current={income}
            />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronLeft size={20} color="#111827" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Financial Intelligence</Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Burn Rate · Savings · 50/30/20</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => setIncomeModalVisible(true)}
                        style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
                    >
                        <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '700' }}>₹{(income / 1000).toFixed(0)}k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={loadAll}>
                        <RefreshCw size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading && !burnRate ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#6366F1" size="large" />
                    <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Computing your financial intelligence…</Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
                >
                    {/* ── Section 1: Burn Rate ─────────────────────────────── */}
                    <SectionHeader
                        icon={<Flame size={22} color="#EF4444" />}
                        title="Burn Rate Engine"
                        subtitle="Predictive monthly spend projection"
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
                                <Text style={{ flex: 1, fontSize: 13, color: STATUS_COLORS[burnRate.status], fontWeight: '600', lineHeight: 19 }}>
                                    {burnRate.alert}
                                </Text>
                            </View>

                            {/* Metrics Row */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: 'Spent Today', value: `₹${burnRate.current_month_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: `Day ${burnRate.days_elapsed}/${burnRate.days_in_month}`, color: '#6366F1' },
                                    { label: 'Daily Avg', value: `₹${burnRate.daily_avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: 'per day', color: '#F59E0B' },
                                    { label: 'Projected', value: `₹${burnRate.projected_monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: 'this month', color: STATUS_COLORS[burnRate.status] },
                                ].map((m) => (
                                    <View key={m.label} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' }}>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: m.color, marginTop: 4 }}>{m.value}</Text>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{m.sub}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Projection vs Budget */}
                            {burnRate.total_budget > 0 && (
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Projected vs Budget</Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: burnRate.budget_variance && burnRate.budget_variance > 0 ? '#EF4444' : '#10B981' }}>
                                            {burnRate.budget_variance && burnRate.budget_variance > 0 ? `+₹${burnRate.budget_variance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} over` : 'Within budget'}
                                        </Text>
                                    </View>
                                    <GaugeBar value={burnRate.projected_monthly} max={burnRate.total_budget * 1.3} color={STATUS_COLORS[burnRate.status]} targetPct={76} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>₹0</Text>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Budget: ₹{burnRate.total_budget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Top Categories */}
                            {burnRate.top_categories.length > 0 && (
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 }}>Top Spending Categories</Text>
                                    {burnRate.top_categories.map((cat, i) => (
                                        <View key={cat.category} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={{ fontSize: 13, color: '#6B7280', textTransform: 'capitalize', flex: 1 }}>
                                                {i + 1}. {cat.category}
                                            </Text>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
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
                        icon={<PiggyBank size={22} color="#10B981" />}
                        title="Savings Opportunities"
                        subtitle="Category surpluses detected this month"
                    />

                    {savingsEngine && (
                        <>
                            {savingsEngine.total_surplus > 0 && (
                                <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>TOTAL SURPLUS AVAILABLE</Text>
                                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#059669', marginTop: 2 }}>
                                            ₹{savingsEngine.total_surplus.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </Text>
                                    </View>
                                    {savingsEngine.savings_rate !== null && (
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 11, color: '#065F46' }}>Savings Rate</Text>
                                            <Text style={{ fontSize: 22, fontWeight: '800', color: '#059669' }}>{savingsEngine.savings_rate.toFixed(1)}%</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {savingsEngine.events.length === 0 ? (
                                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 }}>
                                    <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No surpluses detected yet. Keep budgeting!</Text>
                                </View>
                            ) : (
                                savingsEngine.events.map((event, i) => {
                                    const recStyle = REC_COLORS[event.recommendation] || REC_COLORS.REALLOCATE;
                                    return (
                                        <View
                                            key={i}
                                            style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' }}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>{event.category}</Text>
                                                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                                                        Spent ₹{event.actual_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹{event.planned_budget.toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
                                                    </Text>
                                                </View>
                                                <View style={{ backgroundColor: recStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: recStyle.text }}>{event.recommendation}</Text>
                                                </View>
                                            </View>
                                            <GaugeBar value={event.actual_spend} max={event.planned_budget} color="#10B981" />
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
                                                <Lightbulb size={14} color={recStyle.text} style={{ marginTop: 2 }} />
                                                <Text style={{ flex: 1, fontSize: 13, color: recStyle.text, fontWeight: '600', lineHeight: 18 }}>
                                                    {event.action_text}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700', marginTop: 6 }}>
                                                Surplus: ₹{event.surplus.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({event.surplus_pct.toFixed(0)}% unspent)
                                            </Text>
                                        </View>
                                    );
                                })
                            )}
                        </>
                    )}

                    {/* ── Section 3: 50/30/20 Real-Time ────────────────────── */}
                    <SectionHeader
                        icon={<Target size={22} color="#6366F1" />}
                        title="50 / 30 / 20 Live"
                        subtitle={`Based on ₹${income.toLocaleString('en-IN')} monthly income`}
                    />

                    {rule503020 && (
                        <>
                            {/* Alerts */}
                            {rule503020.alerts.map((alert, i) => (
                                <View
                                    key={i}
                                    style={{
                                        flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12,
                                        borderRadius: 14, marginBottom: 10, borderWidth: 1,
                                        backgroundColor: alert.type === 'CRITICAL' ? '#FEF2F2' : alert.type === 'WARNING' ? '#FFFBEB' : '#EFF6FF',
                                        borderColor: alert.type === 'CRITICAL' ? '#FECACA' : alert.type === 'WARNING' ? '#FDE68A' : '#BFDBFE',
                                    }}
                                >
                                    {alert.type === 'CRITICAL'
                                        ? <XCircle size={16} color="#EF4444" />
                                        : alert.type === 'WARNING'
                                        ? <AlertTriangle size={16} color="#F59E0B" />
                                        : <Zap size={16} color="#3B82F6" />
                                    }
                                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18,
                                        color: alert.type === 'CRITICAL' ? '#991B1B' : alert.type === 'WARNING' ? '#92400E' : '#1E3A8A'
                                    }}>
                                        {alert.message}
                                    </Text>
                                </View>
                            ))}

                            {/* Golden Ratio Badge */}
                            {rule503020.is_golden_ratio && (
                                <View style={{ backgroundColor: '#ECFDF5', borderRadius: 14, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                                    <CheckCircle size={18} color="#10B981" />
                                    <Text style={{ fontSize: 13, color: '#065F46', fontWeight: '700' }}>
                                        Golden Ratio. You're within the 50/30/20 target.
                                    </Text>
                                </View>
                            )}

                            {/* Bucket Bars */}
                            {(['needs', 'wants', 'savings'] as const).map((bucket) => {
                                const data = rule503020.buckets[bucket];
                                if (!data) return null;
                                const color  = BUCKET_COLORS[bucket];
                                const target = BUCKET_TARGETS[bucket];
                                const isOver = data.status === 'OVER';
                                // The rule is judged against income, so that is
                                // the share to show. Without income there is no
                                // rule, and share of spending is all we have.
                                const shown = rule503020.rule_evaluated
                                    ? data.pct_of_income
                                    : data.pct_of_spend;
                                const isGood = data.status === 'ON_TRACK';

                                return (
                                    <View key={bucket} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: isGood ? color + '40' : '#F3F4F6' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
                                                    {React.createElement(BUCKET_ICONS[bucket], { size: 18, color })}
                                                </View>
                                                <View>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' }}>{bucket}</Text>
                                                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Target: {target}%</Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ fontSize: 20, fontWeight: '800', color: isOver ? '#EF4444' : isGood ? '#10B981' : color }}>
                                                    {shown.toFixed(1)}%
                                                </Text>
                                                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                                                    ₹{data.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </Text>
                                            </View>
                                        </View>
                                        <GaugeBar value={Math.max(0, shown)} max={100} color={isOver ? '#EF4444' : color} targetPct={target} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                {isGood
                                                    ? <CheckCircle size={12} color="#10B981" />
                                                    : isOver
                                                    ? <XCircle size={12} color="#EF4444" />
                                                    : <AlertTriangle size={12} color="#F59E0B" />
                                                }
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: isGood ? '#10B981' : isOver ? '#EF4444' : '#F59E0B' }}>
                                                    {isGood ? 'On track' : isOver ? `${data.delta.toFixed(1)}% over` : `${Math.abs(data.delta).toFixed(1)}% under`}
                                                </Text>
                                            </View>
                                            {data.pct_of_income > 0 && (
                                                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                                                    {data.pct_of_income.toFixed(1)}% of income
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Implicit Savings */}
                            {rule503020.implicit_savings !== null && (
                                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
                                    <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600', marginBottom: 4 }}>NET SAVINGS THIS MONTH</Text>
                                    <Text style={{ fontSize: 28, fontWeight: '900', color: rule503020.implicit_savings >= 0 ? '#059669' : '#EF4444' }}>
                                        {rule503020.implicit_savings >= 0 ? '+' : ''}₹{rule503020.implicit_savings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                                        Income ₹{rule503020.income.toLocaleString('en-IN', { maximumFractionDigits: 0 })} − Spend ₹{rule503020.total_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default BurnRateScreen;
