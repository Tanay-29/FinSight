import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBudgets, createBudget, updateBudgetLimit } from '../store/slices/budgetsSlice';
import { clearUserData } from '../services/firestoreService';
import { fetchTransactions } from '../store/slices/transactionsSlice';
// IMPORTANT: We might need to fetch goals here too, depending on your setup.
// If you have a fetchGoals thunk, uncomment the import below!
// import { fetchGoals } from '../store/slices/goalsSlice'; 
import { BudgetBar } from '../components/BudgetBar';
import { format, isToday, isThisWeek, parseISO, differenceInDays } from 'date-fns';

// --- MOCK BILLS DATA (We'll keep this mocked until you build a Bills feature) ---
const MOCK_BILLS = [
    { id: '1', name: 'Netflix', amount: 649, dueDate: '2026-03-24', icon: '🎬' },
    { id: '2', name: 'Electricity', amount: 2400, dueDate: '2026-03-28', icon: '⚡' },
    { id: '3', name: 'Apartment Rent', amount: 15000, dueDate: '2026-04-01', icon: '🏠' },
    { id: '4', name: 'Gym Membership', amount: 1500, dueDate: '2026-04-05', icon: '💪' },
];

// --- Your existing components stay here unchanged ---
const SpendingBarChart: React.FC<{ data: { name: string; amount: number; color: string }[]; }> = ({ data }) => {
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
                        <SvgText x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#111827">
                            ₹{item.amount.toLocaleString('en-IN')}
                        </SvgText>
                        <SvgText x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize={9} fill="#9CA3AF">
                            {item.name.substring(0, 4)}
                        </SvgText>
                    </React.Fragment>
                );
            })}
        </Svg>
    );
};

const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
        dining: '#F97316', shopping: '#EC4899', transport: '#3B82F6', groceries: '#10B981',
        utilities: '#EAB308', entertainment: '#8B5CF6', investments: '#6366F1', health: '#EF4444',
        education: '#14B8A6', housing: '#F59E0B'
    };
    return map[category.toLowerCase()] || '#9CA3AF';
};

const getCategoryIcon = (category: string) => {
    const map: Record<string, string> = {
        dining: '🍽️', shopping: '🛍️', transport: '🚗', groceries: '🛒',
        utilities: '⚡', entertainment: '🎬', investments: '📈', health: '💊',
        education: '📚', housing: '🏠'
    };
    return map[category.toLowerCase()] || '💰';
};

