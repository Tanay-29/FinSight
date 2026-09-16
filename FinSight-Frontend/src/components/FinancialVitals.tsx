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
 *
 * The chart used to be seven UTC days under a thirty-day heading, drawn
 * through a viewBox that never matched the card. It is now SpendSparkline:
 * thirty local days, measured pixels, drawn in on first paint.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SpendSparkline, SparkDay } from './SpendSparkline';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { COLORS } from '../theme/tokens';

interface FinancialVitalsProps {
    totalSpent: number;
    /** Thirty local days of debits, oldest first. */
    dailyTrend: SparkDay[];
    /** Null when the user has no spending in the previous month. */
    comparison: { type: 'increase' | 'decrease' | 'flat'; percentage: number } | null;
}

export const FinancialVitals: React.FC<FinancialVitalsProps> = ({
    totalSpent,
    dailyTrend,
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

            <Text className="text-xs text-text-tertiary mt-3 font-inter">Day by day</Text>
            <SpendSparkline days={dailyTrend} />

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
