/**
 * AddTransactionScreen: write down money that went out or came in.
 *
 * Amount first, because that is the one thing everybody knows when they open
 * this. It is large, in the middle, and its colour says which way the money
 * moved. Then where it went (or where it came from) and a grid of categories
 * with their icons, the same icons the lists use.
 *
 * Pasting a bank message is still here, one tap down: it fills the amount,
 * the merchant and the category, and the fields stay editable afterwards.
 *
 * Problems are one line above the Save button, next to what needs fixing,
 * never a dialog.
 */
import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
    X, ClipboardPaste, ChevronDown, Check, AlertCircle, Users, Briefcase, Laptop, GraduationCap, RotateCcw, Gift, Wallet,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addTransaction, fetchCategoryCorrections } from '../store/slices/transactionsSlice';
import { parseBankSMS } from '../utils/smartCategorizer';
import { CATEGORIES, INCOME_SOURCES, IncomeSource } from '../utils/categories';
import { CATEGORY_ICON_MAP } from '../components/TransactionRow';
import { PressableScale } from '../components/PressableScale';
import { AmountInput } from '../components/AmountInput';
import { inr } from '../utils/moneyMath';
import * as haptics from '../utils/haptics';
import { COLORS, CATEGORY_COLORS, categoryTint, FONTS, TYPE, GUTTER, RADIUS } from '../theme/tokens';

/**
 * "1,200", "₹ 1200.50" and "1200" are all the same amount. Null when the text
 * is not a positive amount.
 */
const toAmount = (raw: string): number | null => {
    const n = Number(raw.replace(/[₹,\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/** A green that white text reads on in both themes; the semantic one lifts in dark. */
const INCOME_FILL = '#0E7C5A';

const INCOME_ICONS: Record<IncomeSource, React.ComponentType<{ size?: number; color?: string }>> = {
    allowance: Users,
    salary: Briefcase,
    freelance: Laptop,
    scholarship: GraduationCap,
    refund: RotateCcw,
    gift: Gift,
    other_income: Wallet,
};

/** One square in the category grid. */
const Tile: React.FC<{
    label: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string; tint: string; selected: boolean; onPress: () => void;
}> = ({ label, icon, color, tint, selected, onPress }) => (
    <PressableScale
        onPress={onPress}
        activeScale={0.94}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        containerStyle={{ width: '25%', padding: 4 }}
        style={{
            alignItems: 'center', paddingVertical: 12, borderRadius: RADIUS.tile,
            backgroundColor: selected ? tint : 'transparent',
            borderWidth: 1.5, borderColor: selected ? color : 'transparent',
        }}
    >
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? color : tint }}>
            {React.createElement(icon, { size: 19, color: selected ? COLORS.surface.primary : color })}
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...TYPE.caption, fontSize: 12, marginTop: 6, color: selected ? COLORS.text.primary : COLORS.text.secondary, fontFamily: selected ? FONTS.semibold : FONTS.medium }}>
            {label}
        </Text>
    </PressableScale>
);

