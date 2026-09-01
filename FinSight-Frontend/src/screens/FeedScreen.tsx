/**
 * FeedScreen - the home tab.
 *
 * Two things here were not real. The headline summed every transaction the
 * user had ever logged, so it grew for ever, and the comparison footer was
 * handed a hardcoded zero, so everyone read "0% higher than last month"
 * whatever they had spent.
 *
 * The window is the last 30 days rather than the calendar month. A calendar
 * month is the honest thing to show only if you open the app in the middle of
 * one: on the 1st it empties the whole screen, and a student who logged
 * steadily for four weeks is told they have spent nothing. Thirty days rolling
 * always has the same amount of history behind it, and the comparison is
 * against the thirty days before that.
 *
 * Budgets stay on calendar months, on the Vitals tab, because a budget is a
 * monthly commitment and has to line up with the month it was set for.
 *
 * Sync failures used to raise two Alert dialogs on top of the screen, which
 * meant a weak connection greeted the user with a modal they had to dismiss
 * before they could look at anything. They are a quiet inline line now.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Plus, Bot, Wallet, CloudOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { fetchBudgets } from '../store/slices/budgetsSlice';
import { fetchMarketInsight } from '../store/slices/marketSlice';
import { EITMCard } from '../components/EITMCard';
import { FinancialVitals } from '../components/FinancialVitals';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { PressableScale } from '../components/PressableScale';
import { Skeleton } from '../components/Skeleton';
import FinSightIQCard from '../components/FinSightIQCard';
import { format } from 'date-fns';

/** Card width plus its right margin, so the carousel lands on a card edge. */
const INSIGHT_SNAP = 320 + 12;

