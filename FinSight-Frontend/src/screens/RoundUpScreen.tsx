/**
 * RoundUpScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Round-Up & Invest - History, Balance, Manual Invest Trigger
 */
import React, { useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, PiggyBank, Zap, CheckCircle, Clock } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadRoundupBalance, loadRoundupHistory, investRoundups, clearInvestResult } from '../store/slices/walletSlice';
import { loadPortfolio } from '../store/slices/brokerageSlice';
import { format, parseISO } from 'date-fns';

const THRESHOLD = 500;

const RoundUpScreen: React.FC = () => {
    const dispatch   = useAppDispatch();
    const navigation = useNavigation();

    const roundup         = useAppSelector((s) => s.wallet.roundup);
    const history         = useAppSelector((s) => s.wallet.roundupHistory);
    const loading         = useAppSelector((s) => s.wallet.roundupLoading);
    const error           = useAppSelector((s) => s.wallet.error);
    const lastInvestResult = useAppSelector((s) => s.wallet.lastInvestResult);

    const [refreshing, setRefreshing] = React.useState(false);

    const loadAll = useCallback(() => {
        dispatch(loadRoundupBalance());
        dispatch(loadRoundupHistory());
    }, [dispatch]);

    useEffect(() => { loadAll(); }, [loadAll]);

    useEffect(() => {
        if (lastInvestResult) {
            Alert.alert(
                'Invested',
                `Successfully invested ₹${lastInvestResult.invested?.toFixed(2)} in ${lastInvestResult.asset}.\n\nUnits bought: ${lastInvestResult.quantity?.toFixed(4)}`,
                [{ text: 'View Portfolio', onPress: () => navigation.navigate('Portfolio' as never) }, { text: 'Done' }]
            );
            dispatch(clearInvestResult());
            dispatch(loadPortfolio());
        }
    }, [lastInvestResult]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const handleInvest = () => {
        if (!roundup?.ready_to_invest) {
            Alert.alert('Not Ready Yet', `You need at least ₹${THRESHOLD} to trigger auto-invest. Current balance: ₹${roundup?.roundup_balance?.toFixed(2) || 0}`);
            return;
        }
        Alert.alert(
            'Invest Round-Ups',
            `Invest ₹${roundup.roundup_balance.toFixed(2)} in NIFTY BeES ETF?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Invest Now', onPress: () => dispatch(investRoundups()) },
            ]
        );
    };

    const balance     = roundup?.roundup_balance || 0;
    const progressPct = roundup?.progress_pct || 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFBEB' }} edges={['top']}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ChevronLeft size={20} color="#92400E" />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Round-Up Wallet</Text>
                    <Text style={{ fontSize: 12, color: '#B45309' }}>Spare change → Investments</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D97706" />}
            >
                {/* How It Works */}
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Zap size={14} color="#92400E" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>How Round-Ups Work</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#78350F', lineHeight: 20 }}>
                        Every time you add an expense, we round it up to the nearest ₹10 and save the difference here.
                        {'\n\n'}
                        Example: ₹183 → ₹190 → Round-up = <Text style={{ fontWeight: '700' }}>₹7</Text>
                        {'\n\n'}
                        When you accumulate <Text style={{ fontWeight: '700' }}>₹{THRESHOLD}</Text>, tap "Invest Now" to automatically buy NIFTY BeES ETF units!
                    </Text>
                </View>

                {/* Balance Card */}
                <View style={{ backgroundColor: '#111827', borderRadius: 24, padding: 24, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                            <PiggyBank size={24} color="#D97706" />
                        </View>
                        <View>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>ACCUMULATED ROUND-UPS</Text>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 }}>
                                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                        Progress to ₹{THRESHOLD} threshold
                    </Text>
                    <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                        <View style={{
                            height: '100%',
                            width: `${Math.min(progressPct, 100)}%`,
                            backgroundColor: progressPct >= 100 ? '#10B981' : '#F59E0B',
                            borderRadius: 5,
                        }} />
                    </View>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        {progressPct.toFixed(0)}% · {roundup?.pending_count || 0} transactions pending
                    </Text>
                </View>

                {/* Invest Button */}
                <TouchableOpacity
                    onPress={handleInvest}
                    disabled={loading}
                    style={{
                        backgroundColor: roundup?.ready_to_invest ? '#10B981' : '#D1D5DB',
                        borderRadius: 18, padding: 18, alignItems: 'center',
                        marginBottom: 24, flexDirection: 'row', justifyContent: 'center', gap: 10,
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    {loading
                        ? <ActivityIndicator color="#FFF" />
                        : <>
                            <Zap size={20} color={roundup?.ready_to_invest ? '#FFF' : '#9CA3AF'} />
                            <Text style={{ fontSize: 16, fontWeight: '800', color: roundup?.ready_to_invest ? '#FFF' : '#9CA3AF' }}>
                                {roundup?.ready_to_invest ? 'Invest Now in NIFTY BeES!' : `₹${(THRESHOLD - balance).toFixed(2)} more to unlock`}
                            </Text>
                          </>
                    }
                </TouchableOpacity>

                {/* Transaction History */}
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Round-Up History</Text>

                {history.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 32, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#F3F4F6' }}>
                        <Clock size={36} color="#D1D5DB" />
                        <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12, fontWeight: '600' }}>No round-ups yet</Text>
                        <Text style={{ fontSize: 12, color: '#D1D5DB', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 }}>
                            Add expense transactions to start accumulating round-up savings.
                        </Text>
                    </View>
                ) : (
                    history.map((txn) => {
                        const isInvested = txn.status === 'INVESTED';
                        return (
                            <View
                                key={txn.txn_id}
                                style={{
                                    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
                                    borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row',
                                    justifyContent: 'space-between', alignItems: 'center',
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isInvested ? '#ECFDF5' : '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                        {isInvested ? <CheckCircle size={18} color="#10B981" /> : <PiggyBank size={18} color="#D97706" />}
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                                            ₹{txn.original_amount.toLocaleString('en-IN')} → ₹{txn.rounded_amount.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                            {format(parseISO(txn.timestamp), 'dd MMM, hh:mm a')}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#F59E0B' }}>+₹{txn.delta.toFixed(2)}</Text>
                                    <View style={{ backgroundColor: isInvested ? '#ECFDF5' : '#FEF9C3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: isInvested ? '#10B981' : '#D97706' }}>
                                            {txn.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default RoundUpScreen;
