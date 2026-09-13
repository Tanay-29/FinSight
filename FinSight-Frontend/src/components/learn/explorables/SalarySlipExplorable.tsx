/**
 * Where a month of CTC goes, as one bar you can push around.
 *
 * Drag the CTC and the bar re-splits into in-hand, your PF, the employer's
 * PF, professional tax and TDS. The thing to notice is that TDS is zero for
 * a long stretch and then appears; the readout says exactly where.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Slider } from '../Slider';
import { Readout } from '../CardChrome';
import { salaryBreakdown, inr, inrShort } from '../../../utils/moneyMath';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

interface Segment { key: string; label: string; value: number; color: string }

export const SalarySlipExplorable: React.FC<{ initialCtc?: number }> = ({ initialCtc = 600_000 }) => {
    const [ctc, setCtc] = useState(initialCtc);
    const b = useMemo(() => salaryBreakdown(ctc), [ctc]);
    const monthly = ctc / 12;

    const segments: Segment[] = [
        { key: 'inHand', label: 'In hand', value: b.inHand, color: COLORS.semantic.profit },
        { key: 'epf', label: 'Your PF', value: b.employeePf, color: COLORS.brand.primary },
        { key: 'erpf', label: 'Employer PF', value: b.employerPf, color: COLORS.brand.link },
        { key: 'pt', label: 'Prof. tax', value: b.professionalTax, color: COLORS.text.tertiary },
        { key: 'tds', label: 'TDS', value: b.tds, color: COLORS.semantic.alertCritical },
    ];

    return (
        <View>
            <Slider
                label="Annual CTC"
                value={ctc}
                min={300_000}
                max={3_000_000}
                step={25_000}
                onChange={setCtc}
                format={(v) => inrShort(v)}
                minLabel="3L"
                maxLabel="30L"
            />

            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                <Readout label="CTC per month" value={inr(monthly)} />
                <Readout label="In hand" value={inr(b.inHand)} tone="good" big />
            </View>

            <View style={{ flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                {segments.map((s) => (
                    s.value > 0 ? (
                        <View key={s.key} style={{ flex: s.value, backgroundColor: s.color }} />
                    ) : null
                ))}
            </View>

            {segments.map((s) => (
                <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color, marginRight: 8 }} />
                        <Text style={{ ...TYPE.callout, color: COLORS.text.secondary }}>{s.label}</Text>
                    </View>
                    <Text style={{ ...TYPE.amountSm, color: s.value === 0 && s.key === 'tds' ? COLORS.text.tertiary : COLORS.text.primary }}>
                        {s.value === 0 && s.key === 'tds' ? 'none yet' : inr(s.value)}
                    </Text>
                </View>
            ))}

            <View style={{ marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: COLORS.surface.tertiary }}>
                <Text style={{ ...TYPE.caption, color: COLORS.text.primary, marginBottom: 4 }}>
                    {Math.round(b.gapPercent)}% of CTC never reaches the bank
                </Text>
                {b.assumptions.map((a) => (
                    <Text key={a} style={{ fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: COLORS.text.tertiary }}>
                        {'•'} {a}
                    </Text>
                ))}
            </View>
        </View>
    );
};
