/**
 * MoneyPersonalityScreen
 *
 * Eight questions, one archetype, two minutes. Retakeable from Profile.
 *
 * The result is stored on the user profile and read by the Learn tab to order
 * courses, so this is personalisation the learner can feel rather than a
 * decorative quiz.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, ChevronRight, RefreshCw, Check,
    ClipboardList, PiggyBank, Sparkles, EyeOff, Flame, Compass,
} from 'lucide-react-native';
import {
    PERSONALITY_QUESTIONS, ARCHETYPES, scorePersonality, ArchetypeId,
} from '../data/moneyPersonality';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { patchProfile } from '../store/slices/authSlice';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'MoneyPersonality'>;

const ARCHETYPE_ICONS: Record<ArchetypeId, React.ComponentType<{ size?: number; color?: string }>> = {
    planner: ClipboardList,
    saver: PiggyBank,
    spender: Sparkles,
    avoider: EyeOff,
    risktaker: Flame,
};

const MoneyPersonalityScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const { user, profile } = useAppSelector((s) => s.auth);

    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>(
        profile?.moneyPersonality ? 'result' : 'intro'
    );
    const [celebrating, setCelebrating] = useState(false);
    const slide = useRef(new Animated.Value(0)).current;

    const question = PERSONALITY_QUESTIONS[index];
    const progress = (index / PERSONALITY_QUESTIONS.length) * 100;

    // Either the freshly computed result or the one already on the profile.
    const result = useMemo(() => {
        if (Object.keys(answers).length > 0) return scorePersonality(answers);
        const stored = profile?.moneyPersonality;
        if (!stored) return null;
        return {
            archetype: stored.archetype,
            scores: stored.scores,
            confidence: stored.confidence,
            runnerUp: null,
        };
    }, [answers, profile?.moneyPersonality]);

    const start = () => {
        haptics.tap();
        setAnswers({});
        setIndex(0);
        setPhase('quiz');
    };

    const choose = (optionIndex: number) => {
        haptics.select();
        const next = { ...answers, [question.id]: optionIndex };
        setAnswers(next);

        Animated.timing(slide, {
            toValue: -1, duration: 160, useNativeDriver: true,
        }).start(() => {
            if (index + 1 < PERSONALITY_QUESTIONS.length) {
                setIndex((i) => i + 1);
                slide.setValue(1);
                Animated.timing(slide, {
                    toValue: 0, duration: 160, useNativeDriver: true,
                }).start();
            } else {
                finish(next);
            }
        });
    };

    const finish = (finalAnswers: Record<string, number>) => {
        const scored = scorePersonality(finalAnswers);
        setPhase('result');
        haptics.celebrate();
        setCelebrating(true);
        slide.setValue(0);

        if (user?.uid) {
            dispatch(patchProfile({
                uid: user.uid,
                patch: {
                    moneyPersonality: {
                        archetype: scored.archetype,
                        scores: scored.scores,
                        confidence: scored.confidence,
                        takenAt: new Date().toISOString(),
                    },
                },
            }));
        }
    };

    const translateX = slide.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-40, 0, 40],
    });
    const opacity = slide.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
    });

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
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
                    <Text className="text-base font-extrabold text-gray-900">Money Personality</Text>
                    <Text className="text-xs text-gray-400">
                        {phase === 'quiz'
                            ? `Question ${index + 1} of ${PERSONALITY_QUESTIONS.length}`
                            : 'Two minutes, eight questions'}
                    </Text>
                </View>
            </View>

            {/* Progress */}
            {phase === 'quiz' && (
                <View className="h-1 bg-gray-100">
                    <View className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
                </View>
            )}

            {phase === 'intro' && (
                <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
                    <View className="items-center">
                        <View className="w-20 h-20 rounded-3xl bg-indigo-50 items-center justify-center mb-6">
                            <Compass size={36} color="#6366F1" />
                        </View>
                        <Text className="text-2xl font-extrabold text-gray-900 text-center">
                            What kind of money person are you?
                        </Text>
                        <Text className="text-sm text-gray-500 text-center mt-3 leading-6">
                            Eight situations, no right answers. We use the result to decide which
                            courses to show you first and how your coach talks to you.
                        </Text>
                        <Text className="text-xs text-gray-400 text-center mt-4">
                            Nothing here is a psychological assessment. It is a starting point.
                        </Text>
                        <TouchableOpacity
                            onPress={start}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            className="bg-indigo-600 rounded-2xl py-4 px-8 mt-8 flex-row items-center"
                        >
                            <Text className="text-white font-bold text-base mr-2">Start</Text>
                            <ChevronRight size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {phase === 'quiz' && question && (
                <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                        <Text className="text-xl font-bold text-gray-900 leading-7 mb-6">
                            {question.question}
                        </Text>
                        {question.options.map((option, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => choose(i)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                className="bg-white border-2 border-gray-100 rounded-2xl px-4 py-4 mb-3 flex-row items-center"
                            >
                                <View className="w-7 h-7 rounded-full border-2 border-gray-200 items-center justify-center mr-3">
                                    <Text className="text-xs font-bold text-gray-400">
                                        {String.fromCharCode(65 + i)}
                                    </Text>
                                </View>
                                <Text className="text-sm text-gray-700 flex-1 leading-5">{option.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}

            {phase === 'result' && result && (() => {
                const archetype = ARCHETYPES[result.archetype];
                const Icon = ARCHETYPE_ICONS[result.archetype];
                return (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
                        <View className="items-center mb-6">
                            <View
                                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                                style={{ backgroundColor: `${archetype.color}1A` }}
                            >
                                <Icon size={44} color={archetype.color} />
                            </View>
                            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                You are
                            </Text>
                            <Text
                                className="text-3xl font-extrabold mt-1 text-center"
                                style={{ color: archetype.color }}
                            >
                                {archetype.name}
                            </Text>
                            <Text className="text-sm text-gray-500 text-center mt-2 italic">
                                {archetype.tagline}
                            </Text>
                            {result.confidence < 30 && (
                                <Text className="text-xs text-gray-400 text-center mt-3">
                                    Your answers were mixed, so this one is a close call.
                                </Text>
                            )}
                        </View>

                        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-3">
                            <Text className="text-sm text-gray-700 leading-6">{archetype.description}</Text>
                        </View>

                        <View className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 mb-3">
                            <Text className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1.5">
                                Your edge
                            </Text>
                            <Text className="text-sm text-emerald-900 leading-5">{archetype.strength}</Text>
                        </View>

                        <View className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mb-3">
                            <Text className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">
                                Watch out for
                            </Text>
                            <Text className="text-sm text-amber-900 leading-5">{archetype.watchOut}</Text>
                        </View>

                        <View className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 mb-6">
                            <Text className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1.5">
                                Do this first
                            </Text>
                            <Text className="text-sm text-indigo-900 leading-5">{archetype.firstStep}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => { haptics.tap(); navigation.goBack(); }}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            className="bg-indigo-600 rounded-2xl py-4 items-center flex-row justify-center mb-3"
                        >
                            <Check size={18} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Done</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={start}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            className="bg-white border border-gray-200 rounded-2xl py-3.5 items-center flex-row justify-center"
                        >
                            <RefreshCw size={15} color="#6B7280" />
                            <Text className="text-gray-600 font-semibold text-sm ml-2">Retake quiz</Text>
                        </TouchableOpacity>
                    </ScrollView>
                );
            })()}

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default MoneyPersonalityScreen;
