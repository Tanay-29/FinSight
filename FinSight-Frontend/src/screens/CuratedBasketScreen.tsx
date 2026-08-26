/**
 * CuratedBasketScreen
 *
 * Teaches how a diversified portfolio is put together, and lets the learner
 * run the compounding maths on a monthly contribution they choose.
 *
 * This screen deliberately names no securities and makes no claim to be
 * personalised. It previously read a hardcoded `mockReduxState` and told every
 * user "based on your moderate profile and 15-year runway, here is your
 * mathematically optimized portfolio", which was untrue three times over: the
 * risk profile and the horizon were never collected anywhere in the app, and
 * the allocation came from a switch statement with a single branch. It also
 * listed specific stocks and bonds, which is the personalised investment
 * advice FinSight states it does not give.
 *
 * What is left is real: textbook asset-class weights presented as an example,
 * and a future-value calculation over inputs the learner sets.
 */
import React, { useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, ViewStyle,
} from 'react-native';
import {
    TrendingUp, ShieldCheck, Coins, ChevronDown, ChevronUp, Info, GraduationCap,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as haptics from '../utils/haptics';
import { futureValueOfSeries, totalContributed } from '../utils/projections';

/**
 * A conventional three-way split, the kind any introductory text on asset
 * allocation will show. It is here to explain what each asset class does, not
 * to tell anyone what to hold, so the weights are fixed and labelled as an
 * example rather than derived from the learner.
 */
const ASSET_CLASSES = [
    {
        name: 'Equity funds',
        split: 60,
        color: '#6366F1',
        icon: TrendingUp,
        role: 'Growth',
        what: 'Pooled ownership in companies. Over long periods this is where most of the growth comes from.',
        tradeoff: 'Also where the largest falls happen. A 30% drawdown in a bad year is normal, not a malfunction.',
    },
    {
        name: 'Debt funds',
        split: 30,
        color: '#10B981',
        icon: ShieldCheck,
        role: 'Stability',
        what: 'Lending rather than owning. Returns come from interest, and move far less than equity.',
        tradeoff: 'Lower long-run returns. Its job is to make the equity portion survivable, not to earn.',
    },
    {
        name: 'Gold',
        split: 10,
        color: '#F59E0B',
        icon: Coins,
        role: 'Hedge',
        what: 'Tends to hold value when a currency weakens or markets are under stress.',
        tradeoff: 'Produces no income. A large allocation is a drag over long horizons.',
    },
];

const YEAR_OPTIONS = [5, 10, 15, 20, 25];
const RATE_OPTIONS = [8, 10, 12];
const SIP_STEP = 500;
const SIP_MIN = 500;

const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
};

