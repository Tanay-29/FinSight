/**
 * TimeMachineScreen
 *
 * Takes a habit the learner actually has and shows what it would be worth
 * invested instead. The point is not to shame anyone out of coffee: it is to
 * make compounding legible, because a number like "12% a year" means nothing
 * until you see it act on twenty years.
 *
 * All maths lives in utils/projections. Figures are nominal, before inflation
 * and tax, and the screen says so.
 */
import React, { useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { ArrowLeft, TrendingUp, Info } from 'lucide-react-native';
import {
    Frequency, FREQUENCY_LABELS, futureValueOfSeries, totalContributed,
    projectionSeries, formatCompactINR, toMonthly,
} from '../utils/projections';
import AnimatedNumber from '../components/AnimatedNumber';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'TimeMachine'>;

const PRESETS: { label: string; amount: number; frequency: Frequency }[] = [
    { label: 'Daily coffee', amount: 200, frequency: 'daily' },
    { label: 'Food delivery', amount: 400, frequency: 'weekly' },
    { label: 'Streaming stack', amount: 800, frequency: 'monthly' },
    { label: 'Weekend out', amount: 1500, frequency: 'weekly' },
];

const YEAR_OPTIONS = [5, 10, 20, 30];
const RATE_OPTIONS = [8, 12, 15];

const CHART_W = 300;
const CHART_H = 150;

const TimeMachineScreen: React.FC<Props> = ({ navigation }) => {
    const [amount, setAmount] = useState('200');
    const [frequency, setFrequency] = useState<Frequency>('daily');
    const [years, setYears] = useState(20);
    const [rate, setRate] = useState(12);

    const parsed = Math.max(0, parseFloat(amount) || 0);

    const { futureValue, contributed, growth, series } = useMemo(() => {
        const fv = futureValueOfSeries(parsed, frequency, rate, years);
        const put = totalContributed(parsed, frequency, years);
        return {
            futureValue: fv,
            contributed: put,
            growth: fv - put,
            series: projectionSeries(parsed, frequency, rate, years),
        };
    }, [parsed, frequency, rate, years]);

    // Build the two chart paths in one pass over the series.
    const { valuePath, contributedPath } = useMemo(() => {
        const max = series[series.length - 1]?.value || 1;
        const x = (i: number) => (i / Math.max(series.length - 1, 1)) * CHART_W;
        const y = (v: number) => CHART_H - (v / max) * CHART_H;

        const toPath = (pick: (p: typeof series[number]) => number) =>
            series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join(' ');

        return {
            valuePath: toPath((p) => p.value),
            contributedPath: toPath((p) => p.contributed),
        };
    }, [series]);

    const applyPreset = (preset: typeof PRESETS[number]) => {
        haptics.tap();
        setAmount(String(preset.amount));
        setFrequency(preset.frequency);
    };

    const monthly = toMonthly(parsed, frequency);

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
                    <Text className="text-base font-extrabold text-gray-900">Time Machine</Text>
                    <Text className="text-xs text-gray-400">What a habit is really costing you</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Presets */}
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    Start from a habit
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                    {PRESETS.map((preset) => {
                        const active = parsed === preset.amount && frequency === preset.frequency;
                        return (
                            <PressableScale
                                key={preset.label}
                                onPress={() => applyPreset(preset)}
                                accessibilityRole="button"
                                className={`px-3.5 py-2 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                                    {preset.label}
                                </Text>
                            </PressableScale>
                        );
                    })}
                </View>

                {/* Amount and frequency */}
                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        Amount
                    </Text>
                    <View className="flex-row items-center border-b border-gray-100 pb-3 mb-3">
                        <Text className="text-2xl font-bold text-gray-400 mr-1">₹</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            accessibilityLabel="Amount spent"
                            className="flex-1 text-2xl font-bold text-gray-900 p-0"
                            placeholder="0"
                            placeholderTextColor="#D1D5DB"
                        />
                    </View>
                    <View className="flex-row gap-2">
                        {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => { haptics.select(); setFrequency(f); }}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                className={`flex-1 py-2.5 rounded-xl items-center ${frequency === f ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100'}`}
                            >
                                <Text className={`text-xs font-semibold ${frequency === f ? 'text-indigo-600' : 'text-gray-500'}`}>
                                    {FREQUENCY_LABELS[f]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {parsed > 0 && (
                        <Text className="text-xs text-gray-400 mt-3">
                            That is about {formatCompactINR(monthly)} a month.
                        </Text>
                    )}
                </View>

                {/* Years and rate */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4">
                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Years</Text>
                        <View className="flex-row flex-wrap gap-1.5">
                            {YEAR_OPTIONS.map((y) => (
                                <PressableScale
                                    key={y}
                                    onPress={() => { haptics.select(); setYears(y); }}
                                    accessibilityRole="button"
                                    className={`px-3 py-1.5 rounded-lg ${years === y ? 'bg-indigo-600' : 'bg-gray-100'}`}
                                >
                                    <Text className={`text-xs font-bold ${years === y ? 'text-white' : 'text-gray-500'}`}>{y}</Text>
                                </PressableScale>
                            ))}
                        </View>
                    </View>
                    <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4">
                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Return</Text>
                        <View className="flex-row flex-wrap gap-1.5">
                            {RATE_OPTIONS.map((r) => (
                                <PressableScale
                                    key={r}
                                    onPress={() => { haptics.select(); setRate(r); }}
                                    accessibilityRole="button"
                                    className={`px-3 py-1.5 rounded-lg ${rate === r ? 'bg-indigo-600' : 'bg-gray-100'}`}
                                >
                                    <Text className={`text-xs font-bold ${rate === r ? 'text-white' : 'text-gray-500'}`}>{r}%</Text>
                                </PressableScale>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Result */}
                <View className="bg-indigo-600 rounded-3xl p-5 mb-4">
                    <View className="flex-row items-center mb-1">
                        <TrendingUp size={16} color="#C7D2FE" />
                        <Text className="text-xs font-bold text-indigo-200 uppercase tracking-wide ml-1.5">
                            Invested instead, after {years} years
                        </Text>
                    </View>
                    <AnimatedNumber
                        value={futureValue}
                        format={formatCompactINR}
                        className="text-4xl font-extrabold text-white mt-1"
                    />
                    <View className="flex-row mt-4 pt-4 border-t border-indigo-500">
                        <View className="flex-1">
                            <Text className="text-xs text-indigo-200">You put in</Text>
                            <Text className="text-base font-bold text-white mt-0.5">
                                {formatCompactINR(contributed)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-indigo-200">Compounding added</Text>
                            <Text className="text-base font-bold text-emerald-300 mt-0.5">
                                {formatCompactINR(growth)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Chart */}
                {parsed > 0 && (
                    <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                Growth over time
                            </Text>
                            <View className="flex-row items-center gap-3">
                                <View className="flex-row items-center">
                                    <View className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1" />
                                    <Text className="text-xs text-gray-500">Value</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="w-2.5 h-2.5 rounded-full bg-gray-300 mr-1" />
                                    <Text className="text-xs text-gray-500">Paid in</Text>
                                </View>
                            </View>
                        </View>
                        <Svg width="100%" height={CHART_H + 20} viewBox={`0 -10 ${CHART_W} ${CHART_H + 20}`}>
                            <Line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="#F3F4F6" strokeWidth={1} />
                            <Path d={contributedPath} fill="none" stroke="#D1D5DB" strokeWidth={2} strokeDasharray="4 4" />
                            <Path d={valuePath} fill="none" stroke="#6366F1" strokeWidth={3} strokeLinecap="round" />
                            <Circle cx={CHART_W} cy={0} r={4} fill="#6366F1" />
                        </Svg>
                        <View className="flex-row justify-between mt-1">
                            <Text className="text-xs text-gray-400">Today</Text>
                            <Text className="text-xs text-gray-400">{years} years</Text>
                        </View>
                    </View>
                )}

                {/* Honesty note */}
                <View className="flex-row bg-gray-100 rounded-2xl p-3.5">
                    <Info size={14} color="#9CA3AF" style={{ marginTop: 2 }} />
                    <Text className="text-xs text-gray-500 leading-5 ml-2 flex-1">
                        These figures are before inflation and tax, and assume a steady return that
                        real markets do not give you. Treat it as a sense of scale, not a forecast.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default TimeMachineScreen;
