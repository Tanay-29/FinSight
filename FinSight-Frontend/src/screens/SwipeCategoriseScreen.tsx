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
import { PressableScale } from '../components/PressableScale';
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
import type { Category } from '../utils/categories';
import { MOTION, COLORS, TYPE, CATEGORY_COLORS, categoryTint } from '../theme/tokens';

type Props = NativeStackScreenProps<any, 'SwipeCategorise'>;

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

const CATEGORIES = [
    { key: 'dining', label: 'Dining', icon: Utensils },
    { key: 'groceries', label: 'Groceries', icon: ShoppingCart },
    { key: 'shopping', label: 'Shopping', icon: ShoppingBag },
    { key: 'transport', label: 'Transport', icon: Car },
    { key: 'utilities', label: 'Utilities', icon: Zap },
    { key: 'entertainment', label: 'Entertainment', icon: Clapperboard },
    { key: 'healthcare', label: 'Health', icon: HeartPulse },
    { key: 'housing', label: 'Rent', icon: Home },
    { key: 'investments', label: 'Investments', icon: TrendingUp },
    { key: 'education', label: 'Education', icon: GraduationCap },
    { key: 'other', label: 'Other', icon: Package },
] as const;

const categoryMeta = (key: string) =>
    CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

const SwipeCategoriseScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const transactions = useAppSelector((s) => s.transactions.items);
    const corrections = useAppSelector((s) => s.transactions.corrections);

    const [index, setIndex] = useState(0);
    const [picking, setPicking] = useState(false);
    const [confirmed, setConfirmed] = useState(0);
    const [corrected, setCorrected] = useState(0);
    const [celebrating, setCelebrating] = useState(false);

    const position = useRef(new Animated.ValueXY()).current;

    /**
     * Transactions worth reviewing.
     *
     * This filtered on nothing but the catch-all category, which made the
     * screen look broken: a categoriser that works leaves almost nothing in
     * `other`, so the deck was empty however much the user logged. The whole
     * point of the screen is checking the guesses, and a guess the parser got
     * right is exactly the one that never lands in `other`.
     *
     * So the deck is anything still uncategorised, plus anything the parser
     * assigned on its own that the user has not ruled on yet. Once they rule,
     * the merchant is in `corrections` and it stops coming back. Entries typed
     * by hand are left alone, because the user already chose.
     */
    const deck = useMemo(
        () => transactions.filter((t) => {
            if (t.type !== 'debit') return false;

            const unknown = !t.category || normaliseCategory(t.category) === 'other';
            if (unknown) return true;

            if (t.source !== 'auto') return false;
            const merchantKey = (t.merchant ?? '').trim().toLowerCase();
            return merchantKey.length > 0 && !(merchantKey in corrections);
        }),
        [transactions, corrections]
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

    /**
     * Accepting used to change nothing at all, so the card came straight back
     * the next time the screen opened. Confirming a guess is a ruling, and it
     * is written down the same way a correction is: the merchant now maps to
     * this category, which both teaches the parser and takes the card out of
     * the deck.
     */
    const accept = useCallback(() => {
        if (!current?.id) return;
        haptics.success();
        setConfirmed((c) => c + 1);
        dispatch(updateTransactionCategory({
            transactionId: current.id,
            category: normaliseCategory(current.category),
            merchant: current.merchant ?? '',
        }));
        Animated.timing(position, {
            toValue: { x: SCREEN_W, y: 0 }, duration: MOTION.quick, useNativeDriver: false,
        }).start(advance);
    }, [advance, position, current, dispatch]);

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
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 py-3.5 bg-surface-primary border-b border-border flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    className="w-9 h-9 rounded-full bg-surface-tertiary items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#423C35" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-inter-bold text-text-primary">Tidy Up</Text>
                    <Text className="text-xs text-text-tertiary font-inter">
                        {done ? 'All done' : `${deck.length - index} left to check`}
                    </Text>
                </View>
            </View>

            {deck.length === 0 ? (
                <View className="flex-1 items-center justify-center px-10">
                    <Sparkles size={36} color={COLORS.border.strong} />
                    <Text className="text-base font-inter-bold text-text-primary mt-4 text-center">
                        Nothing to tidy
                    </Text>
                    <Text className="text-sm text-text-secondary mt-2 text-center leading-5 font-inter">
                        Every transaction already has a category you chose. Come back after
                        importing a few more.
                    </Text>
                </View>
            ) : done ? (
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-20 h-20 rounded-full bg-profit-bg items-center justify-center mb-5">
                        <Check size={38} color={COLORS.semantic.profit} />
                    </View>
                    <Text style={TYPE.title} className="text-text-primary text-center">Deck cleared</Text>
                    <Text className="text-sm text-text-secondary mt-2 text-center leading-5 font-inter">
                        {confirmed} confirmed, {corrected} corrected. Your spending charts just
                        got more accurate.
                    </Text>
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.goBack(); }}
                        accessibilityRole="button"
                        className="bg-brand-primary-dark rounded-pill h-[52px] justify-center px-10 mt-8"
                    >
                        <Text className="text-white font-inter-bold text-base">Done</Text>
                    </PressableScale>
                </View>
            ) : picking ? (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text className="text-lg font-inter-bold text-text-primary mb-1">
                        Where does this belong?
                    </Text>
                    <Text className="text-sm text-text-secondary mb-5 font-inter">
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
                                    className="bg-surface-primary border border-border-strong rounded-2xl px-4 py-3 flex-row items-center"
                                >
                                    <CIcon size={16} color={CATEGORY_COLORS[c.key as Category]} strokeWidth={1.8} />
                                    <Text className="text-sm font-inter-semibold text-text-secondary ml-2">{c.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity
                        onPress={() => { haptics.tap(); setPicking(false); }}
                        accessibilityRole="button"
                        className="mt-6 items-center py-3"
                    >
                        <Text className="text-sm text-text-tertiary font-inter">Cancel</Text>
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
                        className="bg-surface-primary rounded-3xl border border-border p-6"
                    >
                        {/* Swipe hints */}
                        <Animated.View style={{ opacity: acceptOpacity }} className="absolute top-5 left-5 z-10">
                            <View className="border-2 border-profit rounded-xl px-3 py-1">
                                <Text className="text-profit font-inter-bold text-sm">CORRECT</Text>
                            </View>
                        </Animated.View>
                        <Animated.View style={{ opacity: rejectOpacity }} className="absolute top-5 right-5 z-10">
                            <View className="border-2 border-loss rounded-xl px-3 py-1">
                                <Text className="text-loss font-inter-bold text-sm">CHANGE</Text>
                            </View>
                        </Animated.View>

                        <View className="items-center pt-6">
                            <Text className="text-3xl font-inter-bold text-text-primary">
                                ₹{(current?.amount ?? 0).toLocaleString('en-IN')}
                            </Text>
                            <Text className="text-base text-text-secondary mt-1.5 font-inter">
                                {current?.merchant || 'Unknown merchant'}
                            </Text>
                            <Text className="text-xs text-text-tertiary mt-0.5 font-inter">{current?.date?.slice(0, 10)}</Text>

                            <View className="h-px bg-surface-tertiary w-full my-5" />

                            <Text className="text-xs text-text-tertiary uppercase tracking-widest mb-2 font-inter">
                                We think this is
                            </Text>
                            <View
                                className="flex-row items-center rounded-2xl px-4 py-2.5"
                                style={{ backgroundColor: meta ? categoryTint(meta.key as Category) : COLORS.surface.tertiary }}
                            >
                                <Icon size={18} color={meta ? CATEGORY_COLORS[meta.key as Category] : COLORS.text.tertiary} strokeWidth={1.8} />
                                <Text className="text-base font-inter-bold ml-2" style={{ color: meta ? CATEGORY_COLORS[meta.key as Category] : COLORS.text.tertiary }}>
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
                            className="w-16 h-16 rounded-full bg-surface-primary border-2 border-loss-bg items-center justify-center"
                        >
                            <XIcon size={26} color={COLORS.semantic.loss} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={accept}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Category is correct"
                            className="w-16 h-16 rounded-full bg-surface-primary border-2 border-profit-bg items-center justify-center"
                        >
                            <Check size={26} color={COLORS.semantic.profit} />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-xs text-text-tertiary mt-5 text-center font-inter">
                        Swipe right if it is right, left to change it
                    </Text>
                </View>
            )}

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default SwipeCategoriseScreen;