export default function AddTransactionScreen() {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const { corrections } = useAppSelector((state) => state.transactions);

    // Load what the user has already taught the categoriser, so a paste lands
    // in the right category first time for merchants the rules do not know.
    useEffect(() => {
        dispatch(fetchCategoryCorrections());
    }, [dispatch]);

    const [smsText, setSmsText] = useState('');
    const [pasteOpen, setPasteOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    // Spending and income are filed against different lists, so each type
    // remembers its own choice rather than carrying a nonsensical one across.
    const [category, setCategory] = useState('other');
    const [incomeSource, setIncomeSource] = useState<string>('allowance');
    const [type, setType] = useState<'debit' | 'credit'>('debit');
    const [isParsed, setIsParsed] = useState(false);
    // What the parser guessed, kept apart from `category` so a later edit in
    // the grid does not erase the record of what was guessed.
    const [predictedCategory, setPredictedCategory] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    // Local, not the slice's syncStatus: a background refresh of the list
    // should not turn this button into a spinner.
    const [saving, setSaving] = useState(false);

    const isDebit = type === 'debit';
    const accent = isDebit ? COLORS.text.primary : COLORS.semantic.profit;
    const value = toAmount(amount);

    const readMessage = () => {
        if (!smsText.trim()) {
            setNotice('Paste a bank message first.');
            return;
        }
        const extracted = parseBankSMS(smsText, corrections);
        if (extracted.amount === 0) {
            setNotice('No amount in that message. It needs INR, Rs or ₹ before the number.');
            return;
        }
        setNotice(null);
        setAmount(String(extracted.amount));
        setMerchant(extracted.merchant);
        setType(extracted.type as 'debit' | 'credit');
        if (extracted.type === 'debit') {
            setCategory(extracted.category);
            setPredictedCategory(extracted.category);
        } else {
            setPredictedCategory(null);
        }
        setIsParsed(true);
        setPasteOpen(false);
        haptics.success();
    };

    const save = async () => {
        if (value === null) {
            setNotice('Enter an amount above zero, like 250 or 1,200.');
            return;
        }
        if (!merchant.trim()) {
            setNotice(isDebit ? 'Add where you spent it.' : 'Add where it came from.');
            return;
        }
        setSaving(true);
        try {
            await dispatch(addTransaction({
                amount: value,
                merchant: merchant.trim(),
                category: isDebit ? category : incomeSource,
                type,
                date: new Date().toISOString(),
                source: isParsed ? 'auto' : 'manual',
                ...(isDebit && predictedCategory ? { predictedCategory } : {}),
            })).unwrap();
            haptics.commit();
            navigation.goBack();
        } catch {
            setNotice('That did not save. Check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {/* Close, and which way the money moved. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 4 }}>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.tertiary }}
                    >
                        <X size={18} color={COLORS.text.secondary} />
                    </Pressable>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', padding: 3, borderRadius: 20, backgroundColor: COLORS.surface.tertiary }}>
                            {(['debit', 'credit'] as const).map((t) => {
                                const on = type === t;
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() => { haptics.select(); setType(t); setNotice(null); }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: on }}
                                        style={{ paddingHorizontal: 18, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? COLORS.surface.primary : 'transparent' }}
                                    >
                                        <Text style={{ ...TYPE.caption, fontFamily: FONTS.semibold, color: on ? (t === 'debit' ? COLORS.text.primary : COLORS.semantic.profit) : COLORS.text.tertiary }}>
                                            {t === 'debit' ? 'Spent' : 'Received'}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* The amount. */}
                    <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 4 }}>
                        <AmountInput
                            value={amount}
                            onChange={(t) => { setAmount(t); setNotice(null); }}
                            color={accent}
                            prefix={isDebit ? '₹' : '+₹'}
                            decimals
                            autoFocus={!isParsed}
                            label="Amount"
                            size={58}
                        />
                        <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginTop: 2 }}>
                            {isDebit ? 'How much did you spend?' : 'How much came in?'}
                        </Text>
                    </View>

                    {/* Where. */}
                    <View style={{ marginHorizontal: GUTTER, marginTop: 18, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, paddingHorizontal: 16, paddingVertical: 12 }}>
                        <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary }}>{isDebit ? 'Where' : 'From'}</Text>
                        <TextInput
                            value={merchant}
                            onChangeText={(t) => { setMerchant(t); setNotice(null); }}
                            placeholder={isDebit ? 'Zomato, metro card, rent' : 'Dad, internship, refund'}
                            placeholderTextColor={COLORS.text.tertiary}
                            maxLength={40}
                            accessibilityLabel={isDebit ? 'Where you spent it' : 'Where it came from'}
                            style={{ ...TYPE.body, fontFamily: FONTS.semibold, fontSize: 17, color: COLORS.text.primary, padding: 0, marginTop: 4, height: 28 }}
                        />
                    </View>

                    {/* What for. */}
                    <Text style={{ ...TYPE.micro, color: COLORS.text.tertiary, marginHorizontal: GUTTER, marginTop: 22, marginBottom: 6 }}>
                        {isDebit ? 'Category' : 'Source'}
                    </Text>
                    <Animated.View key={type} entering={reduced ? undefined : FadeIn.duration(180)} style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: GUTTER - 4 }}>
                        {isDebit
                            ? CATEGORIES.map(({ key, label }) => (
                                <Tile
                                    key={key}
                                    label={label === 'Rent & Housing' ? 'Rent' : label}
                                    icon={CATEGORY_ICON_MAP[key]}
                                    color={CATEGORY_COLORS[key]}
                                    tint={categoryTint(key)}
                                    selected={category === key}
                                    onPress={() => { haptics.select(); setCategory(key); }}
                                />
                            ))
                            : INCOME_SOURCES.map(({ key, label }) => (
                                <Tile
                                    key={key}
                                    label={label === 'Something else' ? 'Other' : label === 'From family' ? 'Family' : label}
                                    icon={INCOME_ICONS[key]}
                                    color={COLORS.semantic.profit}
                                    tint={COLORS.semantic.profitBg}
                                    selected={incomeSource === key}
                                    onPress={() => { haptics.select(); setIncomeSource(key); }}
                                />
                            ))}
                    </Animated.View>

                    {/* Or read it from a bank message. */}
                    <Animated.View layout={reduced ? undefined : LinearTransition.duration(220)} style={{ marginHorizontal: GUTTER, marginTop: 18, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, overflow: 'hidden' }}>
                        <Pressable
                            onPress={() => { haptics.tap(); setPasteOpen((o) => !o); }}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: pasteOpen }}
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                        >
                            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isParsed ? COLORS.semantic.profitBg : COLORS.brand.soft }}>
                                {isParsed ? <Check size={17} color={COLORS.semantic.profit} strokeWidth={2.6} /> : <ClipboardPaste size={17} color={COLORS.brand.link} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.primary }}>
                                    {isParsed ? 'Filled from your message' : 'Paste a bank message'}
                                </Text>
                                <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginTop: 1 }}>
                                    {isParsed ? 'Check the details above' : 'Fills the amount, place and category'}
                                </Text>
                            </View>
                            <ChevronDown size={18} color={COLORS.text.tertiary} style={{ transform: [{ rotate: pasteOpen ? '180deg' : '0deg' }] }} />
                        </Pressable>
                        {pasteOpen ? (
                            <Animated.View entering={reduced ? undefined : FadeInDown.duration(200)} style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                                <TextInput
                                    value={smsText}
                                    onChangeText={(t) => { setSmsText(t); setIsParsed(false); setNotice(null); }}
                                    placeholder="INR 649.00 debited from A/c XX1234 at NETFLIX on 21-Mar-26"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    multiline
                                    textAlignVertical="top"
                                    accessibilityLabel="Bank message"
                                    style={{ ...TYPE.caption, fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: COLORS.text.primary, minHeight: 84, padding: 12, borderRadius: RADIUS.control, backgroundColor: COLORS.surface.secondary }}
                                />
                                <PressableScale
                                    onPress={readMessage}
                                    accessibilityRole="button"
                                    style={{ marginTop: 10, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.soft }}
                                >
                                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.brand.link }}>Read this message</Text>
                                </PressableScale>
                            </Animated.View>
                        ) : null}
                    </Animated.View>
                </ScrollView>

                <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 10 }}>
                    {notice ? (
                        <Animated.View entering={FadeIn.duration(180)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                            <AlertCircle size={14} color={COLORS.semantic.alertCritical} />
                            <Text style={{ ...TYPE.caption, color: COLORS.semantic.alertCritical, marginLeft: 6 }}>{notice}</Text>
                        </Animated.View>
                    ) : null}
                    <PressableScale
                        onPress={save}
                        disabled={saving}
                        accessibilityRole="button"
                        style={{ height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: value ? (isDebit ? COLORS.brand.primaryDark : INCOME_FILL) : COLORS.surface.tertiary }}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={{ ...TYPE.callout, fontSize: 16, fontFamily: FONTS.semibold, color: value ? '#FFFFFF' : COLORS.text.tertiary }}>
                                {value ? `Save ₹${inr(value)}` : 'Save'}
                            </Text>
                        )}
                    </PressableScale>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
