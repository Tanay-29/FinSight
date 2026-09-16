/**
 * StatementDecoderScreen
 *
 * Paste a credit-card statement summary (the SMS or the top of the email)
 * and it pulls out the four lines that matter, marks the one to pay and the
 * one to ignore, and shows what paying only the minimum would cost on this
 * exact balance. Parsing is on-device (utils/statementParser.ts); nothing
 * is stored or sent anywhere.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { ArrowLeft, Check, X, CalendarDays, AlertTriangle, ScanLine } from 'lucide-react-native';
import { parseStatement, SAMPLE_STATEMENT, ParsedStatement } from '../utils/statementParser';
import { minimumDuePayoff, inr, monthsLabel } from '../utils/moneyMath';
import { CREDIT_CARD } from '../data/taxConstants';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER } from '../theme/tokens';

const StatementDecoderScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const reduced = useReducedMotion();
    const [text, setText] = useState('');
    const [parsed, setParsed] = useState<ParsedStatement | null>(null);

    const decode = (input: string) => {
        haptics.commit();
        setParsed(parseStatement(input));
    };

    const found = parsed && (parsed.totalDue !== undefined || parsed.minimumDue !== undefined);
    const totalDue = parsed?.totalDue;
    const minOnly = useMemo(
        () => (totalDue ? minimumDuePayoff(totalDue, CREDIT_CARD.aprDefault) : null),
        [totalDue],
    );
    const utilisation = parsed?.totalDue && parsed?.creditLimit ? parsed.totalDue / parsed.creditLimit : null;

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <View className="flex-row items-center px-4 py-3 border-b border-border bg-surface-primary">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center rounded-full bg-surface-tertiary mr-3" activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
                    <ArrowLeft color={COLORS.text.primary} size={18} />
                </TouchableOpacity>
                <Text numberOfLines={1} className="text-lg font-inter-bold text-text-primary flex-1">Decode a statement</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: GUTTER, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={{ ...TYPE.body, color: COLORS.text.secondary, marginBottom: 14 }}>
                        Paste the statement SMS or the summary at the top of the email. It is read on your phone and not saved.
                    </Text>

                    <TextInput
                        multiline
                        value={text}
                        onChangeText={setText}
                        placeholder="Total Amount Due: Rs. 18,450 ..."
                        placeholderTextColor={COLORS.border.strong}
                        textAlignVertical="top"
                        style={{
                            minHeight: 140, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.strong,
                            backgroundColor: COLORS.surface.primary, color: COLORS.text.primary, fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22,
                        }}
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <PressableScale
                            onPress={() => decode(text)}
                            disabled={text.trim().length < 8}
                            accessibilityRole="button"
                            containerStyle={{ flex: 1 }}
                            style={{ height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim().length < 8 ? COLORS.surface.tertiary : COLORS.brand.primaryDark }}
                        >
                            <ScanLine size={16} color={text.trim().length < 8 ? COLORS.text.tertiary : COLORS.brand.onAccent} />
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: text.trim().length < 8 ? COLORS.text.tertiary : COLORS.brand.onAccent, marginLeft: 8 }}>Decode</Text>
                        </PressableScale>
                        <PressableScale
                            onPress={() => { haptics.tap(); setText(SAMPLE_STATEMENT); decode(SAMPLE_STATEMENT); }}
                            accessibilityRole="button"
                            style={{ height: 48, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border.strong, backgroundColor: COLORS.surface.primary }}
                        >
                            <Text style={{ ...TYPE.callout, color: COLORS.text.primary }}>Try an example</Text>
                        </PressableScale>
                    </View>

                    {parsed && !found ? (
                        <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(240)} style={{ marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: COLORS.semantic.alertBg }}>
                            <Text style={{ ...TYPE.callout, color: COLORS.semantic.alertAmber }}>Could not find a total or minimum due in that text.</Text>
                            <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text.secondary, marginTop: 4 }}>
                                Look for lines like "Total Amount Due" or "Minimum Amount Due" and paste those.
                            </Text>
                        </Animated.View>
                    ) : null}

                    {parsed && found ? (
                        <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(200)} style={{ marginTop: 20 }}>
                            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: COLORS.border.default, backgroundColor: COLORS.surface.primary, overflow: 'hidden' }}>
                                {parsed.totalDue !== undefined ? (
                                    <Line icon={<Check size={16} color={COLORS.semantic.profit} strokeWidth={3} />} label="Total amount due" value={inr(parsed.totalDue)} note="Pay this. In full, by the due date, and the card costs nothing." tone="good" />
                                ) : null}
                                {parsed.minimumDue !== undefined ? (
                                    <Line icon={<X size={16} color={COLORS.semantic.alertCritical} strokeWidth={3} />} label="Minimum amount due" value={inr(parsed.minimumDue)} note="Not this. It keeps the account open and starts interest on everything else." tone="bad" />
                                ) : null}
                                {parsed.dueDate ? (
                                    <Line icon={<CalendarDays size={16} color={COLORS.text.secondary} />} label="Due date" value={parsed.dueDate} note="Set auto-pay for the total, or a reminder two days before." />
                                ) : null}
                                {parsed.financeCharge !== undefined && parsed.financeCharge > 0 ? (
                                    <Line icon={<AlertTriangle size={16} color={COLORS.semantic.alertAmber} />} label="Finance charges" value={inr(parsed.financeCharge)} note="Interest was charged last cycle, so a balance was carried. This is the cost of that." tone="warn" />
                                ) : null}
                                {utilisation !== null ? (
                                    <Line icon={<AlertTriangle size={16} color={utilisation > 0.3 ? COLORS.semantic.alertAmber : COLORS.text.secondary} />} label="Limit in use" value={`${Math.round(utilisation * 100)}%`} note={utilisation > 0.3 ? 'Above 30 percent. This is what the bureau sees on statement day.' : 'Under 30 percent, which reads as comfortable to lenders.'} tone={utilisation > 0.3 ? 'warn' : undefined} last />
                                ) : null}
                            </View>

                            {minOnly && parsed.totalDue ? (
                                <View style={{ marginTop: 14, padding: 16, borderRadius: 14, backgroundColor: COLORS.semantic.lossBg }}>
                                    <Text style={{ ...TYPE.caption, color: COLORS.semantic.alertCritical, marginBottom: 4 }}>If you paid only the minimum from here</Text>
                                    <Text style={{ ...TYPE.body, color: COLORS.text.primary }}>
                                        {inr(parsed.totalDue)} at {Math.round(CREDIT_CARD.aprDefault * 100)}% takes {monthsLabel(minOnly.months)}{minOnly.cleared ? '' : ' or more'} to clear and costs {inr(minOnly.totalInterest)} in interest, with no new spending at all.
                                    </Text>
                                </View>
                            ) : null}

                            <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginTop: 18, marginBottom: 6 }}>What was read</Text>
                            {parsed.evidence.map((e) => (
                                <Text key={e.field} numberOfLines={1} style={{ fontFamily: FONTS.regular, fontSize: 12, color: COLORS.text.tertiary, marginBottom: 2 }}>
                                    {e.line}
                                </Text>
                            ))}
                        </Animated.View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const Line: React.FC<{ icon: React.ReactNode; label: string; value: string; note: string; tone?: 'good' | 'bad' | 'warn'; last?: boolean }> = ({ icon, label, value, note, tone, last }) => (
    <View style={{
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: COLORS.border.default,
        backgroundColor: tone === 'good' ? COLORS.semantic.profitBg : tone === 'bad' ? COLORS.semantic.lossBg : 'transparent',
    }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {icon}
                <Text style={{ ...TYPE.callout, color: COLORS.text.primary, marginLeft: 8 }}>{label}</Text>
            </View>
            <Text style={{ ...TYPE.amountMd, color: tone === 'good' ? COLORS.semantic.profit : tone === 'bad' ? COLORS.semantic.alertCritical : COLORS.text.primary }}>{value}</Text>
        </View>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary, marginTop: 4 }}>{note}</Text>
    </View>
);

export default StatementDecoderScreen;
