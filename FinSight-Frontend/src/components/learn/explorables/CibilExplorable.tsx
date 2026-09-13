/**
 * Which lever moves a credit score. Four sliders, one needle. The model is
 * illustrative and the screen says so; the lesson is the relative weight,
 * not the exact number.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Slider } from '../Slider';
import { illustrativeCibil } from '../../../utils/runway';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

export const CibilExplorable: React.FC = () => {
    const [utilisation, setUtilisation] = useState(25);
    const [onTime, setOnTime] = useState(100);
    const [ageYears, setAgeYears] = useState(1);
    const [enquiries, setEnquiries] = useState(1);

    const score = useMemo(
        () => illustrativeCibil({ utilisation: utilisation / 100, onTime: onTime / 100, ageYears, enquiries }),
        [utilisation, onTime, ageYears, enquiries],
    );
    const band = score >= 750 ? 'Good, most lenders say yes' : score >= 650 ? 'Fair, loans cost more' : 'Poor, many applications refused';
    const color = score >= 750 ? COLORS.semantic.profit : score >= 650 ? COLORS.semantic.alertAmber : COLORS.semantic.alertCritical;
    const pct = ((score - 300) / 600) * 100;

    return (
        <View>
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ ...TYPE.display, fontSize: 48, lineHeight: 52, color }}>{score}</Text>
                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary }}>{band}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: COLORS.surface.tertiary, overflow: 'hidden', marginBottom: 4 }}>
                <View style={{ width: `${pct}%`, height: 8, backgroundColor: color }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>300</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>750</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>900</Text>
            </View>

            <Slider label="Payments made on time, last two years" value={onTime} min={50} max={100} step={2} onChange={setOnTime} format={(v) => `${v}%`} />
            <Slider label="Limit in use on statement day" value={utilisation} min={0} max={100} step={5} onChange={setUtilisation} format={(v) => `${v}%`} minLabel="Unused" maxLabel="Maxed out" />
            <Slider label="Age of oldest account" value={ageYears} min={0} max={10} step={1} onChange={setAgeYears} format={(v) => `${v} yr`} />
            <Slider label="Loan or card applications, last 6 months" value={enquiries} min={0} max={8} step={1} onChange={setEnquiries} format={(v) => String(v)} />

            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary }}>
                An illustration of the published weightings, not the bureau's formula. Payment history counts most, then utilisation, then age, then enquiries. Try dropping on-time payments from 100 to 90 and watch what one missed year does.
            </Text>
        </View>
    );
};