export const CuratedBasketScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [monthlySip, setMonthlySip] = useState(2000);
    const [years, setYears] = useState(10);
    const [ratePct, setRatePct] = useState(10);

    // Shared with the Time Machine and the leak projection. This screen used to
    // carry its own copy of the same formula.
    const projection = useMemo(() => {
        const fv = futureValueOfSeries(monthlySip, 'monthly', ratePct, years);
        const invested = totalContributed(monthlySip, 'monthly', years);
        return { fv, invested, gained: fv - invested };
    }, [monthlySip, years, ratePct]);

    const adjustSip = (delta: number) => {
        haptics.select();
        setMonthlySip((v) => Math.max(SIP_MIN, v + delta));
    };

    const Chip = ({
        label, active, onPress,
    }: { label: string; active: boolean; onPress: () => void }) => (
        <TouchableOpacity
            onPress={() => { haptics.select(); onPress(); }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`px-4 py-2 rounded-full border ${active
                ? 'bg-white border-white'
                : 'bg-indigo-700 border-indigo-500'}`}
        >
            <Text className={`text-sm font-semibold ${active ? 'text-indigo-700' : 'text-indigo-100'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView
            className="flex-1 bg-surface-secondary"
            // On web, pin the view to the viewport so it behaves like a phone
            // screen. '100vh' is a real CSS value that react-native-web passes
            // through, but React Native's own style types do not model it.
            style={
                Platform.OS === 'web'
                    ? ({ height: '100vh', overflow: 'hidden' } as unknown as ViewStyle)
                    : { flex: 1 }
            }
        >
            <ScrollView
                className="flex-1 px-6 pt-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <View className="flex-row items-center mb-2">
                    <GraduationCap size={16} color="#6366F1" />
                    <Text className="text-sm font-bold text-indigo-500 uppercase tracking-widest ml-2">
                        Lesson
                    </Text>
                </View>
                <Text className="text-3xl font-bold text-text-primary mb-2">
                    How a diversified portfolio works
                </Text>
                <Text className="text-text-secondary text-base leading-6 mb-6">
                    Three asset classes doing three different jobs. The split below is a
                    common textbook example. It is not a recommendation, and it is not
                    based on your account.
                </Text>

                {ASSET_CLASSES.map((item, index) => {
                    const Icon = item.icon;
                    const open = expandedIndex === index;
                    return (
                        <TouchableOpacity
                            key={item.name}
                            activeOpacity={0.85}
                            onPress={() => {
                                haptics.select();
                                setExpandedIndex(open ? null : index);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.name}, ${item.split} percent, ${open ? 'collapse' : 'expand'}`}
                            className="bg-white rounded-2xl p-4 mb-3 border border-border"
                        >
                            <View className="flex-row items-center">
                                <View
                                    className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                                    style={{ backgroundColor: item.color + '20' }}
                                >
                                    <Icon size={20} color={item.color} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-text-primary">{item.name}</Text>
                                    <Text className="text-sm text-text-secondary mt-0.5">{item.role}</Text>
                                </View>
                                <Text className="text-xl font-black mr-2" style={{ color: item.color }}>
                                    {item.split}%
                                </Text>
                                {open
                                    ? <ChevronUp size={18} color="#9CA3AF" />
                                    : <ChevronDown size={18} color="#9CA3AF" />}
                            </View>

                            <View className="h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
                                <View
                                    className="h-2 rounded-full"
                                    style={{ width: `${item.split}%`, backgroundColor: item.color }}
                                />
                            </View>

                            {open && (
                                <View className="mt-4 pt-3 border-t border-border">
                                    <Text className="text-sm text-text-secondary leading-5 mb-3">
                                        {item.what}
                                    </Text>
                                    <Text className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">
                                        The trade-off
                                    </Text>
                                    <Text className="text-sm text-text-secondary leading-5">
                                        {item.tradeoff}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* Compounding, over inputs the learner controls. */}
                <View className="bg-indigo-600 rounded-3xl p-6 mt-4">
                    <Text className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">
                        What monthly investing does over time
                    </Text>
                    <Text className="text-white text-4xl font-black">
                        {formatCurrency(projection.fv)}
                    </Text>
                    <Text className="text-indigo-200 text-xs mt-1 mb-5">
                        {formatCurrency(monthlySip)} a month for {years} years at {ratePct}% a year
                    </Text>

                    <View className="flex-row mb-5">
                        <View className="flex-1">
                            <Text className="text-indigo-200 text-xs mb-1">You put in</Text>
                            <Text className="text-white font-bold text-base">
                                {formatCurrency(projection.invested)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-indigo-200 text-xs mb-1">Growth</Text>
                            <Text className="text-emerald-300 font-bold text-base">
                                +{formatCurrency(projection.gained)}
                            </Text>
                        </View>
                    </View>

                    <Text className="text-indigo-200 text-xs mb-2">Monthly amount</Text>
                    <View className="flex-row items-center justify-between bg-indigo-700 rounded-2xl p-2 mb-4">
                        <TouchableOpacity
                            onPress={() => adjustSip(-SIP_STEP)}
                            disabled={monthlySip <= SIP_MIN}
                            accessibilityRole="button"
                            accessibilityLabel="Decrease monthly amount"
                            className={`w-11 h-11 rounded-xl items-center justify-center ${monthlySip <= SIP_MIN ? 'bg-indigo-800/40' : 'bg-indigo-800'}`}
                        >
                            <Text className="text-white text-xl font-bold">-</Text>
                        </TouchableOpacity>
                        <Text className="text-white font-bold text-lg">
                            ₹{monthlySip.toLocaleString('en-IN')}/mo
                        </Text>
                        <TouchableOpacity
                            onPress={() => adjustSip(SIP_STEP)}
                            accessibilityRole="button"
                            accessibilityLabel="Increase monthly amount"
                            className="w-11 h-11 rounded-xl bg-indigo-800 items-center justify-center"
                        >
                            <Text className="text-white text-xl font-bold">+</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-indigo-200 text-xs mb-2">For how long</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {YEAR_OPTIONS.map((y) => (
                            <Chip
                                key={y}
                                label={`${y}y`}
                                active={years === y}
                                onPress={() => setYears(y)}
                            />
                        ))}
                    </View>

                    <Text className="text-indigo-200 text-xs mb-2">Assumed annual return</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {RATE_OPTIONS.map((r) => (
                            <Chip
                                key={r}
                                label={`${r}%`}
                                active={ratePct === r}
                                onPress={() => setRatePct(r)}
                            />
                        ))}
                    </View>
                </View>

                <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
                    <Info size={18} color="#B45309" />
                    <Text className="text-amber-800 text-xs leading-5 ml-3 flex-1">
                        A projection, not a promise. Real returns vary year to year and can be
                        negative. The figure above assumes a steady rate and ignores inflation,
                        fees and tax. FinSight teaches concepts and does not give investment
                        advice or recommend any specific fund or stock.
                    </Text>
                </View>
            </ScrollView>

            <View className="px-6 py-4 bg-white border-t border-border">
                <TouchableOpacity
                    onPress={() => {
                        haptics.select();
                        navigation.navigate('Invest');
                    }}
                    accessibilityRole="button"
                    className="bg-indigo-600 p-4 rounded-2xl flex-row items-center justify-center"
                >
                    <Text className="text-white font-bold text-lg mr-2">
                        Practise in the simulator
                    </Text>
                    <TrendingUp color="white" size={20} />
                </TouchableOpacity>
                <Text className="text-text-tertiary text-xs text-center mt-2">
                    Simulated money, real market mechanics.
                </Text>
            </View>
        </SafeAreaView>
    );
};

export default CuratedBasketScreen;
