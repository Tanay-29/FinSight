/**
 * SubscriptionTrackerScreen.tsx
 *
 * "Leaky Spend" scanner - detects recurring charges from transaction history.
 *
 * Algorithm:
 *   - Looks back 90 days at all debit transactions
 *   - Groups by normalised merchant name
 *   - Merchants that appear 2+ times → flagged as recurring
 *   - Estimates monthly cost from frequency and average amount
 *   - Classifies as 'subscription' (30–45 day cycle) or 'recurring' (shorter cycle)
 *
 * No Firestore writes - this is a read-only planning tool.
 */
import React, { useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Search, Check, X as XIcon,
    RefreshCw, Tv, Music, Zap, Coffee,
    ShoppingBag, Heart, Repeat, AlertCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────

type RecurringType = 'subscription' | 'recurring' | 'weekly';

interface RecurringCharge {
    merchant: string;
    normalised: string;
    category: string;
    totalCount: number;
    avgAmount: number;
    estimatedMonthly: number;
    avgIntervalDays: number;
    type: RecurringType;
    lastDate: string;
    transactions: Array<{ date: string; amount: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────

function normaliseMerchant(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')[0]; // use first word as the key (e.g. "Zomato Food" → "zomato")
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    entertainment: <Tv size={18} color="#8B5CF6" />,
    dining:        <Coffee size={18} color="#F97316" />,
    shopping:      <ShoppingBag size={18} color="#EC4899" />,
    utilities:     <Zap size={18} color="#6366F1" />,
    health:        <Heart size={18} color="#EF4444" />,
};
const DEFAULT_ICON = <RefreshCw size={18} color="#6B7280" />;

const CATEGORY_BG: Record<string, string> = {
    entertainment: '#F5F3FF',
    dining:        '#FFF7ED',
    shopping:      '#FDF2F8',
    utilities:     '#EEF2FF',
    health:        '#FEF2F2',
};

function getTypeLabel(type: RecurringType): { label: string; color: string; bg: string } {
    if (type === 'subscription') return { label: 'Monthly', color: '#6366F1', bg: '#EEF2FF' };
    if (type === 'weekly')       return { label: 'Weekly',  color: '#F59E0B', bg: '#FFFBEB' };
    return                               { label: 'Recurring', color: '#10B981', bg: '#ECFDF5' };
}

// ─── Main Screen ──────────────────────────────────────────────

const SubscriptionTrackerScreen: React.FC = () => {
    const navigation = useNavigation();
    const transactions = useAppSelector((s) => s.transactions.items);

    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'subscription' | 'recurring'>('all');
    const [keepSet, setKeepSet] = useState<Set<string>>(new Set());
    const [cancelSet, setCancelSet] = useState<Set<string>>(new Set());

    // ── Detection algorithm ──────────────────────────────────
    const charges = useMemo<RecurringCharge[]>(() => {
        const cutoff = subDays(new Date(), 90);
        const groups: Record<string, Array<{ date: string; amount: number; category: string; merchant: string }>> = {};

        transactions.forEach((t) => {
            if (t.type !== 'debit') return;
            try {
                const txDate = parseISO(t.date);
                if (txDate < cutoff) return;
            } catch { return; }

            if (!t.merchant && !t.category) return;
            const key = normaliseMerchant(t.merchant ?? t.category ?? 'unknown');
            if (!groups[key]) groups[key] = [];
            groups[key].push({
                date: t.date,
                amount: t.amount,
                category: t.category ?? 'other',
                merchant: t.merchant ?? t.category ?? 'Unknown',
            });
        });

        const results: RecurringCharge[] = [];

        Object.entries(groups).forEach(([norm, txs]) => {
            if (txs.length < 2) return; // need at least 2 occurrences

            // Sort by date ascending
            const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
            const dates = sorted.map((t) => parseISO(t.date));

            // Average interval between occurrences
            let totalInterval = 0;
            for (let i = 1; i < dates.length; i++) {
                totalInterval += differenceInDays(dates[i], dates[i - 1]);
            }
            const avgIntervalDays = Math.round(totalInterval / (dates.length - 1));

            if (avgIntervalDays > 50) return; // too infrequent → not really recurring
            if (avgIntervalDays < 3)  return; // too frequent → probably manual entries

            const avgAmount = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
            const estimatedMonthly = Math.round((avgAmount * 30) / avgIntervalDays);

            let type: RecurringType;
            if (avgIntervalDays <= 10)      type = 'weekly';
            else if (avgIntervalDays <= 40) type = 'subscription';
            else                            type = 'recurring';

            const lastTx = sorted[sorted.length - 1];

            results.push({
                merchant: lastTx.merchant,
                normalised: norm,
                category: lastTx.category,
                totalCount: txs.length,
                avgAmount: Math.round(avgAmount),
                estimatedMonthly,
                avgIntervalDays,
                type,
                lastDate: lastTx.date,
                transactions: sorted.map((t) => ({ date: t.date, amount: t.amount })),
            });
        });

        // Sort by monthly cost desc
        return results.sort((a, b) => b.estimatedMonthly - a.estimatedMonthly);
    }, [transactions]);

    // ── Filtered list ────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = charges;
        if (activeTab !== 'all') {
            list = list.filter((c) =>
                activeTab === 'subscription' ? c.type === 'subscription' : c.type !== 'subscription'
            );
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((c) => c.merchant.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
        }
        return list;
    }, [charges, activeTab, search]);

    // ── Totals ───────────────────────────────────────────────
    const totalMonthly = charges.reduce((s, c) => s + c.estimatedMonthly, 0);
    const potentialSavings = charges
        .filter((c) => cancelSet.has(c.normalised))
        .reduce((s, c) => s + c.estimatedMonthly, 0);

    const toggleKeep = (key: string) => {
        setKeepSet((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
        setCancelSet((prev) => { const n = new Set(prev); n.delete(key); return n; });
    };
    const toggleCancel = (key: string) => {
        setCancelSet((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
        setKeepSet((prev) => { const n = new Set(prev); n.delete(key); return n; });
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                >
                    <ChevronLeft size={20} color="#111827" />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Leaky Spend</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Recurring charges · Last 90 days</Text>
                </View>
            </View>

            {/* Summary card */}
            <View style={{
                marginHorizontal: 20, marginBottom: 16,
                backgroundColor: '#1E1B4B',
                borderRadius: 20, padding: 20,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Committed Monthly
                        </Text>
                        <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1, marginTop: 4 }}>
                            ₹{totalMonthly.toLocaleString('en-IN')}
                        </Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                            {charges.length} recurring charge{charges.length !== 1 ? 's' : ''} detected
                        </Text>
                    </View>
                    {potentialSavings > 0 && (
                        <View style={{ backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: '#6EE7B7', fontWeight: '600' }}>Cancel savings</Text>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#34D399', marginTop: 2 }}>
                                ₹{potentialSavings.toLocaleString('en-IN')}
                            </Text>
                            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>/month</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Search bar */}
            <View style={{
                marginHorizontal: 20, marginBottom: 12,
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#FFFFFF', borderRadius: 14,
                borderWidth: 1, borderColor: '#F3F4F6',
                paddingHorizontal: 14, paddingVertical: 10, gap: 8,
            }}>
                <Search size={16} color="#9CA3AF" />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search merchant..."
                    placeholderTextColor="#D1D5DB"
                    style={{ flex: 1, fontSize: 14, color: '#111827', padding: 0 }}
                />
            </View>

            {/* Tab bar */}
            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 }}>
                {(['all', 'subscription', 'recurring'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1, paddingVertical: 8, borderRadius: 10,
                            backgroundColor: activeTab === tab ? '#FFFFFF' : 'transparent',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{
                            fontSize: 13, fontWeight: activeTab === tab ? '700' : '500',
                            color: activeTab === tab ? '#111827' : '#9CA3AF',
                            textTransform: 'capitalize',
                        }}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            >
                {filtered.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <Repeat size={48} color="#E5E7EB" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#9CA3AF', marginTop: 16 }}>
                            {charges.length === 0 ? 'No recurring charges detected' : 'No results found'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#D1D5DB', marginTop: 6, textAlign: 'center' }}>
                            {charges.length === 0
                                ? 'Add more transactions and this scanner will detect recurring patterns automatically.'
                                : 'Try a different search term or tab.'}
                        </Text>
                    </View>
                ) : (
                    filtered.map((c) => {
                        const isKept = keepSet.has(c.normalised);
                        const isCancelled = cancelSet.has(c.normalised);
                        const typeInfo = getTypeLabel(c.type);
                        const catIcon = CATEGORY_ICONS[c.category] ?? DEFAULT_ICON;
                        const catBg = CATEGORY_BG[c.category] ?? '#F9FAFB';

                        return (
                            <View
                                key={c.normalised}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 18,
                                    padding: 16,
                                    marginBottom: 10,
                                    borderWidth: 1.5,
                                    borderColor: isCancelled ? '#FECACA' : isKept ? '#BBF7D0' : '#F3F4F6',
                                    opacity: isCancelled ? 0.65 : 1,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {/* Left: icon + info */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{
                                            width: 42, height: 42, borderRadius: 12,
                                            backgroundColor: catBg,
                                            alignItems: 'center', justifyContent: 'center', marginRight: 12,
                                        }}>
                                            {catIcon}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                                                {c.merchant}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                                {/* Type pill */}
                                                <View style={{ backgroundColor: typeInfo.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: typeInfo.color }}>
                                                        {typeInfo.label}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                                                    every ~{c.avgIntervalDays}d · {c.totalCount}x seen
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Right: amount */}
                                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                                            ₹{c.estimatedMonthly.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>/month est.</Text>
                                    </View>
                                </View>

                                {/* Last charged */}
                                <Text style={{ fontSize: 11, color: '#D1D5DB', marginTop: 8 }}>
                                    Last: {format(parseISO(c.lastDate), 'd MMM yyyy')} · Avg ₹{c.avgAmount.toLocaleString('en-IN')} per charge
                                </Text>

                                {/* Keep / Cancel actions */}
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                    <TouchableOpacity
                                        onPress={() => toggleKeep(c.normalised)}
                                        style={{
                                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                            paddingVertical: 8, borderRadius: 12, gap: 6,
                                            backgroundColor: isKept ? '#ECFDF5' : '#F9FAFB',
                                            borderWidth: 1.5,
                                            borderColor: isKept ? '#10B981' : '#E5E7EB',
                                        }}
                                    >
                                        <Check size={14} color={isKept ? '#10B981' : '#9CA3AF'} />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isKept ? '#10B981' : '#9CA3AF' }}>Keep</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => toggleCancel(c.normalised)}
                                        style={{
                                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                            paddingVertical: 8, borderRadius: 12, gap: 6,
                                            backgroundColor: isCancelled ? '#FEF2F2' : '#F9FAFB',
                                            borderWidth: 1.5,
                                            borderColor: isCancelled ? '#EF4444' : '#E5E7EB',
                                        }}
                                    >
                                        <XIcon size={14} color={isCancelled ? '#EF4444' : '#9CA3AF'} />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isCancelled ? '#EF4444' : '#9CA3AF' }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Disclaimer */}
                {charges.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' }}>
                        <AlertCircle size={13} color="#9CA3AF" style={{ marginTop: 1 }} />
                        <Text style={{ flex: 1, fontSize: 11, color: '#9CA3AF', lineHeight: 16 }}>
                            Charges are detected from your FinSight transaction history. Amounts are estimates based on averages. "Cancel" marks only track your intent - no actual subscriptions are cancelled in this app.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SubscriptionTrackerScreen;
