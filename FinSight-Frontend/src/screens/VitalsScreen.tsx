import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    Utensils, ShoppingBag, Car, ShoppingCart, Zap, Film,
    TrendingUp, Heart, BookOpen, Home, Package,
    ChevronRight, Leaf, Wallet, CloudOff, Plus, PiggyBank, Calculator,
} from 'lucide-react-native';
import { summariseNoSpendDays } from '../utils/noSpendDays';
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
import { summariseSpending } from '../utils/spendSummary';
import { detectRecurring } from '../utils/recurring';
import { merchantKey } from '../utils/merchantRules';
import { affordBeforePayday } from '../utils/afford';
import { FinancialVitals } from '../components/FinancialVitals';
import { TransactionRow } from '../components/TransactionRow';
import FinSightIQCard from '../components/FinSightIQCard';
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
                    This card and the budgets cover one calendar month, so they
                    start again on the 1st. The 30-day summary at the top still has it.
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
                            />
                    </View>
                );
            })}
        </View>
    );
};

/** One reading in the at-a-glance strip. Tappable when it leads somewhere. */
const Glance: React.FC<{
    icon: React.ReactNode;
    value: string;
    label: string;
    valueColor?: string;
    onPress?: () => void;
}> = ({ icon, value, label, valueColor, onPress }) => (
    <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole={onPress ? 'button' : undefined}
        className="flex-1 px-3 py-3.5"
    >
        {icon}
        <Text
            className="text-xl font-inter-bold mt-1.5"
            style={{ color: valueColor ?? COLORS.text.primary, fontVariant: ['tabular-nums'] }}
            numberOfLines={1}
            adjustsFontSizeToFit
        >
            {value}
        </Text>
        <Text className="text-xs text-text-secondary mt-0.5 font-inter" numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
);

/**
 * "Can I afford it before payday?" The month is projected forward at the pace
 * spent so far, the price is taken off what that leaves, and the answer is
 * one of three words with the arithmetic underneath. Payday is the 1st of
 * next month, which is when allowance and most salaries land; it says so.
 */
const AffordSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    income: number;
    incomeSource: 'logged' | 'estimated' | 'unknown';
    spent: number;
    onAddIncome: () => void;
}> = ({ visible, onClose, income, incomeSource, spent, onAddIncome }) => {
    const insets = useSafeAreaInsets();
    const [price, setPrice] = React.useState('');
    const amount = Number(price.replace(/[₹,\s]/g, ''));
    const result = Number.isFinite(amount) && amount > 0 && income > 0
        ? affordBeforePayday({ income, spent, price: amount })
        : null;
    const tone = result?.verdict === 'yes' ? COLORS.semantic.profit : result?.verdict === 'tight' ? COLORS.semantic.alertAmber : COLORS.semantic.loss;
    const close = () => { setPrice(''); onClose(); };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
                <View style={{ backgroundColor: COLORS.surface.primary, borderTopLeftRadius: RADIUS.pill, borderTopRightRadius: RADIUS.pill, padding: GUTTER, paddingBottom: insets.bottom + 20 }}>
                    <View className="flex-row items-center justify-between mb-1">
                        <Text style={TYPE.heading} className="text-text-primary">Can I afford it?</Text>
                        <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
                            <Text className="text-brand-link font-inter-semibold">Close</Text>
                        </TouchableOpacity>
                    </View>
                    {income <= 0 ? (
                        <>
                            <Text style={TYPE.body} className="text-text-secondary mt-2">
                                This needs to know what came in this month. Log your allowance, stipend or salary as income first.
                            </Text>
                            <PressableScale onPress={onAddIncome} accessibilityRole="button" containerStyle={{ marginTop: 16 }} style={{ height: 50, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand.primaryDark, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]}>Add income</Text>
                            </PressableScale>
                        </>
                    ) : (
                        <>
                            <Text style={TYPE.caption} className="text-text-secondary mb-4">
                                {incomeSource === 'estimated'
                                    ? 'Using the income range from your profile until you log real income.'
                                    : 'Using the income you logged this month.'} Payday is taken as the 1st.
                            </Text>
                            <TextInput
                                className="bg-surface-secondary rounded-control px-4 h-[56px] text-2xl text-text-primary font-inter-bold"
                                style={{ borderWidth: 1, borderColor: COLORS.border.default }}
                                placeholder="₹ price"
                                placeholderTextColor={COLORS.text.tertiary}
                                keyboardType="decimal-pad"
                                value={price}
                                onChangeText={setPrice}
                                autoFocus
                            />
                            {result && (
                                <View style={{ marginTop: 16 }}>
                                    <Text style={[TYPE.title, { color: tone }]}>
                                        {result.verdict === 'yes' ? 'Yes, comfortably' : result.verdict === 'tight' ? 'Yes, but it is tight' : 'Not before payday'}
                                    </Text>
                                    {[
                                        ['Came in this month', income],
                                        ['Spent so far', -spent],
                                        [`Likely in the next ${result.daysLeft} days, at your pace`, -result.projectedRest],
                                        ['This purchase', -amount],
                                    ].map(([label, value]) => (
                                        <View key={label as string} className="flex-row justify-between mt-2">
                                            <Text style={TYPE.caption} className="text-text-secondary flex-1 mr-3">{label}</Text>
                                            <Text style={[TYPE.amountSm, { color: COLORS.text.primary }]}>
                                                {(value as number) < 0 ? '-' : ''}₹{Math.round(Math.abs(value as number)).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    ))}
                                    <View className="flex-row justify-between mt-3 pt-3 border-t border-border">
                                        <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">Left on the 1st</Text>
                                        <Text style={[TYPE.amountSm, { color: tone }]}>
                                            {result.leftAfter < 0 ? '-' : ''}₹{Math.round(Math.abs(result.leftAfter)).toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
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

    // Days nothing went out. Counted as wins; see utils/noSpendDays.
    const noSpend = React.useMemo(() => summariseNoSpendDays(transactions), [transactions]);
    const { user, profile } = useAppSelector((state) => state.auth);
    const userInitial = (user?.displayName || profile?.name)?.charAt(0).toUpperCase() || 'U';

    const currentMonthKey = format(new Date(), 'yyyy-MM');

    // The one number that needs both sides of the ledger, and the reason
    // logging income is worth doing at all.
    const income = React.useMemo(
        () => resolveMonthlyIncome(transactions as any, profile?.incomeRange, currentMonthKey),
        [transactions, profile?.incomeRange, currentMonthKey]
    );
    const [affordOpen, setAffordOpen] = React.useState(false);
    // Subscriptions whose latest charge went up, for the line on the
    // recurring-charges link. Same detection as the tracker screen.
    const risenCount = React.useMemo(
        () => detectRecurring(transactions, merchantKey).filter((c) => c.priceRise).length,
        [transactions]
    );
    const [selectedBudget, setSelectedBudget] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);
    const [createModalVisible, setCreateModalVisible] = React.useState(false);

    useEffect(() => {
        dispatch(fetchBudgets());
        dispatch(fetchTransactions());
    }, [dispatch]);

    // The 30-day summary and the latest entries, which used to be the home
    // tab. Home is Today now, so everything about money lives here.
    const spend = React.useMemo(() => summariseSpending(transactions), [transactions]);
    const latest = React.useMemo(
        () => [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5),
        [transactions]
    );

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
            <AffordSheet
                visible={affordOpen}
                onClose={() => setAffordOpen(false)}
                income={income.amount}
                incomeSource={income.source}
                spent={totalSpent}
                onAddIncome={() => { setAffordOpen(false); navigation.navigate('AddTransaction' as never); }}
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
                        <Text style={TYPE.title} className="text-text-primary">Money</Text>
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
                <View className="mt-3">
                    <FinancialVitals
                        totalSpent={spend.totalSpent}
                        dailyTrend={spend.dailyTrend}
                        comparison={spend.comparison}
                    />
                </View>

                {/* This month at a glance: three readings that used to be
                    three cards. Each says one number and what it means. */}
                <View className="mx-5 mt-3 bg-surface-primary border border-border rounded-2xl flex-row">
                    <Glance
                        icon={<Leaf color={COLORS.semantic.profit} size={16} />}
                        value={String(noSpend.thisMonth)}
                        label={noSpend.currentRun > 1 ? `clear days, ${noSpend.currentRun} in a row` : 'clear days this month'}
                    />
                    <View className="w-px bg-border my-3" />
                    {(() => {
                        const rate = savingsRate(income.amount, totalSpent);
                        if (rate === null) {
                            return (
                                <Glance
                                    icon={<PiggyBank color={COLORS.brand.primary} size={16} />}
                                    value="Add"
                                    label="income, to see what you kept"
                                    onPress={() => navigation.navigate('AddTransaction' as never)}
                                />
                            );
                        }
                        const tone = savingsRateVerdict(rate).tone;
                        return (
                            <Glance
                                icon={<PiggyBank color={COLORS.brand.primary} size={16} />}
                                value={`${Math.round(rate)}%`}
                                valueColor={tone === 'good' ? COLORS.semantic.profit : tone === 'ok' ? COLORS.semantic.alertAmber : COLORS.semantic.loss}
                                label={income.source === 'estimated' ? 'kept, estimated' : 'kept this month'}
                            />
                        );
                    })()}
                    <View className="w-px bg-border my-3" />
                    <Glance
                        icon={<ChevronRight color={COLORS.text.tertiary} size={16} />}
                        value={`₹${recentSpending.spentThisWeek.toLocaleString('en-IN')}`}
                        label="this week, see the pace"
                        onPress={() => navigation.navigate('BurnRate' as never)}
                    />
                </View>

                <PressableScale
                    onPress={() => setAffordOpen(true)}
                    accessibilityRole="button"
                    containerStyle={{ marginHorizontal: GUTTER, marginTop: 10 }}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.brand.soft, borderWidth: 1, borderColor: COLORS.brand.edge }}
                >
                    <Calculator size={18} color={COLORS.brand.link} />
                    <View className="flex-1 ml-3">
                        <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">Can I afford it before payday?</Text>
                        <Text style={TYPE.caption} className="text-text-secondary">Type a price, see what is left on the 1st</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.brand.link} />
                </PressableScale>

                {/* Budgets: the month's total against the limit, then each
                    category. These were two cards about the same money. */}
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-2xl p-4">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text style={TYPE.heading} className="text-text-primary">Budgets</Text>
                        <TouchableOpacity onPress={() => setCreateModalVisible(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
                            <Text className="text-brand-link font-inter-semibold text-sm">Add budget</Text>
                        </TouchableOpacity>
                    </View>

                    {totalBudget > 0 ? (
                        <View className="mb-4">
                            <View className="flex-row items-baseline justify-between mb-2">
                                <View className="flex-row items-baseline">
                                    <Text className="text-2xl font-inter-bold text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>₹{totalSpent.toLocaleString('en-IN')}</Text>
                                    <Text className="text-sm text-text-tertiary ml-1.5 font-inter">of ₹{totalBudget.toLocaleString('en-IN')}</Text>
                                </View>
                                <Text className="text-sm font-inter-semibold text-text-secondary">{overallPercentage}%</Text>
                            </View>
                            <BarFill
                                percent={Math.min(overallPercentage, 100)}
                                height={10}
                                fillClassName={overallPercentage < 80 ? 'bg-profit' : overallPercentage < 100 ? 'bg-alert-amber' : 'bg-alert-critical'}
                            />
                        </View>
                    ) : (
                        <Text className="text-sm text-text-secondary font-inter mb-2">
                            ₹{totalSpent.toLocaleString('en-IN')} spent this month and no budget yet. Set one and it becomes a number you can check against.
                        </Text>
                    )}

                    {monthBudgets.map((budget) => {
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
                    })}

                    <TouchableOpacity
                        className="flex-row items-center justify-between pt-3 border-t border-border"
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('MoneyManager' as never)}
                        accessibilityRole="button"
                    >
                        <Text className="text-sm font-inter-semibold text-text-primary">Needs, wants and savings (50/30/20)</Text>
                        <ChevronRight size={16} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                </View>

                {/* Category Spending, and the recurring charges hiding inside
                    those categories. */}
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-2xl p-4">
                    <Text className="text-lg font-inter-semibold text-text-primary mb-3">Where it went</Text>
                    <SpendingBarChart data={chartData} monthLabel={format(new Date(), 'MMMM')} />
                    <TouchableOpacity
                        className="flex-row items-center justify-between mt-4 pt-3 border-t border-border"
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SubscriptionTracker' as never)}
                        accessibilityRole="button"
                    >
                        <View className="flex-1 mr-3">
                            <Text className="text-sm font-inter-semibold text-text-primary">Find recurring charges</Text>
                            <Text className={`text-xs mt-0.5 font-inter ${risenCount > 0 ? 'text-alert-amber' : 'text-text-secondary'}`}>
                                {risenCount > 0
                                    ? `${risenCount === 1 ? 'One subscription' : `${risenCount} subscriptions`} went up in price`
                                    : 'Subscriptions and bills hiding in these categories'}
                            </Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                </View>

                {/* The latest five, so what was just logged is visible. */}
                <View className="mt-4 mb-5 bg-surface-primary border border-border overflow-hidden" style={{ marginHorizontal: GUTTER, borderRadius: RADIUS.card }}>
                    <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
                        <Text style={TYPE.heading} className="text-text-primary">Latest</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('SwipeCategorise' as never)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                        >
                            <Text className="text-brand-link font-inter-semibold text-sm">Fix categories</Text>
                        </TouchableOpacity>
                    </View>
                    {latest.map((txn) => (
                        <TransactionRow
                            key={txn.id}
                            category={txn.category}
                            merchant={txn.merchant}
                            amount={txn.amount}
                            type={txn.type}
                            date={txn.date}
                            source={txn.source as 'auto' | 'manual'}
                        />
                    ))}
                </View>

                {/* The score and its summary, last, once the numbers it talks
                    about have been seen. Held back until a handful of
                    transactions exist, so it never scores an empty month. */}
                {transactions.length >= 5 ? (
                    <View className="mb-8">
                        <FinSightIQCard />
                    </View>
                ) : <View className="mb-8" />}
                  </>
                )}
            </ScrollView>

            {/* Position on the Pressable itself, not the inner view, so the
                tap area is where the button is drawn. */}
            <PressableScale
                containerStyle={{ position: 'absolute', bottom: 24, right: 24 }}
                className="bg-brand-primary-dark w-14 h-14 rounded-full items-center justify-center shadow-lg"
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