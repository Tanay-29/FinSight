/**
 * Recurring charges, sorted by what you can actually do about them.
 *
 * Subscriptions: the same amount on a steady cycle (streaming, apps, plans).
 * These are the ones worth questioning, so each has a "Would cancel" toggle,
 * and the card at the top adds up what the toggled ones cost a month, a year,
 * and in five years if that money went into a SIP instead.
 *
 * Bills: rent, utilities and fees. They repeat, but cancelling is not a real
 * option, so they are listed for the total and nothing else.
 *
 * Habits: places you go back to for different amounts (food delivery, cabs,
 * groceries). Not subscriptions, but they add up, so each shows a monthly
 * estimate.
 *
 * The old screen put all three in one list with Keep and Cancel under each,
 * which offered to cancel rent and groceries, and projected every recurring
 * rupee "redirected" for twenty years into a number in lakhs that meant
 * nothing to anyone.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { BackButton } from '../components/BackButton';
import {
    Tv, Music, Smartphone, Cloud, Dumbbell, RefreshCw, Coffee, ShoppingBag, Zap, Heart, Home, Car, ShoppingCart, BookOpen, TrendingUp, Check,
} from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import * as haptics from '../utils/haptics';
import { futureValueOfSeries } from '../utils/projections';
import { merchantKey } from '../utils/merchantRules';
import { RecurringCharge, detectRecurring } from '../utils/recurring';
import { normaliseCategory, Category } from '../utils/categories';
import { inr, inrShort } from '../utils/moneyMath';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { COLORS, CATEGORY_COLORS, categoryTint, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

const rs = (n: number) => `₹${inr(n)}`;
const BILLS: Category[] = ['housing', 'utilities', 'education'];
const SIP_RATE = 10;
const SIP_YEARS = 5;

const ICON_FOR: Partial<Record<Category, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>> = {
    entertainment: Tv,
    dining: Coffee,
    shopping: ShoppingBag,
    utilities: Zap,
    healthcare: Heart,
    housing: Home,
    transport: Car,
    groceries: ShoppingCart,
    education: BookOpen,
    investments: TrendingUp,
};

/** A few well-known names get their own glyph. */
function iconFor(c: RecurringCharge) {
    const n = c.normalised;
    if (/spotify|music|gaana|wynk/.test(n)) return Music;
    if (/jio|airtel|vi |vodafone|recharge/.test(n)) return Smartphone;
    if (/icloud|google one|drive|dropbox/.test(n)) return Cloud;
    if (/gym|cult|fitness/.test(n)) return Dumbbell;
    return ICON_FOR[normaliseCategory(c.category)] ?? RefreshCw;
}

const cadence = (days: number) =>
    days >= 25 && days <= 35 ? 'Monthly' : days >= 6 && days <= 8 ? 'Weekly' : `Every ${days} days`;

const Row: React.FC<{ c: RecurringCharge; last: boolean; right?: React.ReactNode; note?: string; dim?: boolean }> = ({ c, last, right, note, dim }) => {
    const key = normaliseCategory(c.category);
    const Icon = iconFor(c);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: COLORS.border.default, opacity: dim ? 0.55 : 1 }}>
            <View style={{ width: 38, height: 38, borderRadius: RADIUS.control, alignItems: 'center', justifyContent: 'center', backgroundColor: categoryTint(key) }}>
                {React.createElement(Icon, { size: 18, color: CATEGORY_COLORS[key], strokeWidth: 1.9 })}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.primary }}>{c.merchant}</Text>
                <Text numberOfLines={1} style={{ ...TYPE.caption, fontSize: 12, color: note ? COLORS.semantic.alertAmber : COLORS.text.tertiary, marginTop: 1 }}>
                    {note ?? `${cadence(c.avgIntervalDays)}, ${c.totalCount} times in 90 days`}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                <Text style={{ ...TYPE.amountSm, color: COLORS.text.primary }}>{rs(c.estimatedMonthly)}</Text>
                <Text style={{ ...TYPE.caption, fontSize: 11, color: COLORS.text.tertiary }}>a month</Text>
            </View>
            {right}
        </View>
    );
};

