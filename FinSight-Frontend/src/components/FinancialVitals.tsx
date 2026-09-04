/**
 * FinancialVitals - the month's spending in one card on the Feed.
 *
 * This used to be a two-column split: total and a sparkline on the left, a
 * "Top Spends" column on the right holding two category bars squeezed into
 * half the screen width. That right column was a worse copy of the Vitals tab,
 * which is one tap away and shows every category at full width. It went.
 *
 * The footer used to read "0% higher than last month" for everyone, because
 * the Feed passed a hardcoded zero. It now takes a real comparison, or null
 * when there is no previous month to compare against, and renders nothing in
 * that case rather than inventing a number.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Svg, Polyline } from 'react-native-svg';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { COLORS } from '../theme/tokens';

interface FinancialVitalsProps {
    totalSpent: number;
    weeklyTrend: number[];
    /** Null when the user has no spending in the previous month. */
    comparison: { type: 'increase' | 'decrease' | 'flat'; percentage: number } | null;
}

const SpendingTrendChart: React.FC<{ data: number[] }> = ({ data }) => {
    if (data.length < 2) return null;
    const min = Math.min(...data) * 0.8;
    const max = Math.max(...data) * 1.1;
    const range = max - min || 1;
    const width = 300;
    const height = 60;
    const padding = 4;

    const points = data
        .map((val, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            <Polyline
                points={points}
                fill="none"
                stroke={COLORS.brand.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

export const FinancialVitals: React.FC<FinancialVitalsProps> = ({
    totalSpent,
    weeklyTrend,
    comparison,
}) => {
    const reduced = useReducedMotion();

    const tone =
        comparison === null || comparison.type === 'flat'
            ? { Icon: Minus, color: COLORS.text.secondary, text: 'text-text-secondary' }
            : comparison.type === 'increase'
                ? { Icon: TrendingUp, color: COLORS.semantic.alertAmberFill, text: 'text-alert-amber' }
                : { Icon: TrendingDown, color: COLORS.semantic.profit, text: 'text-profit' };

    return (
        // The card fades in once when the Feed first paints. It is the number
        // the screen exists to show, so it is worth arriving rather than
        // appearing.
        <Animated.View
            entering={FadeIn.duration(reduced ? 160 : 320)}
            className="bg-surface-primary border border-border rounded-xl p-4 mx-5"
        >
            <Text className="text-xs font-inter-bold text-text-secondary mb-1 uppercase tracking-wider">
                Last 30 days
            </Text>
            <Text
                className="text-[32px] leading-10 font-inter-bold text-text-primary"
                style={{ fontVariant: ['tabular-nums'] }}
            >
                ₹{totalSpent.toLocaleString('en-IN')}
            </Text>

            <Text className="text-xs text-text-tertiary mt-3 mb-1 font-inter">Last 7 days</Text>
            <View className="h-14 w-full opacity-70">
                <SpendingTrendChart data={weeklyTrend} />
            </View>

            {comparison && (
                <View className="mt-3 pt-3 border-t border-border flex-row items-center">
                    <tone.Icon size={12} color={tone.color} />
                    <Text className={`text-xs font-inter-semibold ml-1 ${tone.text}`}>
                        {comparison.type === 'flat'
                            ? 'About the same as the 30 days before'
                            : `${comparison.percentage}% ${comparison.type === 'increase' ? 'higher' : 'lower'} than the 30 days before`}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
};
