/**
 * What "no-cost EMI" costs. Price, tenure and the cash discount you give up;
 * the readout is the extra over paying cash, itemised.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Slider } from '../Slider';
import { Readout } from '../CardChrome';
import { noCostEmi, inr } from '../../../utils/moneyMath';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: strong ? 0 : 1, borderBottomColor: COLORS.border.default }}>
        <Text style={{ ...TYPE.callout, fontSize: 14, color: strong ? COLORS.text.primary : COLORS.text.secondary, fontFamily: strong ? FONTS.bold : FONTS.medium }}>{label}</Text>
        <Text style={{ ...TYPE.amountSm, color: strong ? COLORS.semantic.alertCritical : COLORS.text.primary }}>{value}</Text>
    </View>
);

export const NoCostEmiExplorable: React.FC = () => {
    const [price, setPrice] = useState(30_000);
    const [months, setMonths] = useState(6);
    const [discount, setDiscount] = useState(1_500);
    const r = useMemo(() => noCostEmi(price, months, 0.15, 199, discount), [price, months, discount]);

    return (
        <View>
            <Slider label="Sticker price" value={price} min={5_000} max={150_000} step={1_000} onChange={setPrice} format={(v) => inr(v)} />
            <Slider label="Tenure" value={months} min={3} max={24} step={3} onChange={setMonths} format={(v) => `${v} months`} />
            <Slider label="Cash discount you give up" value={discount} min={0} max={10_000} step={250} onChange={setDiscount} format={(v) => inr(v)} minLabel="None offered" maxLabel="10k" />

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Readout label="Monthly instalment" value={inr(price / months)} />
                <Readout label="Extra over cash" value={inr(r.extraOverCash)} tone="bad" big />
            </View>

            <View style={{ padding: 12, borderRadius: 12, backgroundColor: COLORS.surface.tertiary }}>
                <Row label="Interest the lender charges" value={inr(r.interestInBuiltPrice)} />
                <Row label="Rebated by the seller as a discount" value={`-${inr(r.interestInBuiltPrice)}`} />
                <Row label="Processing fee" value={inr(r.processingFee)} />
                <Row label="GST on interest and fee" value={inr(r.gstOnInterestAndFee)} />
                <Row label="Cash discount not taken" value={inr(r.foregoneDiscount)} />
                <Row label="What you really pay" value={inr(r.trueCost)} strong />
            </View>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginTop: 8 }}>
                Assumes the lender's rate is 15% a year and a 199 fee, typical of card EMIs. The interest line is real, it is just paid by the seller's discount; the GST on it is yours.
            </Text>
        </View>
    );
};
