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
import { COLORS } from '../theme/tokens';

type Props = NativeStackScreenProps<any, 'TimeMachine'>;

/**
 * A preset names a habit and its rhythm. It does not claim to know what yours
 * costs.
 *
 * These used to set the amount as well, so tapping "Daily coffee" asserted 200
 * rupees a day and the chip then deselected itself the moment you corrected
 * it. That made the number look like the point of the exercise, when the point
 * is your number. The typical figure is offered as the field's placeholder,
 * which is a suggestion you can ignore rather than a value you have to delete.
 */
const PRESETS: { label: string; typical: number; frequency: Frequency }[] = [
    { label: 'Daily coffee', typical: 200, frequency: 'daily' },
    { label: 'Food delivery', typical: 400, frequency: 'weekly' },
    { label: 'Streaming stack', typical: 800, frequency: 'monthly' },
    { label: 'Weekend out', typical: 1500, frequency: 'weekly' },
];

const YEAR_OPTIONS = [5, 10, 20, 30];
const RATE_OPTIONS = [8, 12, 15];

const CHART_W = 300;
const CHART_H = 150;

const TimeMachineScreen: React.FC<Props> = ({ navigation }) => {
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('daily');
    // Tracked by label rather than inferred from the amount, so the habit stays
    // selected while you adjust what it costs you.
    const [presetLabel, setPresetLabel] = useState<string | null>(null);
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
        setPresetLabel(preset.label);
        setFrequency(preset.frequency);
        // The amount is deliberately left alone. Switching habits should not
        // wipe a figure the user has already typed.
    };

    const activePreset = PRESETS.find((p) => p.label === presetLabel) ?? null;

    const monthly = toMonthly(parsed, frequency);

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
                    <Text className="text-base font-inter-bold text-text-primary">Time Machine</Text>
                    <Text className="text-xs text-text-tertiary font-inter">What a habit is really costing you</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Presets */}
                <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Start from a habit
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-5">
                    {PRESETS.map((preset) => {
                        const active = presetLabel === preset.label;
                        return (
                            <PressableScale
                                key={preset.label}
                                onPress={() => applyPreset(preset)}
                                accessibilityRole="button"
                                className={`px-3.5 py-2 rounded-full border ${active ? 'bg-brand-primary-dark border-brand-primary-dark' : 'bg-surface-primary border-border-strong'}`}
                            >
                                <Text className={`text-xs font-inter-semibold ${active ? 'text-white' : 'text-text-secondary'}`}>
                                    {preset.label}
                                </Text>
                            </PressableScale>
                        );
                    })}
                </View>

                {/* Amount and frequency */}
                <View className="bg-surface-primary rounded-2xl border border-border p-4 mb-4">
                    <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2">
                        {activePreset ? `What your ${activePreset.label.toLowerCase()} costs` : 'Amount'}
                    </Text>
                    <View className="flex-row items-center border-b border-border pb-3 mb-3">
                        <Text className="text-2xl font-inter-bold text-text-tertiary mr-1">₹</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            accessibilityLabel={
                                activePreset
                                    ? `What your ${activePreset.label.toLowerCase()} costs each time`
                                    : 'Amount spent'
                            }
                            className="flex-1 text-2xl font-inter-bold text-text-primary p-0"
                            placeholder={activePreset ? String(activePreset.typical) : '0'}
                            placeholderTextColor={COLORS.border.strong}
                        />
                    </View>

                    {activePreset && parsed === 0 && (
                        <Text className="text-xs text-text-tertiary mb-3 -mt-1 font-inter">
                            Put in what yours actually costs. {formatCompactINR(activePreset.typical)} is
                            just a common figure.
                        </Text>
                    )}
                    <View className="flex-row gap-2">
                        {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => { haptics.select(); setFrequency(f); }}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                className={`flex-1 py-2.5 rounded-xl items-center ${frequency === f ? 'bg-brand-soft border border-brand-edge' : 'bg-surface-secondary border border-border'}`}
                            >
                                <Text className={`text-xs font-inter-semibold ${frequency === f ? 'text-brand-primary-dark' : 'text-text-secondary'}`}>
                                    {FREQUENCY_LABELS[f]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {parsed > 0 && (
                        <Text className="text-xs text-text-tertiary mt-3 font-inter">
                            That is about {formatCompactINR(monthly)} a month.
                        </Text>
                    )}
                </View>

                {/* Years and rate */}
                <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-surface-primary rounded-2xl border border-border p-4">
                        <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2">Years</Text>
                        <View className="flex-row flex-wrap gap-1.5">
                            {YEAR_OPTIONS.map((y) => (
                                <PressableScale
                                    key={y}
                                    onPress={() => { haptics.select(); setYears(y); }}
                                    accessibilityRole="button"
                                    className={`px-3 py-1.5 rounded-lg ${years === y ? 'bg-brand-primary-dark' : 'bg-surface-tertiary'}`}
                                >
                                    <Text className={`text-xs font-inter-bold ${years === y ? 'text-white' : 'text-text-secondary'}`}>{y}</Text>
                                </PressableScale>
                            ))}
                        </View>
                    </View>
                    <View className="flex-1 bg-surface-primary rounded-2xl border border-border p-4">
                        <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2">Return</Text>
                        <View className="flex-row flex-wrap gap-1.5">
                            {RATE_OPTIONS.map((r) => (
                                <PressableScale
                                    key={r}
                                    onPress={() => { haptics.select(); setRate(r); }}
                                    accessibilityRole="button"
                                    className={`px-3 py-1.5 rounded-lg ${rate === r ? 'bg-brand-primary-dark' : 'bg-surface-tertiary'}`}
                                >
                                    <Text className={`text-xs font-inter-bold ${rate === r ? 'text-white' : 'text-text-secondary'}`}>{r}%</Text>
                                </PressableScale>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Result */}
                {parsed === 0 ? (
                    <View className="bg-surface-primary border border-dashed border-border-strong rounded-3xl p-6 mb-4 items-center">
                        <TrendingUp size={22} color={COLORS.border.strong} />
                        <Text className="text-sm text-text-tertiary text-center mt-2.5 leading-5 font-inter">
                            Put in what the habit costs you and this shows what the same money
                            would be worth invested instead.
                        </Text>
                    </View>
                ) : (
                <View className="bg-brand-primary-dark rounded-3xl p-5 mb-4">
                    <View className="flex-row items-center mb-1">
                        <TrendingUp size={16} color={COLORS.brand.edge} />
                        <Text className="text-xs font-inter-bold text-brand-edge uppercase tracking-wide ml-1.5">
                            Invested instead, after {years} years
                        </Text>
                    </View>
                    <AnimatedNumber
                        value={futureValue}
                        format={formatCompactINR}
                        className="text-4xl font-inter-bold text-white mt-1"
                    />
                    <View className="flex-row mt-4 pt-4 border-t border-brand-primary">
                        <View className="flex-1">
                            <Text className="text-xs text-brand-edge font-inter">You put in</Text>
                            <Text className="text-base font-inter-bold text-white mt-0.5">
                                {formatCompactINR(contributed)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-brand-edge font-inter">Compounding added</Text>
                            <Text className="text-base font-inter-bold text-profit-on-brand mt-0.5">
                                {formatCompactINR(growth)}
                            </Text>
                        </View>
                    </View>
                </View>
                )}

                {/* Chart */}
                {parsed > 0 && (
                    <View className="bg-surface-primary rounded-2xl border border-border p-4 mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-2xs font-inter-semibold text-text-tertiary uppercase tracking-wider">
                                Growth over time
                            </Text>
                            <View className="flex-row items-center gap-3">
                                <View className="flex-row items-center">
                                    <View className="w-2.5 h-2.5 rounded-full bg-brand-primary mr-1" />
                                    <Text className="text-xs text-text-secondary font-inter">Value</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="w-2.5 h-2.5 rounded-full bg-border-strong mr-1" />
                                    <Text className="text-xs text-text-secondary font-inter">Paid in</Text>
                                </View>
                            </View>
                        </View>
                        <Svg width="100%" height={CHART_H + 20} viewBox={`0 -10 ${CHART_W} ${CHART_H + 20}`}>
                            <Line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke={COLORS.surface.tertiary} strokeWidth={1} />
                            <Path d={contributedPath} fill="none" stroke={COLORS.border.strong} strokeWidth={2} strokeDasharray="4 4" />
                            <Path d={valuePath} fill="none" stroke={COLORS.brand.primary} strokeWidth={3} strokeLinecap="round" />
                            <Circle cx={CHART_W} cy={0} r={4} fill={COLORS.brand.primary} />
                        </Svg>
                        <View className="flex-row justify-between mt-1">
                            <Text className="text-xs text-text-tertiary font-inter">Today</Text>
                            <Text className="text-xs text-text-tertiary font-inter">{years} years</Text>
                        </View>
                    </View>
                )}

                {/* Honesty note */}
                <View className="flex-row bg-surface-tertiary rounded-2xl p-3.5">
                    <Info size={14} color={COLORS.text.tertiary} style={{ marginTop: 2 }} />
                    <Text className="text-xs text-text-secondary leading-5 ml-2 flex-1 font-inter">
                        These figures are before inflation and tax, and assume a steady return that
                        real markets do not give you. Treat it as a sense of scale, not a forecast.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default TimeMachineScreen;
