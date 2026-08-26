/**
 * GuessSpendScreen
 *
 * Before showing the monthly total, ask the learner to guess it. People
 * reliably underestimate their own spending, and the gap between the guess and
 * the truth teaches more than the truth alone would.
 *
 * Playable once per month. The guess is kept so the learner can watch their
 * own calibration improve, which is the actual skill being trained.
 */
import React, { useMemo, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, Target, TrendingDown, TrendingUp, Check, History,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { patchProfile } from '../store/slices/authSlice';
import { scoreGuess, formatCompactINR } from '../utils/projections';
import AnimatedNumber from '../components/AnimatedNumber';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'GuessSpend'>;

const GRADE_STYLE: Record<string, { color: string; bg: string; border: string; line: string }> = {
    'spot on': { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', line: 'You know exactly where your money goes.' },
    'close': { color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', line: 'Good instincts. You are roughly tracking reality.' },
    'off': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', line: 'Not far off, but the gap is worth a look.' },
    'way off': { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', line: 'This is the gap most people have. Now you can see it.' },
};

const GuessSpendScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const { user, profile } = useAppSelector((s) => s.auth);
    const transactions = useAppSelector((s) => s.transactions.items);

    const [guess, setGuess] = useState('');
    const [revealed, setRevealed] = useState(false);
    const [celebrating, setCelebrating] = useState(false);

    const monthKey = new Date().toISOString().slice(0, 7);

    /** Total debits in the current month. */
    const actual = useMemo(
        () => transactions
            .filter((t) => t.type === 'debit' && (t.date || '').slice(0, 7) === monthKey)
            .reduce((sum, t) => sum + (t.amount || 0), 0),
        [transactions, monthKey]
    );

    const alreadyPlayed = profile?.spendGuesses?.[monthKey];
    const result = useMemo(() => {
        if (alreadyPlayed && !revealed) {
            return scoreGuess(alreadyPlayed.guess, alreadyPlayed.actual);
        }
        return revealed ? scoreGuess(parseFloat(guess) || 0, actual) : null;
    }, [alreadyPlayed, revealed, guess, actual]);

    const previous = useMemo(() => {
        const all = profile?.spendGuesses ?? {};
        return Object.entries(all)
            .filter(([month]) => month !== monthKey)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 3);
    }, [profile?.spendGuesses, monthKey]);

    const reveal = () => {
        const value = parseFloat(guess);
        if (!Number.isFinite(value) || value < 0) return;

        const scored = scoreGuess(value, actual);
        setRevealed(true);

        if (scored.grade === 'spot on' || scored.grade === 'close') {
            haptics.celebrate();
            setCelebrating(true);
        } else {
            haptics.warn();
        }

        if (user?.uid) {
            dispatch(patchProfile({
                uid: user.uid,
                patch: {
                    spendGuesses: {
                        ...(profile?.spendGuesses ?? {}),
                        [monthKey]: {
                            guess: value,
                            actual,
                            accuracy: scored.accuracy,
                            guessedAt: new Date().toISOString(),
                        },
                    },
                },
            }));
        }
    };

    const showResult = revealed || !!alreadyPlayed;
    const style = result ? GRADE_STYLE[result.grade] : GRADE_STYLE['close'];

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 py-3.5 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-extrabold text-gray-900">Guess Your Spend</Text>
                    <Text className="text-xs text-gray-400">Once a month, no peeking</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                {actual === 0 && !showResult ? (
                    <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center mt-8">
                        <Target size={32} color="#D1D5DB" />
                        <Text className="text-base font-bold text-gray-900 mt-3 text-center">
                            Nothing to guess yet
                        </Text>
                        <Text className="text-sm text-gray-500 mt-1.5 text-center leading-5">
                            Log a few transactions this month, then come back and test yourself.
                        </Text>
                    </View>
                ) : !showResult ? (
                    <>
                        <View className="items-center mb-6 mt-2">
                            <View className="w-16 h-16 rounded-3xl bg-indigo-50 items-center justify-center mb-4">
                                <Target size={30} color="#6366F1" />
                            </View>
                            <Text className="text-xl font-extrabold text-gray-900 text-center">
                                How much have you spent this month?
                            </Text>
                            <Text className="text-sm text-gray-500 text-center mt-2 leading-5">
                                No scrolling back through your transactions. Just your gut.
                            </Text>
                        </View>

                        <View className="bg-white rounded-2xl border-2 border-indigo-100 p-5 mb-4">
                            <View className="flex-row items-center justify-center">
                                <Text className="text-3xl font-bold text-gray-300 mr-1">₹</Text>
                                <TextInput
                                    value={guess}
                                    onChangeText={setGuess}
                                    keyboardType="numeric"
                                    autoFocus
                                    accessibilityLabel="Your guess"
                                    className="text-4xl font-extrabold text-gray-900 p-0 min-w-[140px]"
                                    placeholder="0"
                                    placeholderTextColor="#E5E7EB"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={reveal}
                            disabled={!guess || parseFloat(guess) <= 0}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            className={`rounded-2xl py-4 items-center ${guess && parseFloat(guess) > 0 ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                            <Text className="text-white font-bold text-base">Reveal the truth</Text>
                        </TouchableOpacity>
                    </>
                ) : result ? (
                    <>
                        <View
                            className="rounded-3xl p-5 mb-4 items-center"
                            style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: style.border }}
                        >
                            <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: style.color }}>
                                {result.grade}
                            </Text>
                            <AnimatedNumber
                                value={result.accuracy}
                                format={(v) => `${Math.round(v)}%`}
                                className="text-5xl font-extrabold mt-1"
                                style={{ color: style.color }}
                            />
                            <Text className="text-xs mt-1" style={{ color: style.color }}>accurate</Text>
                            <Text className="text-sm text-center mt-3 leading-5" style={{ color: style.color }}>
                                {style.line}
                            </Text>
                        </View>

                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4">
                                <Text className="text-xs text-gray-400 mb-1">You guessed</Text>
                                <Text className="text-lg font-bold text-gray-900">
                                    {formatCompactINR(result.guess)}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-4">
                                <Text className="text-xs text-gray-400 mb-1">You actually spent</Text>
                                <Text className="text-lg font-bold text-gray-900">
                                    {formatCompactINR(result.actual)}
                                </Text>
                            </View>
                        </View>

                        <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex-row items-center">
                            {result.underestimated
                                ? <TrendingUp size={20} color="#DC2626" />
                                : <TrendingDown size={20} color="#059669" />}
                            <Text className="text-sm text-gray-700 ml-3 flex-1 leading-5">
                                {result.difference === 0
                                    ? 'Exactly right. That is rare.'
                                    : result.underestimated
                                        ? `You spent ${formatCompactINR(result.difference)} more than you thought. Underestimating is the normal direction, and it is how budgets quietly break.`
                                        : `You spent ${formatCompactINR(result.difference)} less than you thought. Overestimating usually means you are already paying attention.`}
                            </Text>
                        </View>

                        {previous.length > 0 && (
                            <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                                <View className="flex-row items-center mb-3">
                                    <History size={14} color="#9CA3AF" />
                                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-1.5">
                                        Your past guesses
                                    </Text>
                                </View>
                                {previous.map(([month, entry]) => (
                                    <View key={month} className="flex-row justify-between py-1.5">
                                        <Text className="text-sm text-gray-600">{month}</Text>
                                        <Text className="text-sm font-semibold text-gray-900">
                                            {entry.accuracy}% accurate
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => { haptics.tap(); navigation.goBack(); }}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            className="bg-indigo-600 rounded-2xl py-4 items-center flex-row justify-center"
                        >
                            <Check size={18} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Done</Text>
                        </TouchableOpacity>

                        <Text className="text-xs text-gray-400 text-center mt-4">
                            Come back next month to see if your instincts have sharpened.
                        </Text>
                    </>
                ) : null}
            </ScrollView>

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default GuessSpendScreen;
