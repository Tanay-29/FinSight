import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    Utensils, ShoppingBag, Car, ShoppingCart, Zap, Film,
    TrendingUp, Heart, BookOpen, Home, Package,
    ChevronRight, Leaf, Wallet, CloudOff, Plus, PiggyBank,
} from 'lucide-react-native';
import { goalIcon } from '../theme/icons';
import { summariseNoSpendDays, noSpendMessage } from '../utils/noSpendDays';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBudgets, createBudget, updateBudgetLimit } from '../store/slices/budgetsSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { BudgetBar } from '../components/BudgetBar';
import { BarFill } from '../components/BarFill';
import { EmptyState } from '../components/EmptyState';
import type { Category } from '../utils/categories';
import { CATEGORIES as CATEGORY_OPTIONS, normaliseCategory } from '../utils/categories';
import { COLORS, CATEGORY_COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../theme/tokens';
import { PressableScale } from '../components/PressableScale';
import { resolveMonthlyIncome, savingsRate, savingsRateVerdict } from '../utils/income';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';

// ─── Icon helpers (Lucide) ───────────────────────────────────────

// Keyed on the canonical union only. Legacy spellings never reach this map,
// because normaliseCategory resolves them on the way in.
const CATEGORY_ICON_MAP: Record<Category, React.ComponentType<any>> = {
    dining: Utensils,
    groceries: ShoppingCart,
    transport: Car,
    shopping: ShoppingBag,
    utilities: Zap,
    housing: Home,
    healthcare: Heart,
    education: BookOpen,
    entertainment: Film,
    investments: TrendingUp,
    other: Package,
};

/** The icon for a category, in that category's own colour unless told otherwise. */
const getCategoryIconNode = (category: string, size = 16, color?: string) => {
    const key = normaliseCategory(category);
    const IconComponent = CATEGORY_ICON_MAP[key];
    return <IconComponent size={size} color={color ?? CATEGORY_COLORS[key]} strokeWidth={1.8} />;
};

/**
 * There were three copies of the category colour map in the tree, each with
 * different values and different keys. This one keyed on `health` and `rent`,
 * which normaliseCategory maps away, and had no entry at all for `other`, so
 * anything unrecognised fell through to a grey that failed contrast anyway.
 * CATEGORY_COLORS is the only copy now, and it is typed against the canonical
 * union so a bad key cannot compile.
 */
const getCategoryColor = (category: string) => CATEGORY_COLORS[normaliseCategory(category)];

// ─── Bar Chart ───────────────────────────────────────────────────

/**
 * Category spending, as horizontal bars.
 *
 * This was vertical bars in an SVG whose viewBox was sized to the number of
 * categories while the SVG itself rendered at width 100%. With two categories
 * the whole drawing scaled up to fill the screen and the labels came out
 * enormous; with eight it shrank. The labels were also cut to six characters
 * with no ellipsis, so Entertainment read as "Entert".
 *
 * Horizontal bars fix both. The row height is fixed, so any number of
 * categories looks the same, and a long Indian category name has the full width
 * of the card to sit in.
 */
const SpendingBarChart: React.FC<{
    data: { name: string; amount: number; color: string }[];
    monthLabel: string;
}> = ({ data, monthLabel }) => {
    if (data.length === 0) {
        return (
            <View className="py-6 px-2 items-center">
                <Text className="text-text-secondary text-sm text-center font-inter">
                    Nothing logged in {monthLabel} yet.
                </Text>
                <Text className="text-text-tertiary text-xs text-center mt-1 leading-4 font-inter">
                    This card and the budgets below cover one calendar month, so they
                    start again on the 1st. Earlier spending is still on the Feed.
                </Text>
            </View>
        );
    }

    const maxAmount = Math.max(...data.map((d) => d.amount)) || 1;
    const total = data.reduce((sum, d) => sum + d.amount, 0);

    return (
        <View>
            {data.map((item, i) => {
                const share = Math.round((item.amount / total) * 100);
                return (
                    <View key={item.name} className="mb-3.5">
                        <View className="flex-row items-baseline justify-between mb-1.5">
                            <Text
                                className="text-sm font-inter-medium text-text-primary flex-1 mr-3"
                                numberOfLines={1}
                            >
                                {item.name}
                            </Text>
                            <Text className="text-sm font-inter-bold text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>
                                ₹{item.amount.toLocaleString('en-IN')}
                            </Text>
                            <Text className="text-xs text-text-tertiary ml-2 w-9 text-right font-inter">
                                {share}%
                            </Text>
                        </View>

                        {/* Staggered down the list so the eye reads top to
                            bottom instead of everything arriving at once. */}
                        <BarFill
                            percent={Math.max((item.amount / maxAmount) * 100, 2)}
                            color={item.color}
                            delay={i * 55}
                        />
                    </View>
                );
            })}
        </View>
    );
};

// ─── Edit Budget Modal ────────────────────────────────────────────

const EditBudgetModal: React.FC<{
    visible: boolean;
    budget: any;
    error: string | null;
    onClose: () => void;
    onSave: (limit: number) => void;
}> = ({ visible, budget, error, onClose, onSave }) => {
    const [limit, setLimit] = React.useState('');
    React.useEffect(() => { if (budget) setLimit(budget.monthlyLimit.toString()); }, [budget]);
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                className="flex-1 justify-center items-center bg-black/50"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="bg-surface-primary w-[85%] p-6" style={{ borderRadius: RADIUS.card }}>
                    <Text style={TYPE.heading} className="text-text-primary mb-4">Edit the {budget?.category} budget</Text>
                    <Text className="text-sm text-text-secondary mb-2 font-inter">Monthly limit (₹)</Text>
                    <TextInput
                        className="bg-surface-primary border border-border rounded-control px-4 h-[52px] text-lg text-text-primary mb-6 font-inter"
                        value={limit}
                        onChangeText={setLimit}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                    />
                    {error && (
                        <Text className="text-loss text-sm mb-4 -mt-3 font-inter">{error}</Text>
                    )}

                    <View className="flex-row justify-end gap-3">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2">
                            <Text className="text-text-secondary font-inter-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <PressableScale
                            onPress={() => {
                                const amount = parseFloat(limit);
                                if (!isNaN(amount) && amount > 0) onSave(amount);
                            }}
                            accessibilityRole="button"
                            className="bg-brand-primary-dark px-6 py-2.5 rounded-control"
                        >
                            <Text className="text-white font-inter-semibold">Save</Text>
                        </PressableScale>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Create Budget Modal ──────────────────────────────────────────

const CreateBudgetModal: React.FC<{
    visible: boolean;
    error: string | null;
    /** Categories that already have a budget this month. */
    taken: string[];
    onClose: () => void;
    onSave: (categoryId: string, limit: number) => void;
}> = ({ visible, error, taken, onClose, onSave }) => {
    // Same list the transaction picker uses, so a budget can always match the
    // category a transaction was filed under, minus the ones already budgeted.
    const CATEGORIES = CATEGORY_OPTIONS
        .filter((c) => !taken.includes(c.key))
        .map((c) => ({ id: c.key, name: c.label }));
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('dining');
    const [limit, setLimit] = React.useState('');
    React.useEffect(() => {
        if (visible) { setSelectedCategoryId(CATEGORIES[0]?.id ?? ''); setLimit(''); }
        // CATEGORIES is derived from props and stable while the dialog is open.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                className="flex-1 justify-center items-center bg-black/50"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View className="bg-surface-primary w-[85%] p-6" style={{ borderRadius: RADIUS.card }}>
                    <Text style={TYPE.heading} className="text-text-primary mb-4">New budget</Text>
                    <Text className="text-sm text-text-secondary mb-2 font-inter">Category</Text>
                    {CATEGORIES.length === 0 && (
                        <Text className="text-sm text-text-tertiary mb-4 leading-5 font-inter">
                            Every category already has a budget this month. Tap one in the
                            list to change its limit.
                        </Text>
                    )}
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`px-3 py-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-brand-primary border-brand-primary' : 'bg-surface-primary border-border'}`}
                                onPress={() => setSelectedCategoryId(cat.id)}
                            >
                                <Text className={selectedCategoryId === cat.id ? 'text-white' : 'text-text-primary'}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-sm text-text-secondary mb-2 font-inter">Monthly limit (₹)</Text>
                    <TextInput
                        className="bg-surface-primary border border-border rounded-control px-4 h-[52px] text-lg text-text-primary mb-6 font-inter"
                        value={limit}
                        onChangeText={setLimit}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                    />
                    {error && (
                        <Text className="text-loss text-sm mb-4 -mt-3 font-inter">{error}</Text>
                    )}

                    <View className="flex-row justify-end gap-3">
                        <TouchableOpacity onPress={onClose} className="px-4 py-2">
                            <Text className="text-text-secondary font-inter-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <PressableScale
                            onPress={() => {
                                const amount = parseFloat(limit);
                                if (selectedCategoryId && !isNaN(amount) && amount > 0) onSave(selectedCategoryId, amount);
                            }}
                            accessibilityRole="button"
                            className="bg-brand-primary-dark px-6 py-2.5 rounded-control"
                        >
                            <Text className="text-white font-inter-semibold">Save</Text>
                        </PressableScale>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────

export const VitalsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();

    const {
        items: budgets,
        loading: budgetsLoading,
        error: budgetsError,
    } = useAppSelector((state) => state.budgets);
    const transactions = useAppSelector((state) => state.transactions.items);
    const transactionsLoaded = useAppSelector((state) => state.transactions.loaded);
    const transactionsError = useAppSelector((state) => state.transactions.error);

    // Every figure on this screen is derived from logged spending, so with none
    // of it there is nothing here but noughts.
    const hasNothingLogged = transactionsLoaded && !transactionsError && transactions.length === 0;
    const goals = useAppSelector((state: any) => state.goals?.items || []);

    // Days nothing went out. Counted as wins; see utils/noSpendDays.
    const noSpend = React.useMemo(() => summariseNoSpendDays(transactions), [transactions]);
    const { user, profile } = useAppSelector((state) => state.auth);
    const userInitial = user?.displayName?.charAt(0).toUpperCase() || 'U';

    const currentMonthKey = format(new Date(), 'yyyy-MM');

    // The one number that needs both sides of the ledger, and the reason
    // logging income is worth doing at all.
    const income = React.useMemo(
        () => resolveMonthlyIncome(transactions as any, profile?.incomeRange, currentMonthKey),
        [transactions, profile?.incomeRange, currentMonthKey]
    );
    const [selectedBudget, setSelectedBudget] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [createModalVisible, setCreateModalVisible] = React.useState(false);

    useEffect(() => {
        dispatch(fetchBudgets());
        dispatch(fetchTransactions());
    }, [dispatch]);

    const recentSpending = React.useMemo(() => {
        let spentToday = 0;
        let spentThisWeek = 0;
        transactions.forEach((t) => {
            if (t.type === 'debit') {
                const txDate = parseISO(t.date);
                if (isToday(txDate)) spentToday += t.amount;
                if (isThisWeek(txDate, { weekStartsOn: 1 })) spentThisWeek += t.amount;
            }
        });
        return { spentToday, spentThisWeek };
    }, [transactions]);

    const monthBudgets = React.useMemo(
        () => budgets.filter((b) => b.month === currentMonthKey),
        [budgets, currentMonthKey]
    );
    const totalBudget = monthBudgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
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
        // Only close on success. Closing regardless is what made a failed
        // save look like a button that did nothing.
        const result = await dispatch(
            createBudget({ category, monthlyLimit: limit, currentSpend: initialSpend, month: currentMonthKey })
        );
        if (createBudget.fulfilled.match(result)) setCreateModalVisible(false);
    };

    const handleUpdateBudget = async (limit: number) => {
        if (selectedBudget?.id) {
            const result = await dispatch(updateBudgetLimit({ id: selectedBudget.id, limit }));
            if (updateBudgetLimit.fulfilled.match(result)) {
                setModalVisible(false);
                setSelectedBudget(null);
            }
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <CreateBudgetModal
                taken={monthBudgets.map((b) => normaliseCategory(b.category))}
                error={createModalVisible ? budgetsError : null}
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onSave={handleCreateBudget}
            />
            <EditBudgetModal
                error={modalVisible ? budgetsError : null}
                visible={modalVisible}
                budget={selectedBudget}
                onClose={() => setModalVisible(false)}
                onSave={handleUpdateBudget}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
                <View className="pt-4 pb-2 flex-row justify-between items-center" style={{ paddingHorizontal: GUTTER }}>
                    <View>
                        <Text style={TYPE.title} className="text-text-primary">Financial vitals</Text>
                        <Text style={TYPE.caption} className="text-text-tertiary mt-0.5">{format(new Date(), 'MMMM yyyy')}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        {budgetsLoading && <ActivityIndicator size="small" color={COLORS.brand.primary} />}
                        <PressableScale
                            onPress={() => navigation.navigate('Profile' as never)}
                            activeScale={0.92}
                            accessibilityRole="button"
                            accessibilityLabel="Your profile"
                            className="w-10 h-10 rounded-full bg-brand-primary-dark items-center justify-center"
                        >
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-white">{userInitial}</Text>
                        </PressableScale>
                    </View>
                </View>

                {budgetsError && (
                    <View className="mt-2 flex-row items-start bg-alert-bg border border-border rounded-control px-3.5 py-3" style={{ marginHorizontal: GUTTER }}>
                        <CloudOff size={15} color={COLORS.semantic.alertAmber} strokeWidth={1.8} style={{ marginTop: 1 }} />
                        <Text style={TYPE.caption} className="text-text-secondary ml-2.5 flex-1">
                            {budgetsError}
                        </Text>
                    </View>
                )}

                {hasNothingLogged ? (
                    <EmptyState
                        icon={<Wallet color={COLORS.brand.primary} size={36} />}
                        title="Nothing to show yet"
                        body="Every number on this screen comes from what you have spent. Log an expense and your burn rate, categories and budgets start filling in."
                        actionLabel="Add an expense"
                        onAction={() => navigation.navigate('AddTransaction' as never)}
                        hint="Paste a bank SMS and the amount, merchant and category are read for you."
                    />
                ) : (
                  <>
                {/* No-spend days. Deliberately the first thing on the screen:
                    it is the one panel that has something good to say on a day
                    with no money in it. */}
                <View className="mx-5 mt-3 bg-surface-primary rounded-2xl border border-border p-4">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-profit-bg items-center justify-center mr-3">
                            <Leaf color={COLORS.semantic.profit} size={18} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-inter-bold text-text-primary">
                                {noSpend.thisMonth} clear day{noSpend.thisMonth === 1 ? '' : 's'} this month
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                                {noSpendMessage(noSpend)}
                            </Text>
                        </View>
                        {noSpend.currentRun > 0 && (
                            <View className="bg-profit-bg rounded-full px-3 py-1.5 ml-2">
                                <Text className="text-xs font-inter-bold text-profit">
                                    {noSpend.currentRun} in a row
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Savings rate.
                    Money left in the account counts as saved. Counting only
                    investment debits told a student who spent four of their
                    ten thousand that they had saved nothing. */}
                <View className="mx-5 mt-3 bg-surface-primary rounded-2xl border border-border p-4">
                    <View className="flex-row items-center mb-2">
                        <View className="w-10 h-10 rounded-full bg-brand-soft items-center justify-center mr-3">
                            <PiggyBank color={COLORS.brand.primary} size={18} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-inter-bold text-text-primary">
                                Kept this month
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                                {income.source === 'unknown'
                                    ? 'Log what came in and this fills itself'
                                    : income.source === 'estimated'
                                        ? 'Estimated from your profile until you log income'
                                        : `of ₹${income.amount.toLocaleString('en-IN')} that came in`}
                            </Text>
                        </View>
                        {(() => {
                            const rate = savingsRate(income.amount, totalSpent);
                            if (rate === null) return null;
                            const verdict = savingsRateVerdict(rate);
                            return (
                                <Text
                                    className={`text-2xl font-inter-bold ${
                                        verdict.tone === 'good'
                                            ? 'text-profit'
                                            : verdict.tone === 'ok'
                                                ? 'text-alert-amber'
                                                : 'text-loss'
                                    }`}
                                    style={{ fontVariant: ['tabular-nums'] }}
                                >
                                    {Math.round(rate)}%
                                </Text>
                            );
                        })()}
                    </View>

                    {(() => {
                        const rate = savingsRate(income.amount, totalSpent);
                        if (rate === null) {
                            return (
                                <PressableScale
                                    onPress={() => navigation.navigate('AddTransaction' as never)}
                                    accessibilityRole="button"
                                    className="bg-surface-secondary rounded-xl py-2.5 items-center mt-1"
                                >
                                    <Text className="text-sm font-inter-semibold text-brand-primary">
                                        Add income
                                    </Text>
                                </PressableScale>
                            );
                        }
                        const verdict = savingsRateVerdict(rate);
                        return (
                            <>
                                <BarFill
                                    percent={Math.max(Math.min(rate, 100), 0)}
                                    height={8}
                                    fillClassName={
                                        verdict.tone === 'good'
                                            ? 'bg-profit'
                                            : verdict.tone === 'ok'
                                                ? 'bg-alert-amber'
                                                : 'bg-alert-critical'
                                    }
                                />
                                <Text className="text-xs text-text-secondary mt-2 font-inter">
                                    {verdict.label}. Twenty percent is the figure the 50/30/20 rule
                                    asks for.
                                </Text>
                            </>
                        );
                    })()}
                </View>

                {/* Recent spending.
                    These were two coloured tiles side by side, wrapped in one
                    button, so they looked like two destinations and were one.
                    They are two readings of the same thing, so they sit in one
                    card with a single way through to the pace screen. */}
                <PressableScale
                    className="mx-5 mt-3 bg-surface-primary border border-border rounded-2xl p-4"
                    onPress={() => navigation.navigate('BurnRate' as never)}
                    accessibilityRole="button"
                    accessibilityLabel="Recent spending. Open your spending pace."
                >
                    <View className="flex-row">
                        <View className="flex-1">
                            <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider mb-1">
                                Today
                            </Text>
                            <Text className="text-2xl font-inter-bold text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>
                                ₹{recentSpending.spentToday.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View className="w-px bg-border mx-5" />
                        <View className="flex-1">
                            <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider mb-1">
                                This week
                            </Text>
                            <Text className="text-2xl font-inter-bold text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>
                                ₹{recentSpending.spentThisWeek.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-end mt-3 pt-3 border-t border-border">
                        <Text className="text-xs font-inter-semibold text-brand-primary mr-1">
                            Where the month is heading
                        </Text>
                        <ChevronRight size={14} color={COLORS.brand.primary} />
                    </View>
                </PressableScale>

                {/* Monthly Budget Summary, and the 50/30/20 view of the same
                    money. */}
                <TouchableOpacity
                    className="mx-5 mt-4 bg-surface-primary border border-border rounded-xl p-4"
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('MoneyManager' as never)}
                    accessibilityRole="button"
                    accessibilityLabel="Monthly budget. Open the 50/30/20 breakdown."
                >
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-text-secondary font-inter">Monthly budget</Text>
                        <Text className="text-sm font-inter-semibold text-text-primary">{overallPercentage}% used</Text>
                    </View>
                    <View className="flex-row items-baseline mb-2">
                        <Text className="text-3xl font-inter-bold text-text-primary">₹{totalSpent.toLocaleString('en-IN')}</Text>
                        <Text className="text-base text-text-tertiary ml-2 font-inter">/ ₹{totalBudget.toLocaleString('en-IN')}</Text>
                    </View>
                    <BarFill
                        percent={Math.min(overallPercentage, 100)}
                        height={12}
                        fillClassName={overallPercentage < 80 ? 'bg-profit' : overallPercentage < 100 ? 'bg-alert-amber' : 'bg-alert-critical'}
                    />
                    <View className="flex-row items-center justify-end mt-3">
                        <Text className="text-xs font-inter-semibold text-brand-primary mr-1">50/30/20 breakdown</Text>
                        <ChevronRight size={14} color={COLORS.brand.primary} />
                    </View>
                </TouchableOpacity>

                {/* Category Spending, and the recurring charges hiding inside
                    those categories. */}
                <View className="mx-5 mt-5 bg-surface-primary border border-border rounded-xl p-4">
                    <Text className="text-lg font-inter-semibold text-text-primary mb-3">Category spending</Text>
                    <SpendingBarChart data={chartData} monthLabel={format(new Date(), 'MMMM')} />
                    <TouchableOpacity
                        className="flex-row items-center justify-between mt-4 pt-3 border-t border-border"
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SubscriptionTracker' as never)}
                        accessibilityRole="button"
                    >
                        <View className="flex-1 mr-3">
                            <Text className="text-sm font-inter-semibold text-text-primary">Find recurring charges</Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                                Subscriptions and bills hiding in these categories
                            </Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                </View>

                {/* The top goal, and nothing at all when there is not one. A
                    card whose entire content is a link to another tab is an
                    advert, not a panel. */}
                {topGoal && (
                <View className="mx-5 mt-5 bg-surface-primary border border-border rounded-xl p-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text style={TYPE.heading} className="text-text-primary">Your top goal</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Goals' as never)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text className="text-brand-primary font-inter-bold text-sm">All goals</Text>
                        </TouchableOpacity>
                    </View>

                            <View className="flex-row items-center mb-3">
                                <View className="w-12 h-12 bg-brand-soft rounded-full items-center justify-center mr-3">
                                    {React.createElement(goalIcon(topGoal.icon), { size: 22, color: COLORS.brand.primary })}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-inter-bold text-text-primary">{topGoal.name || topGoal.title}</Text>
                                    <Text className="text-xs text-text-secondary mt-1 font-inter">
                                        ₹{safeCurrentAmount.toLocaleString('en-IN')} / ₹{safeTargetAmount.toLocaleString('en-IN')}
                                    </Text>
                                </View>
                                <Text className="text-lg font-inter-bold text-brand-primary">
                                    {Math.round(goalProgressPercentage)}%
                                </Text>
                            </View>

                            <BarFill percent={goalProgressPercentage} height={10} fillClassName="bg-brand-primary" />

                            {topGoal.deadline && (
                                <Text className="text-xs text-text-tertiary mt-2 text-right font-inter">
                                    Target {format(parseISO(topGoal.deadline), 'MMM yyyy')}
                                </Text>
                            )}
                </View>
                )}

                {/* Budget Breakdown */}
                <View className="mx-5 mt-5 bg-surface-primary border border-border rounded-xl p-4 mb-8">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text style={TYPE.heading} className="text-text-primary">Budgets</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                            <Text className="text-brand-primary font-inter-bold text-sm">Add budget</Text>
                        </TouchableOpacity>
                    </View>

                    {monthBudgets.length > 0 ? (
                        monthBudgets
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
                                        key={budget.id ?? budget.category}
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
                        <Text className="text-text-secondary text-center py-4">
                            No budgets set for this month yet.
                        </Text>
                    )}
                </View>

                  </>
                )}
            </ScrollView>

            <PressableScale
                className="absolute bottom-6 right-6 bg-brand-primary-dark w-14 h-14 rounded-full items-center justify-center shadow-lg"
                onPress={() => navigation.navigate('AddTransaction' as never)}
                activeScale={0.92}
                accessibilityRole="button"
                accessibilityLabel="Add a transaction"
            >
                <Plus color="white" size={24} />
            </PressableScale>
        </SafeAreaView>
    );
};