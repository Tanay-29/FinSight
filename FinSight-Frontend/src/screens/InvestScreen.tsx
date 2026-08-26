/**
 * InvestScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Mock Brokerage UI - Asset Price Board + BUY/SELL Modal + Order History
 * Accessible via VitalsScreen quick-access card.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft, TrendingUp, TrendingDown, Briefcase,
    Zap, RefreshCw, ShoppingCart, CircleDollarSign,
    BarChart3, Landmark, ClipboardList, LineChart,
} from 'lucide-react-native';

/** Icon shown on each asset row, by asset type. */
const ASSET_ICONS = {
    ETF: BarChart3,
    Stock: LineChart,
} as const;
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadPrices, loadOrders, submitOrder, clearError } from '../store/slices/brokerageSlice';
import { loadWallet, addFunds } from '../store/slices/walletSlice';
import { format, parseISO } from 'date-fns';

const ASSET_COLORS: Record<string, string> = {
    NIFTY_BEES: '#6366F1',
    GOLDBEES:   '#F59E0B',
    INFY:       '#10B981',
    TCS:        '#3B82F6',
    HDFC_MF:    '#EC4899',
    AXIS_MF:    '#8B5CF6',
};

const TYPE_COLORS: Record<string, string> = {
    ETF:   '#6366F1',
    Stock: '#10B981',
    MF:    '#F59E0B',
};

// ── Order Modal ──────────────────────────────────────────────────────────

