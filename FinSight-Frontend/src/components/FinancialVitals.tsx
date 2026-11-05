/**
 * FinancialVitals: the last thirty days of spending in one card.
 *
 * The big number is the thirty-day total. Run a finger along the chart and it
 * becomes the day under the finger instead, with that day's date above it;
 * lift and it goes back. The footer compares with the thirty days before, or
 * says nothing when there is nothing to compare with.
 */
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { SpendSparkline, SparkDay, dayLabel } from './SpendSparkline';
import { AnimatedNumber } from './AnimatedNumber';
import { inr } from '../utils/moneyMath';
import { COLORS, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

interface FinancialVitalsProps {
    totalSpent: number;
    /** Thirty local days of debits, oldest first. */
    dailyTrend: SparkDay[];
    /** Null when the user has no spending in the previous month. */
    comparison: { type: 'increase' | 'decrease' | 'flat'; percentage: number } | null;
}

export const FinancialVitals: React.FC<FinancialVitalsProps> = ({ totalSpent, dailyTrend, comparison }) => {
    const reduced = useReducedMotion();
    const [day, setDay] = useState<number | null>(null);

    const tone =
        comparison === null || comparison.type === 'flat'
            ? { Icon: Minus, color: COLORS.text.secondary }
            : comparison.type === 'increase'
                ? { Icon: TrendingUp, color: COLORS.semantic.alertAmber }
                : { Icon: TrendingDown, color: COLORS.semantic.profit };

    const picked = day !== null ? dailyTrend[day] : null;
    const perDay = dailyTrend.length > 0 ? totalSpent / dailyTrend.length : 0;

    return (
        <Animated.View entering={FadeIn.duration(reduced ? 160 : 320)}>
            <View style={{ marginHorizontal: GUTTER, padding: 16, paddingBottom: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                <Text style={{ ...TYPE.micro, color: picked ? COLORS.brand.link : COLORS.text.tertiary }}>
                    {picked ? dayLabel(picked.key, true) : 'Last 30 days'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                    {picked ? (
                        <Text style={{ ...TYPE.amountLg, fontSize: 32, lineHeight: 38, color: COLORS.text.primary }}>₹{inr(picked.amount)}</Text>
                    ) : (
                        <AnimatedNumber value={totalSpent} format={(v) => `₹${inr(v)}`} style={{ ...TYPE.amountLg, fontSize: 32, lineHeight: 38, color: COLORS.text.primary }} />
                    )}
                    <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginLeft: 8 }}>
                        {picked
                            ? (picked.amount === 0 ? 'nothing spent' : picked.amount > perDay * 1.5 ? 'a heavy day' : picked.amount < perDay * 0.5 ? 'a light day' : 'a usual day')
                            : `about ₹${inr(perDay)} a day`}
                    </Text>
                </View>

                <View style={{ marginTop: 10 }}>
                    <SpendSparkline days={dailyTrend} onScrub={setDay} />
                </View>

                {comparison ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border.default }}>
                        <tone.Icon size={13} color={tone.color} />
                        <Text style={{ ...TYPE.caption, fontFamily: FONTS.semibold, color: tone.color, marginLeft: 6 }}>
                            {comparison.type === 'flat'
                                ? 'About the same as the 30 days before'
                                : `${comparison.percentage}% ${comparison.type === 'increase' ? 'more' : 'less'} than the 30 days before`}
                        </Text>
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );
};
