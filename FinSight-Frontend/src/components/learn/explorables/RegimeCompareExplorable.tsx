/**
 * Old regime versus new, side by side, for the income under your thumb.
 *
 * The deductions are toggles rather than inputs, at their statutory caps,
 * because the question a first-time filer actually has is "if I did
 * everything the old regime rewards, would it still lose?". For most incomes
 * under about 15 lakh the answer is yes, and watching the new column stay
 * lower while you switch every toggle on is the lesson.
 */
import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { Slider } from '../Slider';
import { PressableScale } from '../../PressableScale';
import { compareRegimes, inr, inrShort, OldRegimeDeductions } from '../../../utils/moneyMath';
import { CURRENT_FY } from '../../../data/taxConstants';
import { COLORS, FONTS, TYPE } from '../../../theme/tokens';

interface Toggle { key: keyof OldRegimeDeductions; label: string; amount: number }

const TOGGLES: Toggle[] = [
    { key: 'section80C', label: `80C: PPF, ELSS, EPF, up to ${inrShort(CURRENT_FY.caps.section80C)}`, amount: CURRENT_FY.caps.section80C },
    { key: 'section80D', label: `80D: health cover, up to ${inrShort(CURRENT_FY.caps.section80D)}`, amount: CURRENT_FY.caps.section80D },
    { key: 'section80CCD1B', label: `NPS 80CCD(1B), up to ${inrShort(CURRENT_FY.caps.section80CCD1B)}`, amount: CURRENT_FY.caps.section80CCD1B },
    { key: 'hraExempt', label: 'HRA exemption, about 1L on 20k rent', amount: 100_000 },
    { key: 'homeLoanInterest', label: `Home loan interest, up to ${inrShort(CURRENT_FY.caps.homeLoanInterest24b)}`, amount: CURRENT_FY.caps.homeLoanInterest24b },
];

const Column: React.FC<{ title: string; total: number; maxTax: number; winner: boolean; note: string }> = ({ title, total, maxTax, winner, note }) => (
    <View style={{
        flex: 1,
        padding: 12,
        borderRadius: 14,
        borderWidth: winner ? 2 : 1,
        borderColor: winner ? COLORS.semantic.profit : COLORS.border.default,
        backgroundColor: winner ? COLORS.semantic.profitBg : COLORS.surface.primary,
    }}>
        <Text style={{ ...TYPE.caption, color: COLORS.text.secondary }}>{title}</Text>
        <Text style={{ ...TYPE.amountMd, color: winner ? COLORS.semantic.profit : COLORS.text.primary, marginTop: 2 }}>{inr(total)}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.surface.tertiary, marginTop: 8, overflow: 'hidden' }}>
            <View style={{ width: `${(total / maxTax) * 100}%`, height: 6, backgroundColor: winner ? COLORS.semantic.profit : COLORS.text.tertiary }} />
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginTop: 6 }}>{note}</Text>
    </View>
);

export const RegimeCompareExplorable: React.FC<{ initialIncome?: number }> = ({ initialIncome = 800_000 }) => {
    const [income, setIncome] = useState(initialIncome);
    const [on, setOn] = useState<Record<string, boolean>>({});

    const deductions = useMemo(() => {
        const d: OldRegimeDeductions = {};
        for (const t of TOGGLES) if (on[t.key]) d[t.key] = t.amount;
        return d;
    }, [on]);

    const cmp = useMemo(() => compareRegimes(income, deductions), [income, deductions]);
    const maxTax = Math.max(cmp.newRegime.total, cmp.oldRegime.total, 1);

    return (
        <View>
            <Slider
                label="Annual income"
                value={income}
                min={400_000}
                max={3_000_000}
                step={50_000}
                onChange={setIncome}
                format={(v) => inrShort(v)}
                minLabel="4L"
                maxLabel="30L"
            />

            <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginBottom: 8 }}>Old-regime deductions you claim</Text>
            {TOGGLES.map((t) => {
                const active = Boolean(on[t.key]);
                return (
                    <PressableScale
                        key={t.key}
                        onPress={() => setOn((s) => ({ ...s, [t.key]: !s[t.key] }))}
                        activeScale={0.985}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6,
                            borderRadius: 10, borderWidth: 1,
                            borderColor: active ? COLORS.brand.primary : COLORS.border.default,
                            backgroundColor: active ? COLORS.brand.soft : COLORS.surface.primary,
                        }}
                    >
                        <View style={{
                            width: 20, height: 20, borderRadius: 6, marginRight: 10,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: active ? COLORS.brand.primary : COLORS.surface.tertiary,
                        }}>
                            {active ? <Check size={13} color={COLORS.brand.onAccent} strokeWidth={3} /> : null}
                        </View>
                        <Text style={{ ...TYPE.callout, fontSize: 14, color: COLORS.text.primary, flex: 1 }}>{t.label}</Text>
                    </PressableScale>
                );
            })}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Column
                    title="New regime"
                    total={cmp.newRegime.total}
                    maxTax={maxTax}
                    winner={cmp.winner === 'new'}
                    note={cmp.newRegime.rebate > 0 ? `87A rebate wipes ${inr(cmp.newRegime.rebate)}` : `Std. deduction ${inrShort(CURRENT_FY.newRegime.standardDeduction)} only`}
                />
                <Column
                    title="Old regime"
                    total={cmp.oldRegime.total}
                    maxTax={maxTax}
                    winner={cmp.winner === 'old'}
                    note={`Deductions ${inrShort(cmp.oldRegime.deductions)}`}
                />
            </View>

            <Text style={{ ...TYPE.callout, color: COLORS.text.primary, marginTop: 14 }}>
                {cmp.winner === 'tie'
                    ? 'Both regimes owe the same here.'
                    : cmp.winner === 'new'
                        ? `New regime saves ${inr(cmp.newRegimeSaves)} a year at this income.`
                        : `Old regime saves ${inr(-cmp.newRegimeSaves)} a year, but only with every one of those deductions actually made.`}
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginTop: 6 }}>
                FY {CURRENT_FY.fy} slabs, salaried, under 60, including 4% cess. Source: incometax.gov.in
            </Text>
        </View>
    );
};
