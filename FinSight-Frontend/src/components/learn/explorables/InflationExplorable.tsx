/**
 * What a future sum buys in today's rupees. The goal amounts people write
 * down are in today's prices; this shows what the same number is worth by
 * the time they reach it, and what it would have to grow to just to stand
 * still.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Slider } from '../Slider';
import { Readout } from '../CardChrome';
import { presentValue } from '../../../utils/runway';
import { inr, inrShort } from '../../../utils/moneyMath';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

export const InflationExplorable: React.FC = () => {
    const [amount, setAmount] = useState(1_000_000);
    const [years, setYears] = useState(10);
    const [ratePct, setRatePct] = useState(6);

    const today = useMemo(() => presentValue(amount, ratePct / 100, years), [amount, years, ratePct]);
    const needed = useMemo(() => amount * Math.pow(1 + ratePct / 100, years), [amount, years, ratePct]);
    const lostPct = Math.round((1 - today / amount) * 100);

    return (
        <View>
            <Slider label="A sum in the future" value={amount} min={100_000} max={10_000_000} step={100_000} onChange={setAmount} format={(v) => inrShort(v)} minLabel="1L" maxLabel="1Cr" />
            <Slider label="Years from now" value={years} min={1} max={30} step={1} onChange={setYears} format={(v) => `${v} yr`} />
            <Slider label="Inflation" value={ratePct} min={3} max={9} step={0.5} onChange={setRatePct} format={(v) => `${v}%`} minLabel="Calm decade" maxLabel="Rough decade" />

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Readout label={`${inrShort(amount)} in ${years} years buys, in today's money`} value={inr(today)} tone="bad" big />
            </View>

            <View style={{ height: 14, borderRadius: 7, backgroundColor: COLORS.semantic.lossBg, overflow: 'hidden', marginBottom: 6 }}>
                <View style={{ width: `${(today / amount) * 100}%`, height: 14, backgroundColor: COLORS.semantic.profit }} />
            </View>
            <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginBottom: 14 }}>
                {lostPct}% of the purchasing power is gone by then.
            </Text>

            <View style={{ padding: 12, borderRadius: 12, backgroundColor: COLORS.surface.tertiary }}>
                <Text style={{ ...TYPE.caption, color: COLORS.text.primary }}>
                    To have what {inrShort(amount)} buys today, you would need {inr(needed)} in {years} years.
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginTop: 6 }}>
                    Money sitting in a savings account at 3% loses ground every year against 6% inflation. This is the reason to invest at all, before any talk of returns.
                </Text>
            </View>
        </View>
    );
};