const Section: React.FC<{ title: string; total: number; hint: string; children: React.ReactNode }> = ({ title, total, hint, children }) => (
    <View style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginHorizontal: GUTTER, marginBottom: 2 }}>
            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, flex: 1 }}>{title}</Text>
            <Text style={{ ...TYPE.caption, fontFamily: FONTS.semibold, color: COLORS.text.secondary }}>{rs(total)} a month</Text>
        </View>
        <Text style={{ ...TYPE.caption, fontSize: 12, color: COLORS.text.tertiary, marginHorizontal: GUTTER, marginBottom: 8 }}>{hint}</Text>
        <View style={{ marginHorizontal: GUTTER, paddingHorizontal: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
            {children}
        </View>
    </View>
);

const SubscriptionTrackerScreen: React.FC = () => {
    const reduced = useReducedMotion();
    const transactions = useAppSelector((s) => s.transactions.items);
    const [cancel, setCancel] = useState<Set<string>>(new Set());

    const { subs, bills, habits } = useMemo(() => {
        const all = detectRecurring(transactions, merchantKey);
        const isBill = (c: RecurringCharge) => BILLS.includes(normaliseCategory(c.category));
        return {
            subs: all.filter((c) => !isBill(c) && c.type === 'subscription'),
            bills: all.filter(isBill),
            habits: all.filter((c) => !isBill(c) && c.type !== 'subscription'),
        };
    }, [transactions]);

    const sum = (list: RecurringCharge[]) => list.reduce((s, c) => s + c.estimatedMonthly, 0);
    const subsTotal = sum(subs);
    const cut = sum(subs.filter((c) => cancel.has(c.normalised)));
    const shown = cut > 0 ? cut : subsTotal;
    const sip = futureValueOfSeries(shown, 'monthly', SIP_RATE, SIP_YEARS);

    const toggle = (key: string) => {
        haptics.select();
        setCancel((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const empty = subs.length + bills.length + habits.length === 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 6 }}>
                <BackButton />
                <View style={{ marginLeft: 12 }}>
                    <Text style={{ ...TYPE.heading, color: COLORS.text.primary }}>Recurring charges</Text>
                    <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary }}>From the last 90 days</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {empty ? (
                    <Text style={{ ...TYPE.body, color: COLORS.text.secondary, marginHorizontal: GUTTER, marginTop: 30, textAlign: 'center' }}>
                        Nothing repeats yet. After a few weeks of entries, subscriptions and regular spends show up here.
                    </Text>
                ) : (
                    <>
                        {/* What the subscriptions cost, or what the marked ones would free up. */}
                        <Animated.View layout={reduced ? undefined : LinearTransition.duration(220)} style={{ marginHorizontal: GUTTER, marginTop: 10, padding: 18, borderRadius: RADIUS.card, backgroundColor: COLORS.brand.primaryDark }}>
                            <Text style={{ ...TYPE.micro, color: 'rgba(255,255,255,0.75)' }}>
                                {cut > 0 ? `Cancelling ${cancel.size} would free up` : 'Subscriptions cost you'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                <AnimatedNumber value={shown} format={(v) => rs(v)} style={{ ...TYPE.amountLg, fontSize: 32, lineHeight: 38, color: '#FFFFFF' }} />
                                <Text style={{ ...TYPE.callout, color: 'rgba(255,255,255,0.8)', marginLeft: 6 }}>a month</Text>
                            </View>
                            <Text style={{ ...TYPE.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                                {rs(shown * 12)} a year
                            </Text>
                            {shown > 0 ? (
                                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center' }}>
                                    <TrendingUp size={15} color={COLORS.semantic.profitOnBrand} />
                                    <Text style={{ ...TYPE.caption, color: '#FFFFFF', marginLeft: 8, flex: 1 }}>
                                        Put in a SIP instead, about <Text style={{ fontFamily: FONTS.bold, color: COLORS.semantic.profitOnBrand }}>₹{inrShort(sip)}</Text> in {SIP_YEARS} years at {SIP_RATE}% a year.
                                    </Text>
                                </View>
                            ) : null}
                        </Animated.View>

                        {subs.length > 0 ? (
                            <Section title="Subscriptions" total={subsTotal} hint="Same amount, steady cycle. Tap the ones you would cancel.">
                                {subs.map((c, i) => {
                                    const on = cancel.has(c.normalised);
                                    return (
                                        <Pressable key={c.normalised} onPress={() => toggle(c.normalised)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Would cancel ${c.merchant}`}>
                                            <Row
                                                c={c}
                                                last={i === subs.length - 1}
                                                note={c.priceRise ? `Went up from ₹${inr(c.priceRise.from)} to ₹${inr(c.priceRise.to)}` : undefined}
                                                right={
                                                    <View style={{ width: 24, height: 24, borderRadius: 12, marginLeft: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? COLORS.semantic.loss : COLORS.border.strong, backgroundColor: on ? COLORS.semantic.loss : 'transparent' }}>
                                                        {on ? <Animated.View entering={FadeIn.duration(120)}><Check size={14} color="#FFFFFF" strokeWidth={3} /></Animated.View> : null}
                                                    </View>
                                                }
                                            />
                                        </Pressable>
                                    );
                                })}
                            </Section>
                        ) : null}

                        {habits.length > 0 ? (
                            <Section title="Habits" total={sum(habits)} hint="Places you go back to, for different amounts each time.">
                                {habits.map((c, i) => <Row key={c.normalised} c={c} last={i === habits.length - 1} />)}
                            </Section>
                        ) : null}

                        {bills.length > 0 ? (
                            <Section title="Bills" total={sum(bills)} hint="Rent, utilities and fees. They repeat, and they are not optional.">
                                {bills.map((c, i) => <Row key={c.normalised} c={c} last={i === bills.length - 1} />)}
                            </Section>
                        ) : null}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default SubscriptionTrackerScreen;