const EditBudgetModal: React.FC<{ visible: boolean; budget: any; onClose: () => void; onSave: (limit: number) => void; }> = ({ visible, budget, onClose, onSave }) => {
    const [limit, setLimit] = React.useState('');
    React.useEffect(() => { if (budget) setLimit(budget.monthlyLimit.toString()); }, [budget]);
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[85%] rounded-2xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-4">Edit {budget?.category} Budget</Text>
                    <Text className="text-sm text-text-secondary mb-2">Monthly Limit (₹)</Text>
                    <TextInput className="bg-surface-tertiary p-3 rounded-lg text-lg text-text-primary mb-6" value={limit} onChangeText={setLimit} keyboardType="numeric" placeholder="Enter amount" />
                    <View className="flex-row justify-end space-x-4">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2"><Text className="text-text-secondary font-semibold">Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { const amount = parseFloat(limit); if (!isNaN(amount) && amount > 0) onSave(amount); }} className="bg-brand-primary px-6 py-2 rounded-lg">
                            <Text className="text-white font-semibold">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const CreateBudgetModal: React.FC<{ visible: boolean; onClose: () => void; onSave: (categoryId: string, limit: number) => void; }> = ({ visible, onClose, onSave }) => {
    const CATEGORIES = [{ id: 'dining', name: 'Dining' }, { id: 'transport', name: 'Transport' }, { id: 'shopping', name: 'Shopping' }, { id: 'groceries', name: 'Groceries' }, { id: 'utilities', name: 'Utilities' }, { id: 'entertainment', name: 'Entertainment' }, { id: 'other', name: 'Other' }];
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('dining');
    const [limit, setLimit] = React.useState('');
    React.useEffect(() => { if (visible) { setSelectedCategoryId('dining'); setLimit(''); } }, [visible]);
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[85%] rounded-2xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-4">Add New Budget</Text>
                    <Text className="text-sm text-text-secondary mb-2">Category</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity key={cat.id} className={`px-3 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-brand-primary border-brand-primary' : 'bg-white border-border'}`} onPress={() => setSelectedCategoryId(cat.id)}>
                                <Text className={selectedCategoryId === cat.id ? 'text-white' : 'text-text-primary'}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-sm text-text-secondary mb-2">Monthly Limit (₹)</Text>
                    <TextInput className="bg-surface-tertiary p-3 rounded-lg text-lg text-text-primary mb-6" value={limit} onChangeText={setLimit} keyboardType="numeric" placeholder="Enter amount" />
                    <View className="flex-row justify-end space-x-4">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2"><Text className="text-text-secondary font-semibold">Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { const amount = parseFloat(limit); if (selectedCategoryId && !isNaN(amount) && amount > 0) onSave(selectedCategoryId, amount); }} className="bg-brand-primary px-6 py-2 rounded-lg">
                            <Text className="text-white font-semibold">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};


export const VitalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation(); 
    
    // --- REDUX SELECTORS ---
    const { items: budgets, loading: budgetsLoading } = useAppSelector((state) => state.budgets);
    const transactions = useAppSelector((state) => state.transactions.items);
    
    // 1. Grab the real goals array from your Redux store!
    // Using defensive optional chaining (?.) just in case the slice is named slightly differently.
    const goals = useAppSelector((state: any) => state.goals?.items || []); 

    const loading = budgetsLoading;
    const currentMonthKey = format(new Date(), 'yyyy-MM');

    const [selectedBudget, setSelectedBudget] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [createModalVisible, setCreateModalVisible] = React.useState(false);

    useEffect(() => {
        dispatch(fetchBudgets());
        dispatch(fetchTransactions());
        // If you have a fetchGoals thunk, you should dispatch it here too!
        // dispatch(fetchGoals()); 
    }, [dispatch]);

    // Math: Daily/Weekly Spending
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


    const handleCreateBudget = async (category: string, limit: number) => {
        const initialSpend = transactions.filter((t) => t.type === 'debit' && t.category.toLowerCase() === category.toLowerCase() && format(new Date(t.date), 'yyyy-MM') === currentMonthKey).reduce((sum, t) => sum + t.amount, 0);
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

    const userId = useAppSelector((state) => state.auth.user?.uid);
    const handleReset = async () => {
        if (userId) {
            await clearUserData(userId);
            dispatch(fetchBudgets());
            dispatch(fetchTransactions());
        }
    };

    const totalBudget = budgets.filter((b) => b.month === currentMonthKey).reduce((sum, b) => sum + b.monthlyLimit, 0);
    const totalSpent = transactions.filter((t) => t.type === 'debit' && format(new Date(t.date), 'yyyy-MM') === currentMonthKey).reduce((sum, t) => sum + t.amount, 0);
    const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const chartData = React.useMemo(() => {
        const totals: Record<string, number> = {};
        transactions.forEach((t) => {
            if (t.type === 'debit' && format(new Date(t.date), 'yyyy-MM') === currentMonthKey) {
                totals[t.category] = (totals[t.category] || 0) + t.amount;
            }
        });
        return Object.entries(totals).map(([name, amount]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), amount, color: getCategoryColor(name) })).sort((a, b) => b.amount - a.amount).slice(0, 6);
    }, [transactions, currentMonthKey]);

    // 2. Determine the "Top Goal" (We will just use the first goal in the array for now)
    const topGoal = goals.length > 0 ? goals[0] : null;

    // Helper to safely extract amount variables depending on your slice's naming convention
    const safeCurrentAmount = topGoal ? (topGoal.currentAmount || topGoal.savedAmount || 0) : 0;
    const safeTargetAmount = topGoal ? (topGoal.targetAmount || 1) : 1; // Prevent division by zero
    const goalProgressPercentage = Math.min((safeCurrentAmount / safeTargetAmount) * 100, 100);

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <CreateBudgetModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onSave={handleCreateBudget} />
            <EditBudgetModal visible={modalVisible} budget={selectedBudget} onClose={() => setModalVisible(false)} onSave={handleUpdateBudget} />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
                    <View>
                        <Text className="text-2xl font-bold text-text-primary">Financial Vitals 📊</Text>
                        <Text className="text-sm text-text-secondary">{format(new Date(), 'MMMM yyyy')}</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color="#6366F1" />}
                </View>

                {/* Daily/Weekly Spending Pulse Card */}
                <View className="mx-4 mt-3 flex-row justify-between space-x-4">
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

                {/* Summary Card (Monthly) */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-text-secondary">Monthly Budget</Text>
                        <Text className="text-sm font-semibold text-text-primary">{overallPercentage}% used</Text>
                    </View>
                    <View className="flex-row items-baseline mb-2">
                        <Text className="text-3xl font-bold text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>
                            ₹{totalSpent.toLocaleString('en-IN')}
                        </Text>
                        <Text className="text-base text-text-tertiary ml-2" style={{ fontVariant: ['tabular-nums'] }}>
                            / ₹{totalBudget.toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View className="h-3 bg-surface-tertiary rounded-full overflow-hidden">
                        <View
                            className={`h-full rounded-full ${overallPercentage < 80 ? 'bg-profit' : overallPercentage < 100 ? 'bg-alert-amber' : 'bg-alert-critical'}`}
                            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                        />
                    </View>
                </View>

                {/* Upcoming Bills Carousel */}
                <View className="mt-5">
                    <View className="px-4 mb-3 flex-row justify-between items-center">
                        <Text className="text-lg font-semibold text-text-primary">Upcoming Bills</Text>
                        <TouchableOpacity>
                            <Text className="text-brand-primary font-bold text-sm">See All</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {MOCK_BILLS.map((bill) => {
                            const today = new Date();
                            const due = parseISO(bill.dueDate);
                            const daysLeft = differenceInDays(due, today);
                            const isUrgent = daysLeft <= 5;
                            const badgeBg = isUrgent ? 'bg-alert-critical/10' : 'bg-surface-tertiary';
                            const badgeText = isUrgent ? 'text-alert-critical' : 'text-text-secondary';

                            return (
                                <View key={bill.id} className="bg-white border border-border rounded-xl p-4 mr-3 w-36 shadow-sm">
                                    <View className="flex-row justify-between items-start mb-3">
                                        <Text className="text-2xl">{bill.icon}</Text>
                                        <View className={`px-2 py-1 rounded-md ${badgeBg}`}>
                                            <Text className={`text-[10px] font-bold ${badgeText}`}>
                                                {daysLeft === 0 ? 'Today' : daysLeft < 0 ? 'Overdue' : `In ${daysLeft}d`}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-sm font-semibold text-text-secondary truncate" numberOfLines={1}>{bill.name}</Text>
                                    <Text className="text-lg font-bold text-text-primary mt-1" style={{ fontVariant: ['tabular-nums'] }}>
                                        ₹{bill.amount.toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Spending Chart */}
                <View className="mx-4 mt-5 bg-white border border-border rounded-xl p-4">
                    <Text className="text-lg font-semibold text-text-primary mb-3">Category Spending</Text>
                    <SpendingBarChart data={chartData} />
                </View>

                {/* 3. DYNAMIC REDUX Top Goal Progress Widget */}
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
                                    <Text className="text-2xl">{topGoal.icon || '🎯'}</Text>
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
                            
                            {/* Only show target date if your slice stores deadlines */}
                            {topGoal.deadline && (
                                <Text className="text-xs text-text-tertiary mt-2 text-right">
                                    Target Date: {format(parseISO(topGoal.deadline), 'MMM yyyy')}
                                </Text>
                            )}
                        </>
                    ) : (
                        // 4. Empty State if no goals exist
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

                {/* Budget Breakdown */}
                <View className="mx-4 mt-5 bg-white border border-border rounded-xl p-4 mb-8">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-lg font-semibold text-text-primary">Budget Breakdown</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                            <Text className="text-brand-primary font-bold text-sm">Add Budget</Text>
                        </TouchableOpacity>
                        {budgets.length > 0 && (
                            <TouchableOpacity onPress={handleReset} className="ml-4">
                                <Text className="text-alert-critical font-bold text-sm">Reset</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {budgets.length > 0 ? (
                        budgets
                            .filter((budget) => budget.month === currentMonthKey)
                            .map((budget) => {
                                const dynamicSpend = transactions
                                    .filter((t) => t.type === 'debit' && t.category.toLowerCase() === budget.category.toLowerCase() && format(new Date(t.date), 'yyyy-MM') === budget.month)
                                    .reduce((sum, t) => sum + t.amount, 0);

                                const spent = dynamicSpend > 0 ? dynamicSpend : budget.currentSpend;

                                return (
                                    <TouchableOpacity key={budget.category} onPress={() => { setSelectedBudget(budget); setModalVisible(true); }}>
                                        <BudgetBar category={budget.category} icon={getCategoryIcon(budget.category)} spent={spent} limit={budget.monthlyLimit} />
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