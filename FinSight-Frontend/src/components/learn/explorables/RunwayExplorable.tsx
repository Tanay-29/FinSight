/**
 * How long a sum of money lasts against the learner's own essential spend.
 *
 * The one explorable no other learning app can ship: the denominator is
 * read from the transactions already in Redux. When there are none, it
 * says the figure is assumed rather than pretending.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Slider } from '../Slider';
import { Readout } from '../CardChrome';
import { useAppSelector } from '../../../store/hooks';
import { essentialMonthlySpend } from '../../../utils/runway';
import { inr, inrShort } from '../../../utils/moneyMath';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

export const RunwayExplorable: React.FC = () => {
    const transactions = useAppSelector((s) => s.transactions.items);
    const essentials = useMemo(() => essentialMonthlySpend(transactions), [transactions]);
    const [saved, setSaved] = useState(50_000);

    const months = essentials.monthly > 0 ? saved / essentials.monthly : 0;
    const target3 = essentials.monthly * 3;
    const target6 = essentials.monthly * 6;
    const tone = months >= 6 ? 'good' : months >= 3 ? 'neutral' : 'bad';
    const pct = Math.min(100, (months / 6) * 100);

    return (
        <View>
            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                <Readout label={essentials.source === 'logged' ? 'Your essentials, per month' : 'Essentials, assumed'} value={inr(essentials.monthly)} />
            </View>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text.tertiary, marginBottom: 12 }}>
                {essentials.source === 'logged'
                    ? `Rent, groceries, utilities, transport and health from your last 90 days (${essentials.count} entries).`
                    : 'Log a few rent, grocery or utility payments and this becomes your own number.'}
            </Text>

            <Slider label="Money set aside" value={saved} min={0} max={400_000} step={5_000} onChange={setSaved} format={(v) => inr(v)} minLabel="0" maxLabel="4L" />

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Readout label="Covers" value={months < 0.05 ? 'Nothing yet' : `${months.toFixed(1)} months`} tone={tone} big />
            </View>

            <View style={{ height: 14, borderRadius: 7, backgroundColor: COLORS.surface.tertiary, overflow: 'hidden', marginBottom: 6 }}>
                <View style={{ width: `${pct}%`, height: 14, backgroundColor: tone === 'good' ? COLORS.semantic.profit : tone === 'neutral' ? COLORS.semantic.alertAmber : COLORS.semantic.alertCritical }} />
                <View style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: 14, backgroundColor: COLORS.surface.primary }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>0</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>3 months: {inrShort(target3)}</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>6 months: {inrShort(target6)}</Text>
            </View>

            <Text style={{ ...TYPE.caption, fontFamily: FONTS.regular, color: COLORS.text.secondary }}>
                {months >= 6
                    ? 'Six months of essentials. Anything above this can go to work in investments.'
                    : months >= 3
                        ? `Three months covered. ${inr(target6 - saved)} more reaches six.`
                        : `${inr(Math.max(0, target3 - saved))} short of a three-month cushion, which is where a job gap stops being a crisis.`}
            </Text>
        </View>
    );
};
