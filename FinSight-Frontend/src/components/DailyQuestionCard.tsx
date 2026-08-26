/**
 * DailyQuestionCard
 *
 * One question a day on the Feed. Fifteen seconds, no streak attached, so it
 * costs nothing to answer and nothing to skip. It exists to give someone with
 * no appetite for a full module a reason to open the app anyway.
 *
 * Once answered, the card collapses to the explanation for the rest of the day
 * rather than disappearing, so the learning survives the interaction.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Sun, Check, X as XIcon, Sparkles } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { patchProfile } from '../store/slices/authSlice';
import { questionForDate } from '../data/dailyQuestions';
import { toDateKey } from '../utils/streak';
import * as haptics from '../utils/haptics';

export const DailyQuestionCard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, profile } = useAppSelector((s) => s.auth);

    const today = toDateKey();
    const question = useMemo(() => questionForDate(today), [today]);
    const answeredToday = profile?.lastDailyDate === today;

    const [choice, setChoice] = useState<number | null>(null);
    const fade = useMemo(() => new Animated.Value(0), []);

    // Already done today: show the takeaway rather than the question again.
    if (answeredToday && choice === null) {
        return (
            <View className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
                <View className="flex-row items-center mb-2">
                    <Sun size={15} color="#F59E0B" />
                    <Text className="text-xs font-bold text-amber-600 uppercase tracking-wide ml-1.5">
                        Today's question, answered
                    </Text>
                </View>
                <Text className="text-sm font-semibold text-gray-800 leading-5">{question.question}</Text>
                <Text className="text-xs text-gray-500 leading-5 mt-2">{question.explanation}</Text>
                <Text className="text-xs text-gray-400 mt-3">A new one lands tomorrow.</Text>
            </View>
        );
    }

    const answered = choice !== null;
    const correct = choice === question.answerIndex;

    const pick = (index: number) => {
        if (answered) return;
        setChoice(index);

        const isRight = index === question.answerIndex;
        isRight ? haptics.success() : haptics.warn();

        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();

        if (user?.uid) {
            dispatch(patchProfile({
                uid: user.uid,
                patch: {
                    lastDailyDate: today,
                    dailyAnswered: (profile?.dailyAnswered ?? 0) + 1,
                    dailyCorrect: (profile?.dailyCorrect ?? 0) + (isRight ? 1 : 0),
                },
            }));
        }
    };

    const optionStyle = (i: number) => {
        if (!answered) return 'bg-white border-gray-200';
        if (i === question.answerIndex) return 'bg-emerald-50 border-emerald-300';
        if (i === choice) return 'bg-red-50 border-red-300';
        return 'bg-white border-gray-100';
    };

    const streakLine = profile?.dailyAnswered
        ? `${profile.dailyCorrect ?? 0} of ${profile.dailyAnswered} right so far`
        : 'First one';

    return (
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-amber-100 overflow-hidden">
            <View className="bg-amber-50 px-4 py-2.5 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Sun size={15} color="#F59E0B" />
                    <Text className="text-xs font-bold text-amber-700 uppercase tracking-wide ml-1.5">
                        Question of the day
                    </Text>
                </View>
                <Text className="text-xs text-amber-600">{streakLine}</Text>
            </View>

            <View className="p-4">
                <Text className="text-sm font-bold text-gray-900 leading-5 mb-3">
                    {question.question}
                </Text>

                {question.options.map((option, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => pick(i)}
                        disabled={answered}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={option}
                        className={`border rounded-xl px-3.5 py-3 mb-2 flex-row items-center ${optionStyle(i)}`}
                    >
                        <Text className="text-sm text-gray-700 flex-1 leading-5">{option}</Text>
                        {answered && i === question.answerIndex && <Check size={16} color="#10B981" />}
                        {answered && i === choice && i !== question.answerIndex && (
                            <XIcon size={16} color="#EF4444" />
                        )}
                    </TouchableOpacity>
                ))}

                {answered && (
                    <Animated.View style={{ opacity: fade }} className="mt-1">
                        <View className={`rounded-xl p-3.5 ${correct ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                            <View className="flex-row items-center mb-1">
                                <Sparkles size={13} color={correct ? '#059669' : '#D97706'} />
                                <Text
                                    className="text-xs font-bold ml-1.5"
                                    style={{ color: correct ? '#059669' : '#D97706' }}
                                >
                                    {correct ? 'Correct' : 'Not quite'}
                                </Text>
                            </View>
                            <Text className="text-xs text-gray-700 leading-5">{question.explanation}</Text>
                        </View>
                    </Animated.View>
                )}
            </View>
        </View>
    );
};

export default DailyQuestionCard;
