/**
 * WrappedScreen
 *
 * A swipeable recap of the month, in the story format people already know.
 * Every figure is computed on the device from transactions the user already
 * has, and the shareable card is rendered locally: nothing is uploaded.
 *
 * The last card is the shareable one, deliberately. It carries totals and no
 * merchant names, so sharing it does not broadcast where somebody shops.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Dimensions,
    StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    X as XIcon, ChevronRight, ChevronLeft, Share2,
    TrendingUp, TrendingDown, Store, CalendarOff, Receipt, Wallet,
} from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import { computeWrapped } from '../utils/wrapped';
import { formatCompactINR } from '../utils/projections';
import { shareView } from '../services/shareService';
import AnimatedNumber from '../components/AnimatedNumber';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'Wrapped'>;

const { width: SCREEN_W } = Dimensions.get('window');

const CARD_BACKGROUNDS = [
    '#4338CA', '#0F766E', '#B45309', '#9D174D', '#5B21B6', '#1E40AF',
];

const WrappedScreen: React.FC<Props> = ({ navigation }) => {
    const transactions = useAppSelector((s) => s.transactions.items);
    const { profile } = useAppSelector((s) => s.auth);

    const [page, setPage] = useState(0);
    const [sharing, setSharing] = useState(false);
    const [celebrating, setCelebrating] = useState(false);
    const shareRef = useRef<View>(null);

    const period = new Date().toISOString().slice(0, 7);
    const label = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const stats = useMemo(
        () => computeWrapped(transactions as any, period, label),
        [transactions, period, label]
    );

    /** Only build cards we actually have data for. */
    const cards = useMemo(() => {
        if (!stats.hasData) return [];
        const list: { key: string; render: () => React.ReactNode }[] = [];

        list.push({
            key: 'total',
            render: () => (
                <>
                    <Receipt size={40} color="rgba(255,255,255,0.6)" />
                    <Text className="text-white/70 text-base mt-6">In {label} you spent</Text>
                    <AnimatedNumber
                        value={stats.totalSpent}
                        format={formatCompactINR}
                        className="text-white text-6xl font-extrabold mt-2"
                    />
                    <Text className="text-white/70 text-base mt-4 text-center">
                        across {stats.transactionCount} transaction{stats.transactionCount === 1 ? '' : 's'}
                    </Text>
                </>
            ),
        });

        if (stats.topCategories.length > 0) {
            const top = stats.topCategories[0];
            list.push({
                key: 'category',
                render: () => (
                    <>
                        <Wallet size={40} color="rgba(255,255,255,0.6)" />
                        <Text className="text-white/70 text-base mt-6">Your biggest category was</Text>
                        <Text className="text-white text-5xl font-extrabold mt-2 capitalize text-center">
                            {top.category}
                        </Text>
                        <Text className="text-white/90 text-2xl font-bold mt-4">
                            {formatCompactINR(top.total)}
                        </Text>
                        <Text className="text-white/70 text-base mt-1">
                            {top.share}% of everything you spent
                        </Text>
                    </>
                ),
            });
        }

        if (stats.topMerchants.length > 0) {
            const top = stats.topMerchants[0];
            list.push({
                key: 'merchant',
                render: () => (
                    <>
                        <Store size={40} color="rgba(255,255,255,0.6)" />
                        <Text className="text-white/70 text-base mt-6">You kept going back to</Text>
                        <Text className="text-white text-5xl font-extrabold mt-2 text-center">
                            {top.merchant}
                        </Text>
                        <Text className="text-white/90 text-xl font-bold mt-4">
                            {top.visits} time{top.visits === 1 ? '' : 's'}
                        </Text>
                        <Text className="text-white/70 text-base mt-1">
                            {formatCompactINR(top.total)} in total
                        </Text>
                    </>
                ),
            });
        }

        if (stats.noSpendDays > 0) {
            list.push({
                key: 'nospend',
                render: () => (
                    <>
                        <CalendarOff size={40} color="rgba(255,255,255,0.6)" />
                        <Text className="text-white text-6xl font-extrabold mt-6">
                            {stats.noSpendDays}
                        </Text>
                        <Text className="text-white/90 text-2xl font-bold mt-2">no-spend days</Text>
                        <Text className="text-white/70 text-base mt-4 text-center px-4">
                            {stats.noSpendDays > 15
                                ? 'That is genuine restraint.'
                                : 'Every one of those is money that stayed yours.'}
                        </Text>
                    </>
                ),
            });
        }

        if (stats.changeVsPrevious !== null) {
            // Captured into a local so the null-narrowing survives the closure.
            const change = stats.changeVsPrevious;
            const up = change > 0;
            list.push({
                key: 'change',
                render: () => (
                    <>
                        {up
                            ? <TrendingUp size={40} color="rgba(255,255,255,0.6)" />
                            : <TrendingDown size={40} color="rgba(255,255,255,0.6)" />}
                        <Text className="text-white/70 text-base mt-6">Against last month you spent</Text>
                        <Text className="text-white text-6xl font-extrabold mt-2">
                            {Math.abs(change)}%
                        </Text>
                        <Text className="text-white/90 text-2xl font-bold mt-2">
                            {up ? 'more' : 'less'}
                        </Text>
                        <Text className="text-white/70 text-base mt-4 text-center px-4">
                            {up
                                ? 'Worth knowing which category moved.'
                                : 'That is real progress, not luck.'}
                        </Text>
                    </>
                ),
            });
        }

        // Shareable summary. Totals only, no merchant names.
        list.push({
            key: 'share',
            render: () => (
                <View ref={shareRef} collapsable={false} className="items-center w-full py-6 px-4"
                    style={{ backgroundColor: CARD_BACKGROUNDS[5] }}>
                    <Text className="text-white/60 text-xs font-bold uppercase tracking-widest">
                        FinSight Wrapped
                    </Text>
                    <Text className="text-white text-2xl font-extrabold mt-1">{label}</Text>

                    <View className="flex-row mt-8 w-full">
                        <View className="flex-1 items-center">
                            <Text className="text-white text-3xl font-extrabold">
                                {formatCompactINR(stats.totalSpent)}
                            </Text>
                            <Text className="text-white/60 text-xs mt-1">spent</Text>
                        </View>
                        <View className="flex-1 items-center">
                            <Text className="text-white text-3xl font-extrabold">
                                {stats.transactionCount}
                            </Text>
                            <Text className="text-white/60 text-xs mt-1">transactions</Text>
                        </View>
                    </View>

                    <View className="flex-row mt-6 w-full">
                        <View className="flex-1 items-center">
                            <Text className="text-white text-3xl font-extrabold">
                                {stats.noSpendDays}
                            </Text>
                            <Text className="text-white/60 text-xs mt-1">no-spend days</Text>
                        </View>
                        <View className="flex-1 items-center">
                            <Text className="text-white text-3xl font-extrabold">
                                {profile?.streak ?? 0}
                            </Text>
                            <Text className="text-white/60 text-xs mt-1">day streak</Text>
                        </View>
                    </View>

                    {stats.topCategories.length > 0 && (
                        <Text className="text-white/80 text-sm mt-8 capitalize">
                            Top category: {stats.topCategories[0].category}
                        </Text>
                    )}
                </View>
            ),
        });

        return list;
    }, [stats, label, profile?.streak]);

    const isLast = page === cards.length - 1;

    const go = (delta: number) => {
        const next = page + delta;
        if (next < 0 || next >= cards.length) return;
        haptics.tap();
        setPage(next);
        if (next === cards.length - 1) {
            haptics.celebrate();
            setCelebrating(true);
        }
    };

    const handleShare = async () => {
        if (sharing) return;
        setSharing(true);
        try {
            haptics.commit();
            const result = await shareView(shareRef, 'Share your FinSight Wrapped');
            if (!result.shared) {
                Alert.alert('Sharing unavailable', 'This device has no share sheet, so the card was not sent anywhere.');
            }
        } catch (error: any) {
            Alert.alert('Could not create the image', error?.message || 'Please try again.');
        } finally {
            setSharing(false);
        }
    };

    if (!stats.hasData) {
        return (
            <SafeAreaView className="flex-1 bg-gray-900" edges={['top', 'bottom']}>
                <StatusBar barStyle="light-content" />
                <View className="flex-1 items-center justify-center px-10">
                    <Receipt size={40} color="#4B5563" />
                    <Text className="text-white text-xl font-bold mt-5 text-center">
                        Nothing to wrap up yet
                    </Text>
                    <Text className="text-gray-400 text-sm mt-2 text-center leading-5">
                        Log some transactions this month and your recap will build itself.
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        accessibilityRole="button"
                        className="bg-white/10 rounded-2xl px-8 py-3.5 mt-8"
                    >
                        <Text className="text-white font-bold">Close</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className="flex-1"
            edges={['top', 'bottom']}
            style={{ backgroundColor: CARD_BACKGROUNDS[page % CARD_BACKGROUNDS.length] }}
        >
            <StatusBar barStyle="light-content" />

            {/* Progress pips */}
            <View className="flex-row px-4 pt-3 gap-1.5">
                {cards.map((c, i) => (
                    <View
                        key={c.key}
                        className="flex-1 h-1 rounded-full"
                        style={{ backgroundColor: i <= page ? '#FFFFFF' : 'rgba(255,255,255,0.25)' }}
                    />
                ))}
            </View>

            <View className="flex-row justify-end px-4 pt-2">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    className="w-9 h-9 rounded-full bg-white/15 items-center justify-center"
                >
                    <XIcon size={18} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
            >
                {cards[page]?.render()}
            </ScrollView>

            {/* Controls */}
            <View className="px-6 pb-4">
                {isLast && (
                    <TouchableOpacity
                        onPress={handleShare}
                        disabled={sharing}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        className="bg-white rounded-2xl py-4 flex-row items-center justify-center mb-3"
                    >
                        {sharing
                            ? <ActivityIndicator size="small" color="#4338CA" />
                            : <Share2 size={18} color="#4338CA" />}
                        <Text className="text-indigo-700 font-bold text-base ml-2">
                            {sharing ? 'Preparing' : 'Share this card'}
                        </Text>
                    </TouchableOpacity>
                )}

                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={() => go(-1)}
                        disabled={page === 0}
                        accessibilityRole="button"
                        accessibilityLabel="Previous"
                        className="w-12 h-12 rounded-full bg-white/15 items-center justify-center"
                        style={{ opacity: page === 0 ? 0.3 : 1 }}
                    >
                        <ChevronLeft size={22} color="white" />
                    </TouchableOpacity>

                    <Text className="text-white/60 text-xs">
                        {page + 1} of {cards.length}
                    </Text>

                    <TouchableOpacity
                        onPress={() => go(1)}
                        disabled={isLast}
                        accessibilityRole="button"
                        accessibilityLabel="Next"
                        className="w-12 h-12 rounded-full bg-white/15 items-center justify-center"
                        style={{ opacity: isLast ? 0.3 : 1 }}
                    >
                        <ChevronRight size={22} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default WrappedScreen;
