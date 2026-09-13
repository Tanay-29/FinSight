/**
 * The minimum-due trap, as a thing you can drag.
 *
 * Three sliders: what you owe, the card's APR, and what you pay each month.
 * The chart draws the balance over time for that payment beside the balance
 * for paying only the minimum. The point where the payment line stops
 * sloping down is the point below which the card never clears, and the
 * screen names it rather than leaving the learner to infer it.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { Slider } from '../Slider';
import { Readout } from '../CardChrome';
import { fixedPaymentPayoff, minimumDuePayoff, inr, inrShort, monthsLabel } from '../../../utils/moneyMath';
import { CREDIT_CARD } from '../../../data/taxConstants';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

const CHART_H = 120;

function pathFor(balances: number[], maxBal: number, maxMonths: number, width: number): string {
    if (balances.length === 0 || maxBal <= 0) return '';
    const pts = balances.slice(0, maxMonths).map((b, i) => {
        const x = (i / Math.max(1, maxMonths - 1)) * width;
        const y = CHART_H - (b / maxBal) * CHART_H;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return pts.join(' ');
}

export const MinimumDueExplorable: React.FC = () => {
    const [balance, setBalance] = useState(50_000);
    const [aprPct, setAprPct] = useState(Math.round(CREDIT_CARD.aprDefault * 100));
    const [payment, setPayment] = useState(2_500);
    const [width, setWidth] = useState(0);

    const apr = aprPct / 100;
    const firstMonthInterest = Math.round(balance * apr / 12);

    const { fixed, minimum } = useMemo(() => ({
        fixed: fixedPaymentPayoff(balance, apr, payment),
        minimum: minimumDuePayoff(balance, apr),
    }), [balance, apr, payment]);

    const treadmill = !fixed.cleared;
    const horizon = Math.max(12, Math.min(240, Math.max(fixed.months, minimum.months)));
    const maxBal = Math.max(balance, ...fixed.balances.slice(0, horizon));

    return (
        <View>
            <Slider label="You owe" value={balance} min={5_000} max={200_000} step={5_000} onChange={setBalance} format={(v) => inr(v)} />
            <Slider label="Card interest (APR)" value={aprPct} min={24} max={48} step={1} onChange={setAprPct} format={(v) => `${v}%`} minLabel="Cheapest cards" maxLabel="Most cards" />
            <Slider
                label="You pay each month"
                value={payment}
                min={500}
                max={20_000}
                step={250}
                onChange={setPayment}
                format={(v) => inr(v)}
                accentColor={treadmill ? COLORS.semantic.alertCritical : COLORS.semantic.profit}
            />

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Readout label="Cleared in" value={treadmill ? 'Never' : monthsLabel(fixed.months)} tone={treadmill ? 'bad' : fixed.months <= 12 ? 'good' : 'neutral'} big />
                <Readout label="Interest you pay" value={treadmill ? 'Keeps growing' : inr(fixed.totalInterest)} tone={treadmill ? 'bad' : 'neutral'} big />
            </View>

            <View
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                style={{ height: CHART_H, marginBottom: 8, borderRadius: 10, backgroundColor: COLORS.surface.tertiary, overflow: 'hidden' }}
            >
                {width > 0 ? (
                    <Svg width={width} height={CHART_H}>
                        <Line x1={0} y1={CHART_H - 0.5} x2={width} y2={CHART_H - 0.5} stroke={COLORS.border.default} strokeWidth={1} />
                        <Path d={pathFor(minimum.balances, maxBal, horizon, width)} stroke={COLORS.text.tertiary} strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                        <Path d={pathFor(fixed.balances, maxBal, horizon, width)} stroke={treadmill ? COLORS.semantic.alertCritical : COLORS.semantic.profit} strokeWidth={2.5} fill="none" />
                    </Svg>
                ) : null}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>Now</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>{monthsLabel(horizon)}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ width: 18, height: 2.5, backgroundColor: treadmill ? COLORS.semantic.alertCritical : COLORS.semantic.profit, marginRight: 8 }} />
                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary }}>Paying {inrShort(payment)} a month</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 18, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.text.tertiary, marginRight: 8 }} />
                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary }}>
                    Minimum only: {monthsLabel(minimum.months)}{minimum.cleared ? '' : '+'}, {inr(minimum.totalInterest)} interest
                </Text>
            </View>

            <Text style={{ ...TYPE.caption, fontFamily: FONTS.regular, color: treadmill ? COLORS.semantic.alertCritical : COLORS.text.tertiary }}>
                {treadmill
                    ? `Interest in the first month is ${inr(firstMonthInterest)}. Paying less than that means the balance grows every month.`
                    : `Interest in the first month is ${inr(firstMonthInterest)}. Everything above that reduces what you owe.`}
            </Text>
        </View>
    );
};