export const FeedScreen: React.FC = () => {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const { user } = useAppSelector((state) => state.auth);
    const {
        insights: eitmCards,
        loading: marketLoading,
        error: marketError,
    } = useAppSelector((state) => state.market);

    const transactions = useAppSelector((state) => state.transactions.items);
    const transactionsError = useAppSelector((state) => state.transactions.error);
    const budgetsError = useAppSelector((state) => state.budgets.error);
    const transactionsLoaded = useAppSelector((state) => state.transactions.loaded);

    const [refreshing, setRefreshing] = useState(false);

    // Everything below the header is derived from logged spending, so with
    // none of it there is nothing to render but noughts.
    const hasNothingLogged = transactionsLoaded && !transactionsError && transactions.length === 0;
    const syncFailed = Boolean(transactionsError || budgetsError);

    useEffect(() => {
        dispatch(fetchMarketInsight());
        dispatch(fetchTransactions());
        dispatch(fetchBudgets());
    }, [dispatch]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            dispatch(fetchTransactions()),
            dispatch(fetchMarketInsight()),
        ]).then(() => setRefreshing(false));
    }, [dispatch]);

    const today = new Date();
    const greeting =
        today.getHours() < 12
            ? 'Good morning'
            : today.getHours() < 17
                ? 'Good afternoon'
                : 'Good evening';

    const displayName = user?.displayName?.split(' ')[0] || 'there';

    const recentTransactions = useMemo(
        () => [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5),
        [transactions]
    );

    /** Debits in the 30-day window ending `windowsAgo` windows back. */
    const spendInWindow = useCallback((windowsAgo: number) => {
        const day = 24 * 60 * 60 * 1000;
        const end = Date.now() - windowsAgo * 30 * day;
        const start = end - 30 * day;
        return transactions.reduce((acc, t) => {
            if (t.type !== 'debit') return acc;
            const at = new Date(t.date).getTime();
            return at >= start && at < end ? acc + t.amount : acc;
        }, 0);
    }, [transactions]);

    const totalSpent = useMemo(() => spendInWindow(0), [spendInWindow]);

    /** Null when there is nothing in the previous window to compare against. */
    const comparison = useMemo(() => {
        const previous = spendInWindow(1);
        if (previous <= 0) return null;
        const delta = ((totalSpent - previous) / previous) * 100;
        if (Math.abs(delta) < 1) return { type: 'flat' as const, percentage: 0 };
        return {
            type: delta > 0 ? ('increase' as const) : ('decrease' as const),
            percentage: Math.abs(Math.round(delta)),
        };
    }, [spendInWindow, totalSpent]);

    const weeklyTrend = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        return days.map((date) =>
            transactions
                .filter((t) => t.type === 'debit' && t.date.startsWith(date))
                .reduce((acc, t) => acc + t.amount, 0)
        );
    }, [transactions]);

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'left', 'right']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366F1"
                        colors={['#6366F1']}
                    />
                }
            >
                <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                        <Text className="text-2xl font-bold text-text-primary">
                            {greeting}, {displayName}
                        </Text>
                        <Text className="text-sm text-text-secondary">
                            {format(today, 'EEEE, MMMM d')}
                        </Text>
                    </View>
                    <PressableScale
                        onPress={() => navigation.navigate('Profile' as never)}
                        activeScale={0.92}
                        accessibilityRole="button"
                        accessibilityLabel="Your profile"
                        className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
                    >
                        <Text className="text-white font-bold text-base">
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </PressableScale>
                </View>

                {syncFailed && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        className="mx-4 mt-2 flex-row items-center bg-surface-secondary border border-border rounded-xl px-3 py-2.5"
                    >
                        <CloudOff size={14} color="#6B7280" />
                        <Text className="text-xs text-text-secondary ml-2 flex-1">
                            Showing what was saved on this device. Pull down to try again.
                        </Text>
                    </Animated.View>
                )}

                {hasNothingLogged ? (
                    <EmptyState
                        icon={<Wallet color="#6366F1" size={36} />}
                        title="Start with one expense"
                        body="FinSight works out where your money goes from what you log. Add a single expense and the rest of this screen fills in."
                        actionLabel="Add your first expense"
                        onAction={() => navigation.navigate('AddTransaction' as never)}
                        hint="Got a bank SMS? Paste it and we will read the amount, merchant and category for you."
                    />
                ) : (
                    <>
                        <FinSightIQCard />

                        <View className="mt-5">
                            <View className="px-4 mb-2 flex-row items-center">
                                <Bot size={12} color="#6366F1" />
                                <Text className="text-[10px] font-bold tracking-widest text-brand-primary uppercase ml-1">
                                    AI insights
                                </Text>
                            </View>

                            {marketLoading && eitmCards.length === 0 ? (
                                // A placeholder shaped like the card that is coming,
                                // rather than a line of text about Dalal Street.
                                <View className="flex-row px-4">
                                    <View className="w-80 mr-3 bg-white rounded-2xl border border-border p-4">
                                        <Skeleton width="35%" height={10} />
                                        <View style={{ height: 12 }} />
                                        <Skeleton width="80%" height={16} />
                                        <View style={{ height: 10 }} />
                                        <Skeleton width="100%" height={11} />
                                        <View style={{ height: 6 }} />
                                        <Skeleton width="90%" height={11} />
                                    </View>
                                </View>
                            ) : eitmCards.length === 0 ? (
                                <View className="mx-4 flex-row items-start bg-white border border-border rounded-2xl px-4 py-3.5">
                                    <CloudOff size={14} color="#9CA3AF" style={{ marginTop: 2 }} />
                                    <View className="flex-1 ml-2">
                                        <Text className="text-xs text-text-secondary leading-4">
                                            {marketError ?? 'No insights right now.'}
                                        </Text>
                                        <Text
                                            onPress={onRefresh}
                                            className="text-xs font-bold text-brand-primary mt-1.5"
                                        >
                                            Try again
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16 }}
                                    decelerationRate="fast"
                                    snapToInterval={INSIGHT_SNAP}
                                >
                                    {eitmCards.map((insightItem, index) => (
                                        <EITMCard key={index} insight={insightItem} />
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        <View className="mt-4">
                            <FinancialVitals
                                totalSpent={totalSpent}
                                weeklyTrend={weeklyTrend}
                                comparison={comparison}
                            />
                        </View>

                        <View className="mt-4 mx-4 bg-white border border-border rounded-xl overflow-hidden mb-6">
                            <View className="px-4 py-3 border-b border-border">
                                <Text className="text-lg font-semibold text-text-primary">
                                    Recent transactions
                                </Text>
                            </View>
                            {recentTransactions.length > 0 ? (
                                recentTransactions.map((txn, i) => (
                                    // Five rows off a plain map, not a virtualized
                                    // list, so an entrance here is safe. The stagger
                                    // is short enough that the last row is in before
                                    // the eye reaches it.
                                    <Animated.View
                                        key={txn.id}
                                        entering={
                                            reduced
                                                ? FadeIn.duration(160)
                                                : FadeInDown.duration(240).delay(i * 45)
                                        }
                                    >
                                        <TransactionRow
                                            category={txn.category}
                                            merchant={txn.merchant}
                                            amount={txn.amount}
                                            type={txn.type}
                                            date={txn.date}
                                            source={txn.source as 'auto' | 'manual'}
                                        />
                                    </Animated.View>
                                ))
                            ) : (
                                <View className="p-4 items-center">
                                    <Text className="text-text-secondary">
                                        Nothing logged yet this month.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            <PressableScale
                className="absolute bottom-6 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
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
