/**
 * Spending pace: where this month is heading, and how much is left a day.
 *
 * The top answers one question in one number: what the month will come to
 * at the current pace, and what that leaves of what came in. The chart under
 * it shows the same thing as a running total with the rest of the month
 * dashed in. Then each budget gets a bar with a mark for where it should be
 * by today, and what is left to spend on it each day from here.
 *
 * Rent, bills and fees are counted once rather than carried forward daily
 * (see utils/pace), which is what made the old version tell everyone they
 * would overspend by several times their rent.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { Info } from 'lucide-react-native';
import { format } from 'date-fns';
import { useAppSelector } from '../store/hooks';
import { resolveMonthlyIncome } from '../utils/income';
import { monthPace } from '../utils/pace';
import { categoryLabel, normaliseCategory } from '../utils/categories';
import { inr } from '../utils/moneyMath';
import { PaceChart } from '../components/charts/PaceChart';
import { BarFill } from '../components/BarFill';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { COLORS, CATEGORY_COLORS, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

const rs = (n: number) => `₹${inr(n)}`;

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12 }}>
        <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary }}>{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...TYPE.amountMd, fontSize: 18, color: color ?? COLORS.text.primary, marginTop: 4 }}>{value}</Text>
    </View>
);

const BurnRateScreen: React.FC = () => {
    const transactions = useAppSelector((s) => s.transactions.items);
    const budgets = useAppSelector((s) => s.budgets.items);
    const profile = useAppSelector((s) => s.auth.profile);
    const [scrubDay, setScrubDay] = useState<number | null>(null);

    const now = new Date();
    const monthKey = format(now, 'yyyy-MM');
    const pace = monthPace(transactions as any, now);
    const income = resolveMonthlyIncome(transactions as any, profile?.incomeRange, monthKey);
    const monthBudgets = budgets.filter((b: any) => b.month === monthKey);

    const daysLeft = pace.daysInMonth - pace.day;
    const left = income.amount - pace.projected;
    const hasIncome = income.amount > 0;
    const scrubbed = scrubDay !== null ? pace.cumulative[scrubDay] : null;

    const verdict = !hasIncome
        ? { text: 'Log what came in this month to see what it leaves.', color: COLORS.text.secondary }
        : left >= 0
            ? { text: `That leaves about ${rs(left)} of the ${rs(income.amount)} that came in.`, color: COLORS.semantic.profit }
            : { text: `That is ${rs(-left)} more than the ${rs(income.amount)} that came in.`, color: COLORS.semantic.loss };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 6 }}>
                <BackButton />
                <View style={{ marginLeft: 12 }}>
                    <Text style={{ ...TYPE.heading, color: COLORS.text.primary }}>Spending pace</Text>
                    <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary }}>{format(now, 'MMMM')}, day {pace.day} of {pace.daysInMonth}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* The answer, then the picture of it. */}
                <View style={{ marginHorizontal: GUTTER, marginTop: 10, padding: 16, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                    <Text style={{ ...TYPE.micro, color: scrubbed !== null ? COLORS.brand.link : COLORS.text.tertiary }}>
                        {scrubbed !== null ? `By ${scrubDay! + 1} ${format(now, 'MMM')}` : `On course for, by the ${pace.daysInMonth}${pace.daysInMonth === 31 ? 'st' : 'th'}`}
                    </Text>
                    {scrubbed !== null ? (
                        <Text style={{ ...TYPE.amountLg, fontSize: 32, lineHeight: 38, color: COLORS.text.primary, marginTop: 4 }}>{rs(scrubbed)}</Text>
                    ) : (
                        <AnimatedNumber value={Math.round(pace.projected)} format={(v) => rs(v)} style={{ ...TYPE.amountLg, fontSize: 32, lineHeight: 38, color: COLORS.text.primary, marginTop: 4 }} />
                    )}
                    <Text style={{ ...TYPE.caption, color: scrubbed !== null ? COLORS.text.secondary : verdict.color, marginTop: 2, minHeight: 36 }}>
                        {scrubbed !== null ? 'spent so far by then' : verdict.text}
                    </Text>

                    <View style={{ marginTop: 6 }}>
                        <PaceChart
                            cumulative={pace.cumulative}
                            daysInMonth={pace.daysInMonth}
                            projected={pace.projected}
                            limit={income.amount}
                            limitLabel={hasIncome ? `Came in ${rs(income.amount)}` : undefined}
                            onScrub={setScrubDay}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', marginTop: 12, marginHorizontal: -12, borderTopWidth: 1, borderTopColor: COLORS.border.default }}>
                        <Stat label="So far" value={rs(pace.spent)} />
                        <View style={{ width: 1, backgroundColor: COLORS.border.default, marginVertical: 10 }} />
                        <Stat label="A day" value={rs(pace.perDay)} />
                        <View style={{ width: 1, backgroundColor: COLORS.border.default, marginVertical: 10 }} />
                        <Stat label="Days left" value={String(daysLeft)} />
                    </View>
                </View>

                {pace.fixed > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: GUTTER + 4, marginTop: 10 }}>
                        <Info size={13} color={COLORS.text.tertiary} style={{ marginTop: 2 }} />
                        <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginLeft: 6, flex: 1 }}>
                            Rent, bills and fees ({rs(pace.fixed)}) are counted once. The rest is carried forward at {rs(pace.perDay)} a day.
                        </Text>
                    </View>
                ) : null}

                {/* Each budget against where it should be by today. */}
                <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginHorizontal: GUTTER, marginTop: 24, marginBottom: 8 }}>Budgets, by today</Text>
                <View style={{ marginHorizontal: GUTTER, paddingHorizontal: 16, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
                    {monthBudgets.length === 0 ? (
                        <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, paddingVertical: 16 }}>
                            No budgets this month. Add one on the Money tab and it shows here with a daily amount to stay under.
                        </Text>
                    ) : monthBudgets.map((b: any, i: number) => {
                        const key = normaliseCategory(b.category);
                        const spent = pace.byCategory[key] ?? 0;
                        const limit = b.monthlyLimit || 0;
                        const expected = limit * (pace.day / pace.daysInMonth);
                        const remaining = limit - spent;
                        const ahead = spent > expected * 1.1;
                        const status = remaining < 0
                            ? { text: `${rs(-remaining)} over`, color: COLORS.semantic.loss }
                            : { text: daysLeft > 0 ? `${rs(remaining / daysLeft)} a day left` : `${rs(remaining)} left`, color: ahead ? COLORS.semantic.alertAmber : COLORS.semantic.profit };
                        return (
                            <View key={b.id ?? key} style={{ paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.border.default }}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.primary, flex: 1 }}>{categoryLabel(key)}</Text>
                                    <Text style={{ ...TYPE.caption, fontFamily: FONTS.semibold, color: status.color }}>{status.text}</Text>
                                </View>
                                <View style={{ marginTop: 8 }}>
                                    <BarFill percent={Math.min(100, limit > 0 ? (spent / limit) * 100 : 0)} color={remaining < 0 ? COLORS.semantic.loss : CATEGORY_COLORS[key]} height={8} delay={i * 70} />
                                    {/* Where spending would be by today at an even pace. */}
                                    <View style={{ position: 'absolute', left: `${Math.min(100, (pace.day / pace.daysInMonth) * 100)}%`, top: -3, width: 2, height: 14, borderRadius: 1, backgroundColor: COLORS.text.primary, opacity: 0.55 }} />
                                </View>
                                <Text style={{ ...TYPE.caption, fontSize: 12, color: COLORS.text.tertiary, marginTop: 6 }}>
                                    {rs(spent)} of {rs(limit)}{ahead && remaining >= 0 ? ', ahead of an even pace' : ''}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                {monthBudgets.length > 0 ? (
                    <Text style={{ ...TYPE.caption, fontSize: 12, color: COLORS.text.tertiary, marginHorizontal: GUTTER + 4, marginTop: 8 }}>
                        The mark on each bar is where an even pace would be by today.
                    </Text>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
};

export default BurnRateScreen;
