/**
 * AddTransactionScreen
 *
 * Paste a bank message and the amount, merchant and category are read out of
 * it; or fill the three fields by hand.
 *
 * The three validation failures here used to be Alert dialogs. An Alert is the
 * right shape for "this cannot be undone", not for "you have not pasted
 * anything yet": it takes over the screen, has to be dismissed, and puts the
 * message somewhere other than the field it is about. They are one inline line
 * under the paste box now, next to the thing that needs fixing.
 */
import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, ActivityIndicator, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Sparkles, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addTransaction, fetchCategoryCorrections } from '../store/slices/transactionsSlice';
import { parseBankSMS } from '../utils/smartCategorizer';
import { CATEGORIES, INCOME_SOURCES } from '../utils/categories';
import { PressableScale } from '../components/PressableScale';
import * as haptics from '../utils/haptics';

export default function AddTransactionScreen() {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const { syncStatus, corrections } = useAppSelector((state) => state.transactions);

    // Load what the user has already taught the categoriser, so a paste lands
    // in the right category first time for merchants the rules do not know.
    useEffect(() => {
        dispatch(fetchCategoryCorrections());
    }, [dispatch]);

    const [smsText, setSmsText] = useState('');
    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    // Spending and income are filed against different lists, so each type
    // remembers its own choice rather than carrying a nonsensical one across.
    const [category, setCategory] = useState('other');
    const [incomeSource, setIncomeSource] = useState('allowance');
    const [type, setType] = useState<'debit' | 'credit'>('debit');
    const [isParsed, setIsParsed] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const handleSmartPaste = () => {
        if (!smsText.trim()) {
            setNotice('Paste a bank message above first.');
            return;
        }

        const extracted = parseBankSMS(smsText, corrections);

        if (extracted.amount === 0) {
            setNotice('No amount found. The message needs to contain INR, Rs or the rupee sign.');
            return;
        }

        setNotice(null);
        setAmount(extracted.amount.toString());
        setMerchant(extracted.merchant);
        setType(extracted.type as 'debit' | 'credit');
        if (extracted.type === 'debit') setCategory(extracted.category);
        setIsParsed(true);
        haptics.success();
    };

    const handleSave = async () => {
        if (!amount || !merchant) {
            setNotice(type === 'debit'
                ? 'An amount and a merchant are both needed to save.'
                : 'An amount and a source are both needed to save.');
            return;
        }

        try {
            await dispatch(addTransaction({
                amount: parseFloat(amount),
                merchant,
                category: type === 'debit' ? category : incomeSource,
                type,
                date: new Date().toISOString(),
                source: isParsed ? 'auto' : 'manual',
            })).unwrap();

            haptics.commit();
            navigation.goBack();
        } catch {
            setNotice('That did not save. Check your connection and try again.');
        }
    };

    /** The segmented control marks its selection with colour, not movement. */
    const segmentStyle = (active: boolean): ViewStyle => ({
        backgroundColor: active ? '#FFFFFF' : 'transparent',
        transitionProperty: ['backgroundColor'],
        transitionDuration: reduced ? 0 : 150,
        transitionTimingFunction: 'ease-out',
    } as ViewStyle);

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <View className="px-4 py-4 flex-row items-center border-b border-border bg-white">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-3"
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <ChevronLeft size={28} color="#111827" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-text-primary">Add a transaction</Text>
                </View>

                <ScrollView
                    className="flex-1 px-4 pt-4"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6">
                        <View className="flex-row items-center mb-2">
                            <Sparkles size={18} color="#4F46E5" />
                            <Text className="text-base font-bold text-indigo-700 ml-2">Smart paste</Text>
                        </View>
                        <Text className="text-xs text-indigo-600/80 mb-3">
                            Paste your bank SMS below and the amount, merchant and category are
                            read out of it.
                        </Text>
                        <TextInput
                            className="bg-white border border-indigo-100 rounded-xl p-3 text-sm text-text-primary mb-3 min-h-[80px]"
                            placeholder="e.g. INR 649.00 debited from A/c XX1234 at NETFLIX on 21-Mar-26"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                            value={smsText}
                            onChangeText={(text) => {
                                setSmsText(text);
                                setIsParsed(false);
                                setNotice(null);
                            }}
                        />

                        {notice && (
                            <Animated.View
                                entering={FadeIn.duration(180)}
                                className="flex-row items-start mb-3"
                            >
                                <AlertCircle size={13} color="#DC2626" style={{ marginTop: 2 }} />
                                <Text className="text-xs text-loss ml-1.5 flex-1 leading-4">
                                    {notice}
                                </Text>
                            </Animated.View>
                        )}

                        <PressableScale
                            onPress={handleSmartPaste}
                            accessibilityRole="button"
                            className={`flex-row justify-center items-center py-3 rounded-xl ${isParsed ? 'bg-profit' : 'bg-indigo-600'}`}
                        >
                            {isParsed ? <CheckCircle2 size={18} color="white" /> : <Sparkles size={18} color="white" />}
                            <Text className="text-white font-bold ml-2">
                                {isParsed ? 'Filled in below' : 'Read this message'}
                            </Text>
                        </PressableScale>
                    </View>

                    <Text className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">
                        Details
                    </Text>

                    <View className="flex-row bg-surface-tertiary rounded-xl p-1 mb-4">
                        {(['debit', 'credit'] as const).map((t) => (
                            <TouchableOpacity
                                key={t}
                                className="flex-1"
                                onPress={() => { haptics.select(); setType(t); }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: type === t }}
                            >
                                <Animated.View
                                    className="py-2 rounded-lg items-center"
                                    style={segmentStyle(type === t)}
                                >
                                    <Text
                                        className={`font-semibold ${
                                            type === t
                                                ? t === 'debit' ? 'text-alert-critical' : 'text-profit'
                                                : 'text-text-secondary'
                                        }`}
                                    >
                                        {t === 'debit' ? 'Expense' : 'Income'}
                                    </Text>
                                </Animated.View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1 bg-white border border-border rounded-xl p-3">
                            <Text className="text-xs text-text-secondary mb-1">Amount (₹)</Text>
                            <TextInput
                                className="text-xl font-bold text-text-primary p-0"
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#9CA3AF"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                        <View className="flex-1 bg-white border border-border rounded-xl p-3">
                            <Text className="text-xs text-text-secondary mb-1">
                                {type === 'debit' ? 'Merchant' : 'From'}
                            </Text>
                            <TextInput
                                className="text-lg font-semibold text-text-primary p-0"
                                placeholder={type === 'debit' ? 'e.g. Zomato' : 'e.g. Dad'}
                                placeholderTextColor="#9CA3AF"
                                value={merchant}
                                onChangeText={setMerchant}
                            />
                        </View>
                    </View>

                    <View className="bg-white border border-border rounded-xl p-4 mb-8">
                        <Text className="text-xs text-text-secondary mb-3">
                            {type === 'debit' ? 'Category' : 'Where it came from'}
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {(type === 'debit' ? CATEGORIES : INCOME_SOURCES).map(({ key, label }) => {
                                const selected = type === 'debit' ? category === key : incomeSource === key;
                                return (
                                    <PressableScale
                                        key={key}
                                        onPress={() => {
                                            haptics.select();
                                            if (type === 'debit') setCategory(key);
                                            else setIncomeSource(key);
                                        }}
                                        activeScale={0.94}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        className={`px-3 py-2 rounded-full border ${selected ? 'bg-brand-primary border-brand-primary' : 'bg-surface-secondary border-border'}`}
                                    >
                                        <Text className={`text-sm ${selected ? 'text-white font-bold' : 'text-text-primary'}`}>
                                            {label}
                                        </Text>
                                    </PressableScale>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                <View className="p-4 bg-white border-t border-border">
                    <PressableScale
                        onPress={handleSave}
                        disabled={!amount || syncStatus === 'syncing'}
                        accessibilityRole="button"
                        className={`py-4 rounded-xl items-center ${(!amount || syncStatus === 'syncing') ? 'bg-brand-primary/40' : 'bg-brand-primary'}`}
                    >
                        {syncStatus === 'syncing' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-lg font-bold">Save</Text>
                        )}
                    </PressableScale>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