const OrderModal: React.FC<{
    visible: boolean;
    asset: any;
    onClose: () => void;
    onSubmit: (qty: number, type: 'BUY' | 'SELL') => void;
    submitting: boolean;
    walletBalance: number;
}> = ({ visible, asset, onClose, onSubmit, submitting, walletBalance }) => {
    const [qty, setQty] = useState('1');
    const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');

    const quantity  = parseFloat(qty) || 0;
    const total     = asset ? Math.round(asset.price * quantity * 100) / 100 : 0;
    const canAfford = walletBalance >= total;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>
                                {asset?.name}
                            </Text>
                            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                                ₹{asset?.price?.toLocaleString('en-IN')} per unit
                            </Text>
                        </View>
                        <View style={{ backgroundColor: TYPE_COLORS[asset?.type] + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: TYPE_COLORS[asset?.type] }}>{asset?.type}</Text>
                        </View>
                    </View>

                    {/* BUY / SELL Toggle */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4, marginBottom: 20 }}>
                        {(['BUY', 'SELL'] as const).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setOrderType(t)}
                                style={{
                                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                                    backgroundColor: orderType === t ? (t === 'BUY' ? '#10B981' : '#EF4444') : 'transparent',
                                }}
                            >
                                <Text style={{ fontWeight: '700', color: orderType === t ? '#FFFFFF' : '#6B7280' }}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Quantity Input */}
                    <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Quantity (units)</Text>
                    <TextInput
                        style={{
                            backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
                            borderRadius: 14, padding: 14, fontSize: 22, fontWeight: '700',
                            color: '#111827', marginBottom: 16,
                        }}
                        keyboardType="decimal-pad"
                        value={qty}
                        onChangeText={setQty}
                        placeholder="0"
                    />

                    {/* Total */}
                    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#6B7280', fontWeight: '600' }}>Total</Text>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>
                            ₹{total.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    {orderType === 'BUY' && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Wallet Balance</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: canAfford ? '#10B981' : '#EF4444' }}>
                                ₹{walletBalance.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => { if (quantity > 0) onSubmit(quantity, orderType); }}
                        disabled={submitting || quantity <= 0}
                        style={{
                            backgroundColor: orderType === 'BUY' ? '#10B981' : '#EF4444',
                            borderRadius: 16, padding: 16, alignItems: 'center',
                            opacity: (submitting || quantity <= 0) ? 0.6 : 1,
                        }}
                    >
                        {submitting
                            ? <ActivityIndicator color="#FFF" />
                            : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {orderType === 'BUY'
                                    ? <ShoppingCart size={16} color="#FFF" />
                                    : <CircleDollarSign size={16} color="#FFF" />}
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>
                                    {orderType === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'}
                                </Text>
                              </View>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={{ marginTop: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ── Add Funds Modal ──────────────────────────────────────────────────────

const AddFundsModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onAdd: (amount: number) => void;
    loading: boolean;
}> = ({ visible, onClose, onAdd, loading }) => {
    const [amount, setAmount] = useState('');
    const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '85%' }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 }}>Add Funds to Wallet</Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {QUICK_AMOUNTS.map((a) => (
                            <TouchableOpacity
                                key={a}
                                onPress={() => setAmount(a.toString())}
                                style={{
                                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                                    backgroundColor: amount === a.toString() ? '#6366F1' : '#F3F4F6',
                                }}
                            >
                                <Text style={{ color: amount === a.toString() ? '#FFF' : '#374151', fontWeight: '600' }}>
                                    ₹{a.toLocaleString('en-IN')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={{
                            backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
                            borderRadius: 12, padding: 12, fontSize: 18, fontWeight: '700',
                            color: '#111827', marginBottom: 16,
                        }}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Enter custom amount"
                    />

                    <TouchableOpacity
                        onPress={() => { const a = parseFloat(amount); if (a > 0) onAdd(a); }}
                        disabled={loading || !amount}
                        style={{ backgroundColor: '#6366F1', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 }}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Add Funds</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ── Main Screen ──────────────────────────────────────────────────────────

const InvestScreen: React.FC = () => {
    const dispatch    = useAppDispatch();
    const navigation  = useNavigation();

    const prices        = useAppSelector((s) => s.brokerage.prices);
    const orders        = useAppSelector((s) => s.brokerage.orders);
    const orderLoading  = useAppSelector((s) => s.brokerage.orderLoading);
    const brokerError   = useAppSelector((s) => s.brokerage.error);
    const walletBalance = useAppSelector((s) => s.wallet.balance);
    const walletLoading = useAppSelector((s) => s.wallet.loading);

    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [fundsModalVisible, setFundsModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'prices' | 'orders'>('prices');

    const loadAll = useCallback(() => {
        dispatch(loadPrices());
        dispatch(loadOrders());
        dispatch(loadWallet());
    }, [dispatch]);

    useEffect(() => {
        loadAll();
        // Auto-refresh prices every 60s
        const interval = setInterval(() => dispatch(loadPrices()), 60000);
        return () => clearInterval(interval);
    }, [loadAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const handleOpenOrder = (asset: any) => {
        setSelectedAsset(asset);
        setOrderModalVisible(true);
    };

    const handleSubmitOrder = async (qty: number, type: 'BUY' | 'SELL') => {
        if (!selectedAsset) return;
        try {
            await dispatch(submitOrder({
                asset_id: selectedAsset.symbol,
                quantity: qty,
                order_type: type,
            })).unwrap();
            setOrderModalVisible(false);
            dispatch(loadWallet());
            Alert.alert('Order Executed', `${type} ${qty} units of ${selectedAsset.name} at ₹${selectedAsset.price}`);
        } catch (err: any) {
            Alert.alert('Order Failed', err?.message || 'Unknown error');
        }
    };

    const handleAddFunds = async (amount: number) => {
        await dispatch(addFunds(amount)).unwrap();
        setFundsModalVisible(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={['top']}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronLeft size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>Invest</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Mock Brokerage Engine</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Portfolio' as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}
                >
                    <Briefcase size={14} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Portfolio</Text>
                </TouchableOpacity>
            </View>

            {/* Wallet Banner */}
            <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CircleDollarSign size={22} color="#818CF8" />
                    <View>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Wallet</Text>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>
                            ₹{walletBalance.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setFundsModalVisible(true)}
                    style={{ backgroundColor: '#6366F1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>+ Add Funds</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={{ flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4, marginBottom: 16 }}>
                {(['prices', 'orders'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
                            backgroundColor: activeTab === tab ? '#6366F1' : 'transparent',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {tab === 'prices'
                                ? <TrendingUp size={14} color={activeTab === tab ? '#FFF' : 'rgba(255,255,255,0.5)'} />
                                : <ClipboardList size={14} color={activeTab === tab ? '#FFF' : 'rgba(255,255,255,0.5)'} />}
                            <Text style={{ color: activeTab === tab ? '#FFF' : 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                                {tab === 'prices' ? 'Markets' : 'My Orders'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
            >
                {activeTab === 'prices' ? (
                    <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Live Asset Prices</Text>
                            <TouchableOpacity onPress={() => dispatch(loadPrices())} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <RefreshCw size={13} color="rgba(255,255,255,0.4)" />
                                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Refresh</Text>
                            </TouchableOpacity>
                        </View>

                        {prices.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator color="#6366F1" size="large" />
                                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>Loading prices...</Text>
                            </View>
                        ) : (
                            prices.map((asset) => {
                                const color = ASSET_COLORS[asset.symbol] || '#6366F1';
                                return (
                                    <TouchableOpacity
                                        key={asset.symbol}
                                        onPress={() => handleOpenOrder(asset)}
                                        activeOpacity={0.8}
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            borderRadius: 18,
                                            padding: 16,
                                            marginBottom: 10,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.08)',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center' }}>
                                                {React.createElement(
                                                    ASSET_ICONS[asset.type as keyof typeof ASSET_ICONS] ?? Landmark,
                                                    { size: 18, color }
                                                )}
                                            </View>
                                            <View>
                                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{asset.symbol.replace('_', ' ')}</Text>
                                                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{asset.name}</Text>
                                                <View style={{ backgroundColor: TYPE_COLORS[asset.type] + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
                                                    <Text style={{ fontSize: 10, color: TYPE_COLORS[asset.type], fontWeight: '700' }}>{asset.type}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                                                ₹{asset.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                {asset.is_up
                                                    ? <TrendingUp size={13} color="#10B981" />
                                                    : <TrendingDown size={13} color="#EF4444" />
                                                }
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: asset.is_up ? '#10B981' : '#EF4444' }}>
                                                    {asset.is_up ? '+' : ''}{asset.change_pct.toFixed(2)}%
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 10, color: '#6366F1', fontWeight: '700', marginTop: 6 }}>Tap to Trade →</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </>
                ) : (
                    <>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginBottom: 14 }}>Order History</Text>
                        {orders.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                                <ShoppingCart size={44} color="rgba(255,255,255,0.15)" />
                                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 14, fontSize: 15, fontWeight: '600' }}>No orders yet</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.25)', marginTop: 6, fontSize: 13, textAlign: 'center' }}>
                                    Switch to Markets tab and place your first order
                                </Text>
                            </View>
                        ) : (
                            orders.map((order) => (
                                <View
                                    key={order.order_id}
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        borderRadius: 16, padding: 14, marginBottom: 10,
                                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
                                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: order.order_type === 'BUY' ? '#10B98120' : '#EF444420', alignItems: 'center', justifyContent: 'center' }}>
                                            {order.order_type === 'BUY'
                                                ? <TrendingUp size={16} color="#10B981" />
                                                : <TrendingDown size={16} color="#EF4444" />
                                            }
                                        </View>
                                        <View>
                                            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{order.order_type} · {order.asset_id.replace('_', ' ')}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                                                {order.quantity} units @ ₹{order.price?.toLocaleString('en-IN')}
                                            </Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>
                                                {format(parseISO(order.timestamp), 'dd MMM, hh:mm a')}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>
                                            ₹{((order.quantity || 0) * (order.price || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </Text>
                                        <View style={{ backgroundColor: '#10B98120', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                                            <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>{order.status}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}
            </ScrollView>

            {/* Modals */}
            <OrderModal
                visible={orderModalVisible}
                asset={selectedAsset}
                onClose={() => setOrderModalVisible(false)}
                onSubmit={handleSubmitOrder}
                submitting={orderLoading}
                walletBalance={walletBalance}
            />
            <AddFundsModal
                visible={fundsModalVisible}
                onClose={() => setFundsModalVisible(false)}
                onAdd={handleAddFunds}
                loading={walletLoading}
            />
        </SafeAreaView>
    );
};

export default InvestScreen;
