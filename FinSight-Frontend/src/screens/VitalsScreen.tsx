import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import {
    Utensils, ShoppingBag, Car, ShoppingCart, Zap, Film,
    TrendingUp, Heart, BookOpen, Home, Package, DollarSign,
    ChevronRight, PieChart, Repeat, Flame, Briefcase, PiggyBank, Leaf,
} from 'lucide-react-native';
import { summariseNoSpendDays, noSpendMessage } from '../utils/noSpendDays';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBudgets, createBudget, updateBudgetLimit } from '../store/slices/budgetsSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { loadRoundupBalance } from '../store/slices/walletSlice';
import { BudgetBar } from '../components/BudgetBar';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';

// ─── Icon helpers (Lucide) ───────────────────────────────────────

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
    dining: Utensils,
    shopping: ShoppingBag,
    transport: Car,
    groceries: ShoppingCart,
    utilities: Zap,
    entertainment: Film,
    investments: TrendingUp,
    health: Heart,
    healthcare: Heart,
    education: BookOpen,
    housing: Home,
    rent: Home,
    miscellaneous: Package,
};

const getCategoryIconNode = (category: string, size = 16, color = '#6B7280') => {
    const IconComponent = CATEGORY_ICON_MAP[category.toLowerCase()] || DollarSign;
    return <IconComponent size={size} color={color} />;
};

const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
        dining: '#F97316', shopping: '#EC4899', transport: '#3B82F6', groceries: '#10B981',
        utilities: '#EAB308', entertainment: '#8B5CF6', investments: '#6366F1', health: '#EF4444',
        education: '#14B8A6', housing: '#F59E0B'
    };
    return map[category.toLowerCase()] || '#9CA3AF';
};

// ─── Bar Chart ───────────────────────────────────────────────────

const SpendingBarChart: React.FC<{ data: { name: string; amount: number; color: string }[] }> = ({ data }) => {
    if (data.length === 0) return (
        <View className="py-6 items-center">
            <Text className="text-text-secondary text-sm">No spending data this month.</Text>
        </View>
    );
    const maxAmount = Math.max(...data.map((d) => d.amount));
    const barWidth = 36;
    const chartHeight = 150;
    const gap = 12;
    const totalWidth = data.length * (barWidth + gap);

    return (
        <Svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${totalWidth} ${chartHeight + 30}`}>
            {data.map((item, index) => {
                const barHeight = (item.amount / maxAmount) * (chartHeight - 20) || 5;
                const x = index * (barWidth + gap) + gap / 2;
                const y = chartHeight - barHeight;
                return (
                    <React.Fragment key={item.name}>
                        <Rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={item.color} />
                        <SvgText x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="#374151" fontWeight="600">
                            {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : `${item.amount}`}
                        </SvgText>
                        <SvgText x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize={9} fill="#9CA3AF">
                            {item.name.substring(0, 6)}
                        </SvgText>
                    </React.Fragment>
                );
            })}
        </Svg>
    );
};

// ─── Edit Budget Modal ────────────────────────────────────────────

const EditBudgetModal: React.FC<{
    visible: boolean;
    budget: any;
    onClose: () => void;
    onSave: (limit: number) => void;
}> = ({ visible, budget, onClose, onSave }) => {
    const [limit, setLimit] = React.useState('');
    React.useEffect(() => { if (budget) setLimit(budget.monthlyLimit.toString()); }, [budget]);
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[85%] rounded-2xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-4">Edit {budget?.category} Budget</Text>
                    <Text className="text-sm text-text-secondary mb-2">Monthly Limit (₹)</Text>
                    <TextInput
                        className="bg-surface-tertiary p-3 rounded-lg text-lg text-text-primary mb-6"
                        value={limit}
                        onChangeText={setLimit}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                    />
                    <View className="flex-row justify-end gap-3">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2">
                            <Text className="text-text-secondary font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const amount = parseFloat(limit);
                                if (!isNaN(amount) && amount > 0) onSave(amount);
                            }}
                            className="bg-brand-primary px-6 py-2 rounded-lg"
                        >
                            <Text className="text-white font-semibold">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Create Budget Modal ──────────────────────────────────────────

const CreateBudgetModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSave: (categoryId: string, limit: number) => void;
}> = ({ visible, onClose, onSave }) => {
    const CATEGORIES = [
        { id: 'dining', name: 'Dining' },
        { id: 'transport', name: 'Transport' },
        { id: 'shopping', name: 'Shopping' },
        { id: 'groceries', name: 'Groceries' },
        { id: 'utilities', name: 'Utilities' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'health', name: 'Health' },
        { id: 'education', name: 'Education' },
        { id: 'other', name: 'Other' },
    ];
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('dining');
    const [limit, setLimit] = React.useState('');
    React.useEffect(() => {
        if (visible) { setSelectedCategoryId('dining'); setLimit(''); }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[85%] rounded-2xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-4">Add New Budget</Text>
                    <Text className="text-sm text-text-secondary mb-2">Category</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`px-3 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-brand-primary border-brand-primary' : 'bg-white border-border'}`}
                                onPress={() => setSelectedCategoryId(cat.id)}
                            >
                                <Text className={selectedCategoryId === cat.id ? 'text-white' : 'text-text-primary'}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-sm text-text-secondary mb-2">Monthly Limit (₹)</Text>
                    <TextInput
                        className="bg-surface-tertiary p-3 rounded-lg text-lg text-text-primary mb-6"
                        value={limit}
                        onChangeText={setLimit}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                    />
                    <View className="flex-row justify-end gap-3">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2">
                            <Text className="text-text-secondary font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const amount = parseFloat(limit);
                                if (selectedCategoryId && !isNaN(amount) && amount > 0) onSave(selectedCategoryId, amount);
                            }}
                            className="bg-brand-primary px-6 py-2 rounded-lg"
                        >
                            <Text className="text-white font-semibold">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────

