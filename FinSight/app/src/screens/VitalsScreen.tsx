import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBudgets, createBudget, updateBudgetLimit } from '../store/slices/budgetsSlice';
import { clearUserData } from '../services/firestoreService';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { BudgetBar } from '../components/BudgetBar';
import { format } from 'date-fns';

// Spending Bar Chart Component
const SpendingBarChart: React.FC<{
    data: { name: string; amount: number; color: string }[];
}> = ({ data }) => {
    const maxAmount = Math.max(...data.map((d) => d.amount));
    const barWidth = 36;
    const chartHeight = 150;
    const gap = 12;
    const totalWidth = data.length * (barWidth + gap);

    return (
        <Svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${totalWidth} ${chartHeight + 30}`}>
            {data.map((item, index) => {
                const barHeight = (item.amount / maxAmount) * (chartHeight - 20) || 5; // Min height 5
                const x = index * (barWidth + gap) + gap / 2;
                const y = chartHeight - barHeight;

                return (
                    <React.Fragment key={item.name}>
                        <Rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx={6}
                            fill={item.color}
                        />
                        <SvgText
                            x={x + barWidth / 2}
                            y={y - 6}
                            textAnchor="middle"
                            fontSize={11}
                            fill="#111827"
                        >
                            ₹{item.amount.toLocaleString('en-IN')}
                        </SvgText>
                        <SvgText
                            x={x + barWidth / 2}
                            y={chartHeight + 16}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#9CA3AF"
                        >
                            {item.name.substring(0, 4)}
                        </SvgText>
                    </React.Fragment>
                );
            })}
        </Svg>
    );
};

// Helper for icons and colors
const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
        dining: '#F97316', shopping: '#EC4899', transport: '#3B82F6', groceries: '#10B981',
        utilities: '#EAB308', entertainment: '#8B5CF6', investments: '#6366F1', health: '#EF4444',
        education: '#14B8A6', housing: '#F59E0B'
    };
    return map[category.toLowerCase()] || '#9CA3AF';
};

const getCategoryIcon = (category: string) => {
    // console.log(`[VitalsScreen] Resolving icon for: ${category} -> ${category.toLowerCase()}`);
    const map: Record<string, string> = {
        dining: '🍽️', shopping: '🛍️', transport: '🚗', groceries: '🛒',
        utilities: '⚡', entertainment: '🎬', investments: '📈', health: '💊',
        education: '📚', housing: '🏠'
    };
    const icon = map[category.toLowerCase()] || '💰';
    // console.log(`[VitalsScreen] Icon resolved: ${icon}`);
    return icon;
};

// Edit Budget Modal Component
const EditBudgetModal: React.FC<{
    visible: boolean;
    budget: any;
    onClose: () => void;
    onSave: (limit: number) => void;
}> = ({ visible, budget, onClose, onSave }) => {
    const [limit, setLimit] = React.useState('');

    React.useEffect(() => {
        if (budget) {
            setLimit(budget.monthlyLimit.toString());
        }
    }, [budget]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[85%] rounded-2xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-4">
                        Edit {budget?.category} Budget
                    </Text>

                    <Text className="text-sm text-text-secondary mb-2">Monthly Limit (₹)</Text>
                    <TextInput
                        className="bg-surface-tertiary p-3 rounded-lg text-lg text-text-primary mb-6"
                        value={limit}
                        onChangeText={setLimit}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                    />

                    <View className="flex-row justify-end space-x-4">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2">
                            <Text className="text-text-secondary font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const amount = parseFloat(limit);
                                if (!isNaN(amount) && amount > 0) {
                                    onSave(amount);
                                }
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

// Create Budget Modal Component
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
        { id: 'other', name: 'Other' },
    ];

    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('dining');
    const [limit, setLimit] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setSelectedCategoryId('dining');
            setLimit('');
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[85%] rounded-2xl p-6">
                    <Text className="text-xl font-bold text-text-primary mb-4">
                        Add New Budget
                    </Text>

                    <Text className="text-sm text-text-secondary mb-2">Category</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`px-3 py-2 rounded-full border ${
                                    selectedCategoryId === cat.id
                                        ? 'bg-brand-primary border-brand-primary'
                                        : 'bg-white border-border'
                                }`}
                                onPress={() => setSelectedCategoryId(cat.id)}
                            >
                                <Text
                                    className={
                                        selectedCategoryId === cat.id
                                            ? 'text-white'
                                            : 'text-text-primary'
                                    }
                                >
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

                    <View className="flex-row justify-end space-x-4">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2">
                            <Text className="text-text-secondary font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                const amount = parseFloat(limit);
                                if (selectedCategoryId && !isNaN(amount) && amount > 0) {
                                    onSave(selectedCategoryId, amount);
                                }
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

export const VitalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const { items: budgets, loading: budgetsLoading } = useAppSelector((state) => state.budgets);
    const transactions = useAppSelector((state) => state.transactions.items);
    const loading = budgetsLoading;
    const currentMonthKey = format(new Date(), 'yyyy-MM');

    // Edit Budget State
    const [selectedBudget, setSelectedBudget] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [createModalVisible, setCreateModalVisible] = React.useState(false);

    useEffect(() => {
        dispatch(fetchBudgets());
        dispatch(fetchTransactions());
    }, [dispatch]);

    const handleCreateBudget = async (category: string, limit: number) => {
        // Pre-fill currentSpend based on existing debit transactions for this category & month
        const initialSpend = transactions
            .filter(
                (t) =>
                    t.type === 'debit' &&
                    t.category.toLowerCase() === category.toLowerCase() &&
                    format(new Date(t.date), 'yyyy-MM') === currentMonthKey
            )
            .reduce((sum, t) => sum + t.amount, 0);

        await dispatch(
            createBudget({
                category,
                monthlyLimit: limit,
                currentSpend: initialSpend,
                month: currentMonthKey,
            })
        );
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

    const totalBudget = budgets
        .filter((b) => b.month === currentMonthKey)
        .reduce((sum, b) => sum + b.monthlyLimit, 0);

    // Calculate total spent from transactions
    const totalSpent = transactions
        .filter(
            (t) =>
                t.type === 'debit' &&
                format(new Date(t.date), 'yyyy-MM') === currentMonthKey
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Calculate Chart Data
    const chartData = React.useMemo(() => {
        const totals: Record<string, number> = {};
        transactions.forEach((t) => {
            if (
                t.type === 'debit' &&
                format(new Date(t.date), 'yyyy-MM') === currentMonthKey
            ) {
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

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
                    <View>
                        <Text className="text-2xl font-bold text-text-primary">Financial Vitals 📊</Text>
                        <Text className="text-sm text-text-secondary">{format(new Date(), 'MMMM yyyy')}</Text>
                    </View>
                    {loading && <ActivityIndicator size="small" color="#6366F1" />}
                </View>

                {/* Summary Card */}
                <View className="mx-4 mt-3 bg-white border border-border rounded-xl p-4">
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
                            className={`h-full rounded-full ${overallPercentage < 80
                                ? 'bg-profit'
                                : overallPercentage < 100
                                    ? 'bg-alert-amber'
                                    : 'bg-alert-critical'
                                }`}
                            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                        />
                    </View>
                </View>

                {/* Spending Chart */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <Text className="text-lg font-semibold text-text-primary mb-3">
                        Category Spending
                    </Text>
                    <SpendingBarChart data={chartData} />
                </View>

                {/* Budget Breakdown */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4 mb-6">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-lg font-semibold text-text-primary">
                            Budget Breakdown
                        </Text>




                        <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                            <Text className="text-brand-primary font-bold text-sm">Add Budget</Text>
                        </TouchableOpacity>
                        {budgets.length > 0 && (
                            <TouchableOpacity onPress={handleReset} className="ml-4">
                                <Text className="text-alert-critical font-bold text-sm">Reset Data</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {budgets.length > 0 ? (
                        budgets
                            .filter((budget) => budget.month === currentMonthKey)
                            .map((budget) => {
                                const dynamicSpend = transactions
                                    .filter(
                                        (t) =>
                                            t.type === 'debit' &&
                                            t.category.toLowerCase() ===
                                                budget.category.toLowerCase() &&
                                            format(
                                                new Date(t.date),
                                                'yyyy-MM'
                                            ) === budget.month
                                    )
                                    .reduce((sum, t) => sum + t.amount, 0);

                                const spent = dynamicSpend > 0 ? dynamicSpend : budget.currentSpend;

                                return (
                            <TouchableOpacity
                                key={budget.category}
                                onPress={() => {
                                    setSelectedBudget(budget);
                                    setModalVisible(true);
                                }}
                            >
                                <BudgetBar
                                    category={budget.category}
                                    icon={getCategoryIcon(budget.category)}
                                    spent={spent}
                                    limit={budget.monthlyLimit}
                                />
                            </TouchableOpacity>
                                );
                            })
                    ) : (
                        <Text className="text-text-secondary text-center py-4">
                            No budgets set for this month.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
