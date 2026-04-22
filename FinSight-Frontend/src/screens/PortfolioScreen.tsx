/**
 * PortfolioScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Holdings table + P&L summary + allocation visualisation + Round-Up wallet card
 */
import React, { useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Svg, Circle } from 'react-native-svg';
import {
    ChevronLeft, TrendingUp, TrendingDown, PiggyBank, RefreshCw,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadPortfolio } from '../store/slices/brokerageSlice';
import { loadRoundupBalance } from '../store/slices/walletSlice';
import { format, parseISO } from 'date-fns';

// ── Donut Chart ────────────────────────────────────────────────────────────

const DONUT_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];

const DonutChart: React.FC<{ data: { label: string; pct: number }[] }> = ({ data }) => {
    const SIZE   = 140;
    const STROKE = 22;
    const R      = (SIZE - STROKE) / 2;
    const CIRC   = 2 * Math.PI * R;

    let cumulative = 0;
    const segments = data.map((d, i) => {
        const dasharray  = (d.pct / 100) * CIRC;
        const dashoffset = CIRC - cumulative * CIRC / 100;
        cumulative += d.pct;
        return { ...d, dasharray, dashoffset, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    });

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                {/* Background ring */}
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE} />
                {segments.map((seg, i) => (
                    <Circle
                        key={i}
                        cx={SIZE / 2} cy={SIZE / 2} r={R}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={STROKE}
                        strokeDasharray={`${seg.dasharray} ${CIRC - seg.dasharray}`}
                        strokeDashoffset={seg.dashoffset}
                        rotation={-90}
                        origin={`${SIZE / 2},${SIZE / 2}`}
                        strokeLinecap="round"
                    />
                ))}
            </Svg>
        </View>
    );
};

// ── P&L Badge ─────────────────────────────────────────────────────────────

const PnLBadge: React.FC<{ pnl: number; pct: number }> = ({ pnl, pct }) => {
    const isUp = pnl >= 0;
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: isUp ? '#ECFDF5' : '#FEF2F2',
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
        }}>
            {isUp ? <TrendingUp size={13} color="#10B981" /> : <TrendingDown size={13} color="#EF4444" />}
            <Text style={{ fontSize: 13, fontWeight: '700', color: isUp ? '#10B981' : '#EF4444' }}>
                {isUp ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isUp ? '+' : ''}{pct.toFixed(2)}%)
            </Text>
        </View>
    );
};

// ── Main Screen ──────────────────────────────────────────────────────────

const PortfolioScreen: React.FC = () => {
    const dispatch   = useAppDispatch();
    const navigation = useNavigation();

    const portfolio      = useAppSelector((s) => s.brokerage.portfolio);
    const loading        = useAppSelector((s) => s.brokerage.loading);
    const roundup        = useAppSelector((s) => s.wallet.roundup);

    const [refreshing, setRefreshing] = React.useState(false);

    const loadAll = useCallback(() => {
        dispatch(loadPortfolio());
        dispatch(loadRoundupBalance());
    }, [dispatch]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const holdings = portfolio?.holdings || [];
    const hasHoldings = holdings.length > 0;

    const donutData = holdings.map((h) => ({ label: h.asset_id, pct: h.allocation_pct }));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ChevronLeft size={20} color="#111827" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Portfolio</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Holdings & P&L</Text>
                </View>
                <TouchableOpacity onPress={() => loadAll()}>
                    <RefreshCw size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
            >
                {/* Portfolio Value Card */}
                <View style={{ backgroundColor: '#0F172A', borderRadius: 24, padding: 24, marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Total Portfolio Value
                    </Text>
                    {loading && !portfolio ? (
                        <ActivityIndicator color="#6366F1" style={{ marginTop: 12 }} />
                    ) : (
                        <>
                            <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginTop: 6, letterSpacing: -1 }}>
                                ₹{(portfolio?.total_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                                    Invested: ₹{(portfolio?.total_invested || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </Text>
                                <PnLBadge pnl={portfolio?.total_pnl || 0} pct={portfolio?.total_pnl_pct || 0} />
                            </View>
                        </>
                    )}
                </View>

                {/* Round-Up Wallet Card */}
                {roundup && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('RoundUp' as never)}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A',
                            borderRadius: 18, padding: 16, marginBottom: 16,
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                <PiggyBank size={22} color="#D97706" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>Round-Up Wallet</Text>
                                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 2 }}>
                                    ₹{roundup.roundup_balance.toLocaleString('en-IN')}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                                    {roundup.progress_pct.toFixed(0)}% to ₹{roundup.threshold} threshold
                                </Text>
                            </View>
                        </View>
                        <View>
                            {roundup.ready_to_invest ? (
                                <View style={{ backgroundColor: '#D97706', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Invest Now!</Text>
                                </View>
                            ) : (
                                <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>{roundup.progress_pct.toFixed(0)}%</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Allocation Donut + Legend */}
                {hasHoldings && (
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Allocation</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                            <DonutChart data={donutData} />
                            <View style={{ flex: 1, gap: 8 }}>
                                {holdings.map((h, i) => (
                                    <View key={h.asset_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                        <Text style={{ fontSize: 12, color: '#374151', flex: 1 }} numberOfLines={1}>{h.asset_id.replace('_', ' ')}</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>{h.allocation_pct.toFixed(1)}%</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Holdings Table */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Holdings</Text>

                    {loading && !portfolio ? (
                        <ActivityIndicator color="#6366F1" />
                    ) : !hasHoldings ? (
                        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <Text style={{ fontSize: 15, color: '#9CA3AF', fontWeight: '600' }}>No holdings yet</Text>
                            <Text style={{ fontSize: 13, color: '#D1D5DB', marginTop: 6, textAlign: 'center' }}>
                                Visit the Invest screen to place your first order.
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Invest' as never)}
                                style={{ backgroundColor: '#6366F1', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Go to Invest</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        holdings.map((h) => {
                            const isUp = h.unrealised_pnl >= 0;
                            return (
                                <View
                                    key={h.asset_id}
                                    style={{
                                        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
                                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{h.asset_id.replace('_', ' ')}</Text>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{h.name}</Text>
                                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                                            {h.quantity} units · Avg ₹{h.avg_buy_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                                            ₹{h.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: isUp ? '#10B981' : '#EF4444', marginTop: 4 }}>
                                            {isUp ? '+' : ''}₹{Math.abs(h.unrealised_pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isUp ? '+' : ''}{h.unrealised_pnl_pct.toFixed(2)}%)
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{h.allocation_pct.toFixed(1)}% of portfolio</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default PortfolioScreen;