export const VitalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();

    const { items: budgets, loading: budgetsLoading } = useAppSelector((state) => state.budgets);
    const transactions = useAppSelector((state) => state.transactions.items);
    const goals = useAppSelector((state: any) => state.goals?.items || []);

    // Days nothing went out. Counted as wins; see utils/noSpendDays.
    const noSpend = React.useMemo(() => summariseNoSpendDays(transactions), [transactions]);
    const { user } = useAppSelector((state) => state.auth);
    const userInitial = user?.displayName?.charAt(0).toUpperCase() || 'U';
    // userId for non-hook usage (safe — read at component top level via selector)
    const userId = useAppSelector((state) => state.auth.user?.uid);

    const currentMonthKey = format(new Date(), 'yyyy-MM');
    const [selectedBudget, setSelectedBudget] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [createModalVisible, setCreateModalVisible] = React.useState(false);

    const roundup = useAppSelector((s) => s.wallet.roundup);

    useEffect(() => {
        dispatch(fetchBudgets());
        dispatch(fetchTransactions());
        dispatch(loadRoundupBalance());
    }, [dispatch]);

    const recentSpending = React.useMemo(() => {
        let spentToday = 0;
        let spentThisWeek = 0;
        transactions.forEach((t) => {
            if (t.type === 'debit') {
                const txDate = parseISO(t.date);
                if (isToday(txDate)) spentToday += t.amount;
                if (isThisWeek(txDate)) spentThisWeek += t.amount;
            }
        });
        return { spentToday, spentThisWeek };
    }, [transactions]);

    const totalBudget = budgets
        .filter((b) => b.month === currentMonthKey)
        .reduce((sum, b) => sum + b.monthlyLimit, 0);
    const totalSpent = transactions
        .filter((t) => t.type === 'debit' && format(new Date(t.date), 'yyyy-MM') === currentMonthKey)
        .reduce((sum, t) => sum + t.amount, 0);
    const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Top Goal
    const topGoal = goals.length > 0 ? goals[0] : null;
    const safeCurrentAmount = topGoal ? (topGoal.currentAmount || topGoal.savedAmount || 0) : 0;
    const safeTargetAmount = topGoal ? (topGoal.targetAmount || 1) : 1;
    const goalProgressPercentage = Math.min((safeCurrentAmount / safeTargetAmount) * 100, 100);

    const chartData = React.useMemo(() => {
        const totals: Record<string, number> = {};
        transactions.forEach((t) => {
            if (t.type === 'debit' && format(new Date(t.date), 'yyyy-MM') === currentMonthKey) {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            }
        });
        return Object.entries(totals)
            .map(([name, amount]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                amount,
                color: getCategoryColor(name),
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);
    }, [transactions, currentMonthKey]);

    const handleCreateBudget = async (category: string, limit: number) => {
        const initialSpend = transactions
            .filter((t) =>
                t.type === 'debit' &&
                t.category.toLowerCase() === category.toLowerCase() &&
                format(new Date(t.date), 'yyyy-MM') === currentMonthKey
            )
            .reduce((sum, t) => sum + t.amount, 0);
        await dispatch(createBudget({ category, monthlyLimit: limit, currentSpend: initialSpend, month: currentMonthKey }));
        setCreateModalVisible(false);
    };

    const handleUpdateBudget = async (limit: number) => {
        if (selectedBudget?.id) {
            await dispatch(updateBudgetLimit({ id: selectedBudget.id, limit }));
            setModalVisible(false);
            setSelectedBudget(null);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <CreateBudgetModal
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onSave={handleCreateBudget}
            />
            <EditBudgetModal
                visible={modalVisible}
                budget={selectedBudget}
                onClose={() => setModalVisible(false)}
                onSave={handleUpdateBudget}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
                <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
                    <View>
                        <Text className="text-2xl font-bold text-text-primary">Financial Vitals</Text>
                        <Text className="text-sm text-text-secondary">{format(new Date(), 'MMMM yyyy')}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        {budgetsLoading && <ActivityIndicator size="small" color="#6366F1" />}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Profile' as never)}
                            activeOpacity={0.8}
                            className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
                        >
                            <Text className="text-white font-bold text-base">{userInitial}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* No-spend days. Deliberately the first thing on the screen:
                    it is the one panel that has something good to say on a day
                    with no money in it. */}
                <View className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-4">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-3">
                            <Leaf color="#10B981" size={18} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-text-primary">
                                {noSpend.thisMonth} clear day{noSpend.thisMonth === 1 ? '' : 's'} this month
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5">
                                {noSpendMessage(noSpend)}
                            </Text>
                        </View>
                        {noSpend.currentRun > 0 && (
                            <View className="bg-emerald-50 rounded-full px-3 py-1.5 ml-2">
                                <Text className="text-xs font-extrabold text-emerald-700">
                                    {noSpend.currentRun} in a row
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Daily/Weekly Spending Pulse */}
                <View className="mx-4 mt-3 flex-row justify-between gap-3">
                    <View className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <Text className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Spent Today</Text>
                        <Text className="text-xl font-bold text-gray-900" style={{ fontVariant: ['tabular-nums'] }}>
                            ₹{recentSpending.spentToday.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View className="flex-1 bg-teal-50 border border-teal-100 rounded-xl p-4">
                        <Text className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">This Week</Text>
                        <Text className="text-xl font-bold text-gray-900" style={{ fontVariant: ['tabular-nums'] }}>
                            ₹{recentSpending.spentThisWeek.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                {/* Monthly Budget Summary */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-text-secondary">Monthly Budget</Text>
                        <Text className="text-sm font-semibold text-text-primary">{overallPercentage}% used</Text>
                    </View>
                    <View className="flex-row items-baseline mb-2">
                        <Text className="text-3xl font-bold text-text-primary">₹{totalSpent.toLocaleString('en-IN')}</Text>
                        <Text className="text-base text-text-tertiary ml-2">/ ₹{totalBudget.toLocaleString('en-IN')}</Text>
                    </View>
                    <View className="h-3 bg-surface-tertiary rounded-full overflow-hidden">
                        <View
                            className={`h-full rounded-full ${overallPercentage < 80 ? 'bg-profit' : overallPercentage < 100 ? 'bg-alert-amber' : 'bg-alert-critical'}`}
                            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                        />
                    </View>
                </View>

                {/* Category Spending Chart */}
                <View className="mx-4 mt-5 bg-white border border-border rounded-xl p-4">
                    <Text className="text-lg font-semibold text-text-primary mb-3">Category Spending</Text>
                    <SpendingBarChart data={chartData} />
                </View>

                {/* Top Goal Progress */}
                <View className="mx-4 mt-5 bg-white border border-border rounded-xl p-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-semibold text-text-primary">Top Goal Progress</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Goals' as never)}>
                            <Text className="text-brand-primary font-bold text-sm">View Goals</Text>
                        </TouchableOpacity>
                    </View>

                    {topGoal ? (
                        <>
                            <View className="flex-row items-center mb-3">
                                <View className="w-12 h-12 bg-indigo-50 rounded-full items-center justify-center mr-3">
                                    <Text className="text-2xl">{topGoal.emoji || '🎯'}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-bold text-text-primary">{topGoal.name || topGoal.title}</Text>
                                    <Text className="text-xs text-text-secondary mt-1">
                                        ₹{safeCurrentAmount.toLocaleString('en-IN')} / ₹{safeTargetAmount.toLocaleString('en-IN')}
                                    </Text>
                                </View>
                                <Text className="text-lg font-bold text-brand-primary">
                                    {Math.round(goalProgressPercentage)}%
                                </Text>
                            </View>

                            <View className="h-2.5 bg-surface-tertiary rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-brand-primary rounded-full"
                                    style={{ width: `${goalProgressPercentage}%` }}
                                />
                            </View>

                            {topGoal.deadline && (
                                <Text className="text-xs text-text-tertiary mt-2 text-right">
                                    Target Date: {format(parseISO(topGoal.deadline), 'MMM yyyy')}
                                </Text>
                            )}
                        </>
                    ) : (
                        <View className="items-center py-4">
                            <Text className="text-text-secondary mb-3">No active goals found.</Text>
                            <TouchableOpacity
                                className="bg-brand-primary px-4 py-2 rounded-lg"
                                onPress={() => navigation.navigate('Goals' as never)}
                            >
                                <Text className="text-white font-semibold">Create a Goal</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ─── Feature Quick-Access Row ──────────────────── */}
                <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 20, marginBottom: 4 }}>

                    {/* 50/30/20 Money Manager */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('MoneyManager' as never)}
                        activeOpacity={0.85}
                        style={{
                            flex: 1, backgroundColor: '#6366F1',
                            borderRadius: 18, padding: 16,
                            shadowColor: '#6366F1', shadowOpacity: 0.3,
                            shadowRadius: 8, elevation: 4,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <PieChart size={18} color="white" />
                            </View>
                            <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
                        </View>
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, marginTop: 12 }}>50/30/20</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Money Manager</Text>
                    </TouchableOpacity>

                    {/* Leaky Spend Tracker */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('SubscriptionTracker' as never)}
                        activeOpacity={0.85}
                        style={{
                            flex: 1, backgroundColor: '#FFFFFF',
                            borderRadius: 18, padding: 16,
                            borderWidth: 1.5, borderColor: '#F3F4F6',
                            shadowColor: '#000', shadowOpacity: 0.04,
                            shadowRadius: 8, elevation: 2,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                <Repeat size={18} color="#D97706" />
                            </View>
                            <ChevronRight size={16} color="#D1D5DB" />
                        </View>
                        <Text style={{ color: '#111827', fontWeight: '800', fontSize: 13, marginTop: 12 }}>Leaky Spend</Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Recurring charges</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Intelligence Quick-Access Row ─────────────── */}
                <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Financial Intelligence</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 4 }}>

                    {/* Burn Rate */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('BurnRate' as never)}
                        activeOpacity={0.85}
                        style={{
                            flex: 1, backgroundColor: '#EF4444',
                            borderRadius: 18, padding: 16,
                            shadowColor: '#EF4444', shadowOpacity: 0.3,
                            shadowRadius: 8, elevation: 4,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <Flame size={18} color="white" />
                            </View>
                            <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
                        </View>
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, marginTop: 12 }}>Burn Rate</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Spend projection</Text>
                    </TouchableOpacity>

                    {/* Invest & Portfolio */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Invest' as never)}
                        activeOpacity={0.85}
                        style={{
                            flex: 1, backgroundColor: '#0F766E',
                            borderRadius: 18, padding: 16,
                            shadowColor: '#0F766E', shadowOpacity: 0.3,
                            shadowRadius: 8, elevation: 4,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                <Briefcase size={18} color="white" />
                            </View>
                            <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
                        </View>
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, marginTop: 12 }}>Invest</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>Mock brokerage</Text>
                    </TouchableOpacity>
                </View>

                {/* Round-Up Wallet mini-card */}
                {roundup !== null && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('RoundUp' as never)}
                        activeOpacity={0.85}
                        style={{
                            marginHorizontal: 16, marginTop: 10, marginBottom: 4,
                            backgroundColor: '#FFFBEB',
                            borderWidth: 1.5, borderColor: '#FDE68A',
                            borderRadius: 18, padding: 16,
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                <PiggyBank size={20} color="#D97706" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>Round-Up Wallet</Text>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827', marginTop: 1 }}>
                                    ₹{(roundup?.roundup_balance || 0).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            {roundup?.ready_to_invest ? (
                                <View style={{ backgroundColor: '#D97706', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>Invest Now!</Text>
                                </View>
                            ) : (
                                <Text style={{ fontSize: 12, color: '#B45309', fontWeight: '600' }}>
                                    {(roundup?.progress_pct || 0).toFixed(0)}% to ₹500
                                </Text>
                            )}
                            <ChevronRight size={14} color="#D97706" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Budget Breakdown */}
                <View className="mx-4 mt-5 bg-white border border-border rounded-xl p-4 mb-8">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-lg font-semibold text-text-primary">Budget Breakdown</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                            <Text className="text-brand-primary font-bold text-sm">Add Budget</Text>
                        </TouchableOpacity>
                    </View>

                    {budgets.length > 0 ? (
                        budgets
                            .filter((budget) => budget.month === currentMonthKey)
                            .map((budget) => {
                                const dynamicSpend = transactions
                                    .filter((t) =>
                                        t.type === 'debit' &&
                                        t.category.toLowerCase() === budget.category.toLowerCase() &&
                                        format(new Date(t.date), 'yyyy-MM') === budget.month
                                    )
                                    .reduce((sum, t) => sum + t.amount, 0);

                                const spent = dynamicSpend > 0 ? dynamicSpend : budget.currentSpend;

                                return (
                                    <TouchableOpacity
                                        key={budget.category}
                                        onPress={() => { setSelectedBudget(budget); setModalVisible(true); }}
                                    >
                                        <BudgetBar
                                            category={budget.category}
                                            icon={getCategoryIconNode(budget.category)}
                                            spent={spent}
                                            limit={budget.monthlyLimit}
                                        />
                                    </TouchableOpacity>
                                );
                            })
                    ) : (
                        <Text className="text-text-secondary text-center py-4">No budgets set for this month.</Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};