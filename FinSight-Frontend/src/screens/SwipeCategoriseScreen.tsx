/**
 * SwipeCategoriseScreen
 *
 * A deck of transactions the categoriser was unsure about. Swipe right to
 * accept its guess, swipe left to correct it, and the deck runs out fast.
 *
 * This is a game that fixes a real defect. The keyword categoriser mislabels
 * things (grocery orders from a food-delivery brand land in dining, and short
 * keywords match inside unrelated words), and until now nothing captured the
 * correction. Every fix here both updates the transaction and records the
 * merchant-to-category mapping, which is the labelled data the categoriser
 * would need to be measured or improved.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, Animated, PanResponder,
    Dimensions, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, Check, X as XIcon, Sparkles, Utensils, ShoppingBag,
    Car, ShoppingCart, Zap, Clapperboard, HeartPulse, Home,
    TrendingUp, GraduationCap, Package,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateTransactionCategory } from '../store/slices/transactionsSlice';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';
import { normaliseCategory } from '../utils/categories';

type Props = NativeStackScreenProps<any, 'SwipeCategorise'>;

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

const CATEGORIES = [
    { key: 'dining', label: 'Dining', icon: Utensils, color: '#F97316' },
    { key: 'groceries', label: 'Groceries', icon: ShoppingCart, color: '#10B981' },
    { key: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#EC4899' },
    { key: 'transport', label: 'Transport', icon: Car, color: '#3B82F6' },
    { key: 'utilities', label: 'Utilities', icon: Zap, color: '#EAB308' },
    { key: 'entertainment', label: 'Entertainment', icon: Clapperboard, color: '#8B5CF6' },
    { key: 'healthcare', label: 'Health', icon: HeartPulse, color: '#14B8A6' },
    { key: 'housing', label: 'Rent', icon: Home, color: '#6366F1' },
    { key: 'investments', label: 'Investments', icon: TrendingUp, color: '#10B981' },
    { key: 'education', label: 'Education', icon: GraduationCap, color: '#3B82F6' },
    { key: 'other', label: 'Other', icon: Package, color: '#9CA3AF' },
] as const;

const categoryMeta = (key: string) =>
    CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

const SwipeCategoriseScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const transactions = useAppSelector((s) => s.transactions.items);

    const [index, setIndex] = useState(0);
    const [picking, setPicking] = useState(false);
    const [confirmed, setConfirmed] = useState(0);
    const [corrected, setCorrected] = useState(0);
    const [celebrating, setCelebrating] = useState(false);

    const position = useRef(new Animated.ValueXY()).current;

    /**
     * Transactions worth reviewing: anything the categoriser dumped into a
     * catch-all, plus anything auto-detected, which is where the keyword bugs
     * show up. Manual entries are left alone because the user already chose.
     */
    const deck = useMemo(
        () => transactions.filter((t) =>
            t.type === 'debit' &&
            (!t.category ||
                normaliseCategory(t.category) === 'other' ||
                t.source === 'auto')
        ),
        [transactions]
    );

    const current = deck[index];
    const done = index >= deck.length;

    const advance = useCallback(() => {
        position.setValue({ x: 0, y: 0 });
        setPicking(false);
        setIndex((i) => {
            const next = i + 1;
            if (next >= deck.length && deck.length > 0) {
                haptics.celebrate();
                setCelebrating(true);
            }
            return next;
        });
    }, [deck.length, position]);

    const accept = useCallback(() => {
        haptics.success();
        setConfirmed((c) => c + 1);
        Animated.timing(position, {
            toValue: { x: SCREEN_W, y: 0 }, duration: 220, useNativeDriver: false,
        }).start(advance);
    }, [advance, position]);

    const openPicker = useCallback(() => {
        haptics.tap();
        Animated.spring(position, {
            toValue: { x: 0, y: 0 }, useNativeDriver: false,
        }).start();
        setPicking(true);
    }, [position]);

    const applyCategory = (category: string) => {
        if (!current?.id) return;
        haptics.commit();
        setCorrected((c) => c + 1);
        dispatch(updateTransactionCategory({
            transactionId: current.id,
            category,
            merchant: current.merchant ?? '',
        }));
        advance();
    };

    const panResponder = useMemo(
        () => PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
            onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy * 0.2 }),
            onPanResponderRelease: (_, g) => {
                if (g.dx > SWIPE_THRESHOLD) accept();
                else if (g.dx < -SWIPE_THRESHOLD) openPicker();
                else {
                    Animated.spring(position, {
                        toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false,
                    }).start();
                }
            },
        }),
        [accept, openPicker, position]
    );

    const rotate = position.x.interpolate({
        inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
        outputRange: ['-8deg', '0deg', '8deg'],
        extrapolate: 'clamp',
    });
    const acceptOpacity = position.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp',
    });
    const rejectOpacity = position.x.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp',
    });

    const meta = current ? categoryMeta(current.category) : null;
    const Icon = meta?.icon ?? Package;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 py-3.5 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-extrabold text-gray-900">Tidy Up</Text>
                    <Text className="text-xs text-gray-400">
                        {done ? 'All done' : `${deck.length - index} left to check`}
                    </Text>
                </View>
            </View>

            {deck.length === 0 ? (
                <View className="flex-1 items-center justify-center px-10">
                    <Sparkles size={36} color="#D1D5DB" />
                    <Text className="text-base font-bold text-gray-900 mt-4 text-center">
                        Nothing to tidy
                    </Text>
                    <Text className="text-sm text-gray-500 mt-2 text-center leading-5">
                        Every transaction already has a category you chose. Come back after
                        importing a few more.
                    </Text>
                </View>
            ) : done ? (
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-20 h-20 rounded-full bg-emerald-50 items-center justify-center mb-5">
                        <Check size={38} color="#10B981" />
                    </View>
                    <Text className="text-2xl font-extrabold text-gray-900 text-center">Deck cleared</Text>
                    <Text className="text-sm text-gray-500 mt-2 text-center leading-5">
                        {confirmed} confirmed, {corrected} corrected. Your spending charts just
                        got more accurate.
                    </Text>
                    <TouchableOpacity
                        onPress={() => { haptics.tap(); navigation.goBack(); }}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        className="bg-indigo-600 rounded-2xl py-4 px-10 mt-8"
                    >
                        <Text className="text-white font-bold text-base">Done</Text>
                    </TouchableOpacity>
                </View>
            ) : picking ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text className="text-lg font-bold text-gray-900 mb-1">
                        Where does this belong?
                    </Text>
                    <Text className="text-sm text-gray-500 mb-5">
                        {current?.merchant || 'Unknown merchant'}, ₹{(current?.amount ?? 0).toLocaleString('en-IN')}
                    </Text>
                    <View className="flex-row flex-wrap gap-2.5">
                        {CATEGORIES.map((c) => {
                            const CIcon = c.icon;
                            return (
                                <TouchableOpacity
                                    key={c.key}
                                    onPress={() => applyCategory(c.key)}
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel={c.label}
                                    className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center"
                                >
                                    <CIcon size={16} color={c.color} />
                                    <Text className="text-sm font-semibold text-gray-700 ml-2">{c.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity
                        onPress={() => { haptics.tap(); setPicking(false); }}
                        accessibilityRole="button"
                        className="mt-6 items-center py-3"
                    >
                        <Text className="text-sm text-gray-400">Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <View className="flex-1 items-center justify-center px-6">
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={{
                            width: '100%',
                            transform: [
                                { translateX: position.x },
                                { translateY: position.y },
                                { rotate },
                            ],
                        }}
                        className="bg-white rounded-3xl border border-gray-100 p-6"
                    >
                        {/* Swipe hints */}
                        <Animated.View style={{ opacity: acceptOpacity }} className="absolute top-5 left-5 z-10">
                            <View className="border-2 border-emerald-500 rounded-xl px-3 py-1">
                                <Text className="text-emerald-500 font-extrabold text-sm">CORRECT</Text>
                            </View>
                        </Animated.View>
                        <Animated.View style={{ opacity: rejectOpacity }} className="absolute top-5 right-5 z-10">
                            <View className="border-2 border-red-500 rounded-xl px-3 py-1">
                                <Text className="text-red-500 font-extrabold text-sm">CHANGE</Text>
                            </View>
                        </Animated.View>

                        <View className="items-center pt-6">
                            <Text className="text-3xl font-extrabold text-gray-900">
                                ₹{(current?.amount ?? 0).toLocaleString('en-IN')}
                            </Text>
                            <Text className="text-base text-gray-600 mt-1.5">
                                {current?.merchant || 'Unknown merchant'}
                            </Text>
                            <Text className="text-xs text-gray-400 mt-0.5">{current?.date?.slice(0, 10)}</Text>

                            <View className="h-px bg-gray-100 w-full my-5" />

                            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                                We think this is
                            </Text>
                            <View
                                className="flex-row items-center rounded-2xl px-4 py-2.5"
                                style={{ backgroundColor: `${meta?.color ?? '#9CA3AF'}1A` }}
                            >
                                <Icon size={18} color={meta?.color} />
                                <Text className="text-base font-bold ml-2" style={{ color: meta?.color }}>
                                    {meta?.label}
                                </Text>
                            </View>
                        </View>
                    </Animated.View>

                    <View className="flex-row gap-4 mt-8">
                        <TouchableOpacity
                            onPress={openPicker}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Change category"
                            className="w-16 h-16 rounded-full bg-white border-2 border-red-200 items-center justify-center"
                        >
                            <XIcon size={26} color="#EF4444" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={accept}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Category is correct"
                            className="w-16 h-16 rounded-full bg-white border-2 border-emerald-200 items-center justify-center"
                        >
                            <Check size={26} color="#10B981" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-xs text-gray-400 mt-5 text-center">
                        Swipe right if it is right, left to change it
                    </Text>
                </View>
            )}

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default SwipeCategoriseScreen;
