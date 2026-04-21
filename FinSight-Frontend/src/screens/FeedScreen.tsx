import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Bot } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { fetchBudgets } from '../store/slices/budgetsSlice';
import { fetchMarketData, fetchMarketInsight } from '../store/slices/marketSlice'; // <-- 1. Import new thunks
import { MarketPulseWidget } from '../components/MarketPulseWidget';
import { EITMCard } from '../components/EITMCard';
import { FinancialVitals } from '../components/FinancialVitals';
import { TransactionRow } from '../components/TransactionRow';
import FinSightIQCard from '../components/FinSightIQCard';
import { format } from 'date-fns';


export const FeedScreen: React.FC = () => {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    
    // User state
    const { user } = useAppSelector((state) => state.auth);
    
    // 2. Grabbing the LIVE data directly from the new marketSlice!
    const { insights: eitmCards, loading: marketLoading } = useAppSelector((state) => state.market);
    
    // Financial state
    const transactions = useAppSelector((state) => state.transactions.items);
    const budgets = useAppSelector((state) => state.budgets.items);
    const transactionsError = useAppSelector((state) => state.transactions.error);
    const budgetsError = useAppSelector((state) => state.budgets.error);
    
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        if (transactionsError) Alert.alert('Transaction Sync Error', transactionsError);
        if (budgetsError) Alert.alert('Budget Sync Error', budgetsError);
    }, [transactionsError, budgetsError]);

    useEffect(() => {
        // 3. Kick off real data fetches for both pulse and insights on load
        dispatch(fetchMarketData());
        dispatch(fetchMarketInsight());

        // Load real transactions and budgets
        dispatch(fetchTransactions());
        dispatch(fetchBudgets());
    }, [dispatch]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        Promise.all([
            dispatch(fetchTransactions()),
            dispatch(fetchMarketData()), // <-- Change this here too
            dispatch(fetchMarketInsight())
        ]).then(() => setRefreshing(false));
    }, [dispatch]);

    const today = new Date();
    const greeting =
        today.getHours() < 12
            ? 'Good Morning'
            : today.getHours() < 17
                ? 'Good Afternoon'
                : 'Good Evening';

    const displayName = user?.displayName?.split(' ')[0] || 'User';

    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    // Calculate total spent dynamically
    const totalSpent = React.useMemo(() => transactions.reduce(
        (acc, t) => (t.type === 'debit' ? acc + t.amount : acc),
        0
    ), [transactions]);

    // Calculate Category Spending
    const categorySpending = React.useMemo(() => {
        const totals: Record<string, number> = {};
        transactions.forEach(t => {
            if (t.type === 'debit') {
                const cat = t.category;
                totals[cat] = (totals[cat] || 0) + t.amount;
            }
        });

        const total = Object.values(totals).reduce((a, b) => a + b, 0);
        return Object.entries(totals)
            .map(([name, amount]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                amount,
                percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
                icon: name, // category key — FinancialVitals uses its own Lucide icon map
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    // Calculate Weekly Trend (Last 7 Days)
    const weeklyTrend = React.useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return days.map(date => {
            return transactions
                .filter(t => t.type === 'debit' && t.date.startsWith(date))
                .reduce((acc, t) => acc + t.amount, 0);
        });
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
                {/* Greeting Header */}
                <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-text-primary">
                            {greeting}, {displayName}
                        </Text>
                        <Text className="text-sm text-text-secondary">
                            {format(today, 'EEEE, MMMM d')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile' as never)}
                        activeOpacity={0.8}
                        className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
                    >
                        <Text className="text-white font-bold text-base">
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* FinSight IQ Card */}
                <FinSightIQCard />

                {/* Market Pulse */}
                <View className="mt-3">
                    <MarketPulseWidget />
                </View>

                {/* NEW: Start Investing Entry Point */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('CuratedBasket' as never)}
                    className="bg-indigo-900 rounded-3xl p-5 mx-4 mt-4 border border-indigo-800 shadow-md flex-row items-center justify-between"
                >
                    <View className="flex-1 mr-4">
                        <Text className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
                            Build Wealth
                        </Text>
                        <Text className="text-white text-lg font-bold mb-1">
                            Get Your Curated Basket
                        </Text>
                        <Text className="text-indigo-200 text-sm">
                            Based on your risk profile.
                        </Text>
                    </View>
                    <View className="w-12 h-12 bg-indigo-500 rounded-full items-center justify-center">
                        <Text className="text-white text-xl">→</Text>
                    </View>
                </TouchableOpacity>

                {/* EITM Cards Carousel */}
                <View className="mt-5">
                    <View className="px-4 mb-2 flex-row items-center">
                        <Bot size={12} color="#6366F1" />
                        <Text className="text-[10px] font-bold tracking-widest text-brand-primary uppercase ml-1">
                            AI Insights & Alerts
                        </Text>
                    </View>

                    {marketLoading && eitmCards.length === 0 ? (
                         <View className="px-4 py-8 items-center justify-center">
                             <Text className="text-sm text-text-secondary">Analyzing Dalal Street...</Text>
                         </View>
                    ) : (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                            decelerationRate="fast"
                            snapToInterval={336} 
                        >
                            {eitmCards.map((insightItem, index) => (
                                <EITMCard key={index} insight={insightItem} />
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Financial Vitals */}
                <View className="mt-4">
                    <FinancialVitals
                        totalSpent={totalSpent}
                        categories={categorySpending}
                        weeklyTrend={weeklyTrend}
                        comparison={{ type: 'increase', percentage: 0 }} 
                    />
                </View>

                {/* Recent Transactions */}
                <View className="mt-4 mx-4 bg-white border border-border rounded-xl overflow-hidden mb-6">
                    <View className="px-4 py-3 border-b border-border">
                        <Text className="text-lg font-semibold text-text-primary">
                            Recent Transactions
                        </Text>
                    </View>
                    {recentTransactions.length > 0 ? (
                        recentTransactions.map((txn) => (
                            <TransactionRow
                                key={txn.id}
                                category={txn.category}
                                merchant={txn.merchant}
                                amount={txn.amount}
                                type={txn.type}
                                date={txn.date}
                                source={txn.source as 'auto' | 'manual'}
                            />
                        ))
                    ) : (
                        <View className="p-4 items-center">
                            <Text className="text-text-secondary">No recent transactions</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <TouchableOpacity
                className="absolute bottom-6 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
                onPress={() => navigation.navigate('AddTransaction' as never)}
                activeOpacity={0.8}
            >
                <Plus color="white" size={24} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};