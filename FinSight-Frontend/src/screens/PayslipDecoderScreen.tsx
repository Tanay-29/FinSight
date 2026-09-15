/**
 * PayslipDecoderScreen
 *
 * Paste a payslip; it files every line as an earning or a deduction, says
 * what each one is in a sentence, checks that the net adds up, and flags
 * the things worth an email to payroll. On-device, nothing stored.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { ArrowLeft, AlertTriangle, ScanLine, ArrowDownRight, ArrowUpRight, HelpCircle } from 'lucide-react-native';
import { parsePayslip, SAMPLE_PAYSLIP, ParsedPayslip, PayslipLine } from '../utils/payslipParser';
import { inr } from '../utils/moneyMath';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER } from '../theme/tokens';

const PayslipDecoderScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const reduced = useReducedMotion();
    const [text, setText] = useState('');
    const [parsed, setParsed] = useState<ParsedPayslip | null>(null);

    const decode = (input: string) => { haptics.commit(); setParsed(parsePayslip(input)); };
    const ready = text.trim().length >= 8;
    const found = parsed && parsed.lines.length > 0;

    const group = (kind: PayslipLine['kind']) => parsed?.lines.filter((l) => l.kind === kind) ?? [];
    const net = parsed?.netPrinted ?? parsed?.netComputed ?? 0;

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <View className="flex-row items-center px-4 py-3 border-b border-border bg-surface-primary">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center rounded-full bg-surface-tertiary mr-3" activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
                    <ArrowLeft color={COLORS.text.primary} size={18} />
                </TouchableOpacity>
                <Text numberOfLines={1} className="text-lg font-inter-bold text-text-primary flex-1">Decode a payslip</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: GUTTER, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={{ ...TYPE.body, color: COLORS.text.secondary, marginBottom: 14 }}>
                        Paste the lines from your payslip, one per line with the amount at the end. Read on your phone, not saved.
                    </Text>

                    <TextInput
                        multiline value={text} onChangeText={setText}
                        placeholder={'Basic 20,000\nHRA 10,000\nEmployee PF 2,400 ...'}
                        placeholderTextColor={COLORS.border.strong} textAlignVertical="top"
                        style={{ minHeight: 160, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.strong, backgroundColor: COLORS.surface.primary, color: COLORS.text.primary, fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22 }}
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <PressableScale onPress={() => decode(text)} disabled={!ready} accessibilityRole="button" containerStyle={{ flex: 1 }}
                            style={{ height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ready ? COLORS.brand.primaryDark : COLORS.surface.tertiary }}>
                            <ScanLine size={16} color={ready ? COLORS.brand.onAccent : COLORS.text.tertiary} />
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: ready ? COLORS.brand.onAccent : COLORS.text.tertiary, marginLeft: 8 }}>Decode</Text>
                        </PressableScale>
                        <PressableScale onPress={() => { haptics.tap(); setText(SAMPLE_PAYSLIP); decode(SAMPLE_PAYSLIP); }} accessibilityRole="button"
                            style={{ height: 48, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border.strong, backgroundColor: COLORS.surface.primary }}>
                            <Text style={{ ...TYPE.callout, color: COLORS.text.primary }}>Try an example</Text>
                        </PressableScale>
                    </View>

                    {parsed && !found ? (
                        <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(240)} style={{ marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: COLORS.semantic.alertBg }}>
                            <Text style={{ ...TYPE.callout, color: COLORS.semantic.alertAmber }}>No lines with amounts found.</Text>
                            <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text.secondary, marginTop: 4 }}>Each line should end with a number, like "Basic 20,000".</Text>
                        </Animated.View>
                    ) : null}

                    {parsed && found ? (
                        <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(260)} style={{ marginTop: 20 }}>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                                <Tile label="Earnings" value={inr(parsed.earnings)} color={COLORS.semantic.profit} />
                                <Tile label="Deductions" value={inr(parsed.deductions)} color={COLORS.semantic.alertCritical} />
                                <Tile label="Net" value={inr(net)} color={COLORS.text.primary} />
                            </View>

                            {parsed.flags.length > 0 ? (
                                <View style={{ padding: 14, borderRadius: 14, backgroundColor: COLORS.semantic.alertBg, marginBottom: 14 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <AlertTriangle size={14} color={COLORS.semantic.alertAmber} />
                                        <Text style={{ ...TYPE.caption, color: COLORS.semantic.alertAmber, marginLeft: 6 }}>Worth asking payroll</Text>
                                    </View>
                                    {parsed.flags.map((f) => (
                                        <Text key={f} style={{ fontFamily: FONTS.regular, fontSize: 13, lineHeight: 19, color: COLORS.text.primary, marginBottom: 4 }}>{'•'} {f}</Text>
                                    ))}
                                </View>
                            ) : (
                                <View style={{ padding: 14, borderRadius: 14, backgroundColor: COLORS.semantic.profitBg, marginBottom: 14 }}>
                                    <Text style={{ ...TYPE.caption, color: COLORS.semantic.profit }}>Everything adds up and nothing looks unusual.</Text>
                                </View>
                            )}

                            <Section title="Earnings" icon={<ArrowUpRight size={14} color={COLORS.semantic.profit} />} lines={group('earning')} />
                            <Section title="Deductions" icon={<ArrowDownRight size={14} color={COLORS.semantic.alertCritical} />} lines={group('deduction')} />
                            {group('unknown').length > 0 ? (
                                <Section title="Not filed" icon={<HelpCircle size={14} color={COLORS.text.tertiary} />} lines={group('unknown')} note="Read but not recognised. Employer-side items and totals land here; so does anything with an unusual label." />
                            ) : null}
                        </Animated.View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const Tile: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary }}>{label}</Text>
        <Text numberOfLines={1} style={{ ...TYPE.amountSm, color, marginTop: 2 }}>{value}</Text>
    </View>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; lines: PayslipLine[]; note?: string }> = ({ title, icon, lines, note }) => (
    lines.length === 0 ? null : (
        <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {icon}
                <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginLeft: 6 }}>{title}</Text>
            </View>
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary, overflow: 'hidden' }}>
                {lines.map((l, i) => (
                    <View key={`${l.label}-${i}`} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < lines.length - 1 ? 1 : 0, borderBottomColor: COLORS.border.default }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ ...TYPE.callout, color: COLORS.text.primary, flex: 1, marginRight: 10 }}>{l.label}</Text>
                            <Text style={{ ...TYPE.amountSm, color: COLORS.text.primary }}>{inr(l.amount)}</Text>
                        </View>
                        {l.note ? <Text style={{ fontFamily: FONTS.regular, fontSize: 12, lineHeight: 17, color: COLORS.text.secondary, marginTop: 2 }}>{l.note}</Text> : null}
                    </View>
                ))}
            </View>
            {note ? <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginTop: 6 }}>{note}</Text> : null}
        </View>
    )
);

export default PayslipDecoderScreen;
