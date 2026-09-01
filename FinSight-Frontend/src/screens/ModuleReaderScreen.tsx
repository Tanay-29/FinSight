/**
 * ModuleReaderScreen
 *
 * Three-phase immersive learning experience:
 *   Phase 1 - Reading: full content + highlighted key points
 *   Phase 2 - Quiz:    3 MCQ questions with animated feedback
 *   Phase 3 - Done:    score, badge reveal, streak celebration
 *
 * On module complete → dispatches completeModule thunk → Firestore write + Redux optimistic update
 */
import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Animated, ActivityIndicator, StatusBar,
} from 'react-native';
import ReAnimated, { FadeIn, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { BarFill } from '../components/BarFill';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, Clock, ChevronRight, Check, X, Lightbulb, CloudOff,
    Trophy, Flame, BookOpen, Star, RefreshCw, CheckCircle2, BrainCircuit,
    Snowflake,
} from 'lucide-react-native';
import { Module, QuizQuestion, LearningPath } from '../data/courseContent';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { completeModule } from '../store/slices/learningSlice';
import { selectIsPremium } from '../store/slices/premiumSlice';
import Confetti from '../components/Confetti';
import * as haptics from '../utils/haptics';

// ─── Types ───────────────────────────────────────────────────

type Phase = 'reading' | 'quiz' | 'done';

type Props = NativeStackScreenProps<any, 'ModuleReader'>;

// ─── Small components ─────────────────────────────────────────

const DifficultyBadge: React.FC<{ level: string }> = ({ level }) => {
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
        beginner: { bg: '#D1FAE5', text: '#059669', label: 'Beginner' },
        intermediate: { bg: '#FEF3C7', text: '#D97706', label: 'Intermediate' },
        advanced: { bg: '#FEE2E2', text: '#DC2626', label: 'Advanced' },
    };
    const c = cfg[level] ?? cfg.beginner;
    return (
        <View style={{ backgroundColor: c.bg }} className="px-2 py-0.5 rounded-full">
            <Text style={{ color: c.text }} className="text-xs font-semibold">{c.label}</Text>
        </View>
    );
};

// ─── Phase 1: Reading ──────────────────────────────────────────

const ReadingPhase: React.FC<{
    module: Module;
    onStartQuiz: () => void;
}> = ({ module, onStartQuiz }) => (
    <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
    >
        {/* Content card */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-5 border border-gray-100" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            <View className="flex-row items-center mb-3">
                <BookOpen size={16} color="#6366F1" />
                <Text className="text-sm font-semibold text-indigo-600 ml-1.5">In this module</Text>
            </View>
            <Text className="text-base text-gray-700 leading-7">{module.content}</Text>
        </View>

        {/* Key Points */}
        <View className="mx-4 mt-4">
            <View className="flex-row items-center mb-3">
                <Lightbulb size={16} color="#F59E0B" />
                <Text className="text-sm font-bold text-gray-800 ml-1.5">Key takeaways</Text>
            </View>
            {module.keyPoints.map((point, idx) => (
                <View
                    key={idx}
                    className="flex-row items-start mb-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"
                >
                    <View className="w-5 h-5 rounded-full bg-amber-400 items-center justify-center mt-0.5 mr-3 shrink-0">
                        <Text className="text-white text-xs font-bold">{idx + 1}</Text>
                    </View>
                    <Text className="text-sm text-gray-700 leading-5 flex-1">{point}</Text>
                </View>
            ))}
        </View>

        {/* Start Quiz CTA */}
        <View className="mx-4 mt-6">
            <PressableScale
                onPress={onStartQuiz}
                className="bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center"
            >
                <Star size={18} color="white" />
                <Text className="text-white font-bold text-base ml-2">Test what you got</Text>
                <ChevronRight size={18} color="white" className="ml-1" />
            </PressableScale>
            <Text className="text-center text-xs text-gray-400 mt-2">3 quick questions</Text>
        </View>
    </ScrollView>
);

// ─── Phase 2: Quiz ──────────────────────────────────────────────

const QuizPhase: React.FC<{
    questions: QuizQuestion[];
    onFinish: (score: number) => void;
}> = ({ questions, onFinish }) => {
    const [qIndex, setQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const reduced = useReducedMotion();

    const q = questions[qIndex];
    const isCorrect = selectedOption === q.answerIndex;

    const handleSelect = (idx: number) => {
        if (answered) return;
        setSelectedOption(idx);
        setAnswered(true);
        if (idx === q.answerIndex) {
            haptics.success();
            setScore((s) => s + 1);
        } else {
            haptics.warn();
        }
    };

    const handleNext = () => {
        if (qIndex + 1 < questions.length) {
            setQIndex((i) => i + 1);
            setSelectedOption(null);
            setAnswered(false);
        } else {
            // The score for this last answer has not landed in state yet, so
            // count it here rather than reading a value that is one behind.
            onFinish(isCorrect ? score + 1 : score);
        }
    };

    const getOptionStyle = (idx: number) => {
        if (!answered) return { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' };
        if (idx === q.answerIndex) return { borderColor: '#10B981', backgroundColor: '#F0FDF4' };
        if (idx === selectedOption) return { borderColor: '#EF4444', backgroundColor: '#FFF5F5' };
        return { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' };
    };

    const getOptionTextColor = (idx: number) => {
        if (!answered) return '#374151';
        if (idx === q.answerIndex) return '#059669';
        if (idx === selectedOption) return '#DC2626';
        return '#9CA3AF';
    };

    return (
        <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
        >
            {/* Progress indicator */}
            <View className="mx-4 mt-4 mb-5">
                <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-gray-400 font-medium">
                        Question {qIndex + 1} of {questions.length}
                    </Text>
                    <Text className="text-xs text-indigo-500 font-semibold">
                        {score} correct
                    </Text>
                </View>
                <BarFill
                    percent={((qIndex + (answered ? 1 : 0)) / questions.length) * 100}
                    height={6}
                    trackClassName="bg-gray-100"
                    fillClassName="bg-indigo-500"
                />
            </View>

            {/* Keyed on the question index so each one is a real mount. */}
            <ReAnimated.View
                key={qIndex}
                entering={reduced ? FadeIn.duration(160) : SlideInRight.duration(240)}
            >
                <View className="mx-4 bg-white rounded-2xl p-5 border border-gray-100 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                    <Text className="text-base font-bold text-gray-900 leading-6">{q.question}</Text>
                </View>

                {/* Options */}
                {q.options.map((option, idx) => (
                    <PressableScale
                        key={idx}
                        onPress={() => handleSelect(idx)}
                        disabled={answered}
                        activeScale={0.985}
                        accessibilityRole="button"
                        accessibilityLabel={`Option ${['A', 'B', 'C', 'D'][idx]}. ${option}`}
                        style={[{ borderWidth: answered && idx === q.answerIndex ? 2 : 1 }, getOptionStyle(idx)]}
                        className="mx-4 mb-3 rounded-xl px-4 py-3.5 flex-row items-center"
                    >
                        <View
                            style={{
                                backgroundColor: answered && idx === q.answerIndex
                                    ? '#10B981'
                                    : answered && idx === selectedOption
                                        ? '#EF4444'
                                        : '#F3F4F6',
                            }}
                            className="w-7 h-7 rounded-full items-center justify-center mr-3 shrink-0"
                        >
                            {answered && idx === q.answerIndex ? (
                                <Check size={14} color="white" strokeWidth={3} />
                            ) : answered && idx === selectedOption ? (
                                <X size={14} color="white" strokeWidth={3} />
                            ) : (
                                <Text className="text-xs font-bold text-gray-500">
                                    {['A', 'B', 'C', 'D'][idx]}
                                </Text>
                            )}
                        </View>
                        <Text style={{ color: getOptionTextColor(idx) }} className="text-sm flex-1 leading-5">
                            {option}
                        </Text>
                    </PressableScale>
                ))}

                {/* Explanation */}
                {answered && (
                    <View className={`mx-4 mt-1 rounded-xl p-4 border ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <View className="flex-row items-center mb-1">
                            {isCorrect
                                ? <Check size={14} color="#059669" strokeWidth={3} />
                                : <X size={14} color="#DC2626" strokeWidth={3} />
                            }
                            <Text style={{ color: isCorrect ? '#059669' : '#DC2626' }} className="text-xs font-bold ml-1.5">
                                {isCorrect ? 'Correct!' : 'Not quite'}
                            </Text>
                        </View>
                        <Text className="text-sm text-gray-600 leading-5">{q.explanation}</Text>
                    </View>
                )}

                {/* Next button */}
                {answered && (
                    <PressableScale
                        onPress={handleNext}
                        className="mx-4 mt-5 bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center"
                    >
                        <Text className="text-white font-bold text-base mr-2">
                            {qIndex + 1 < questions.length ? 'Next question' : 'See results'}
                        </Text>
                        <ChevronRight size={18} color="white" />
                    </PressableScale>
                )}
            </ReAnimated.View>
        </ScrollView>
    );
};

// ─── Phase 3: Completion ───────────────────────────────────────

const DonePhase: React.FC<{
    score: number;
    total: number;
    badgeEarned: boolean;
    streak: number;
    streakSaved: boolean;
    moduleName: string;
    isSaving: boolean;
    /** Set when the completion write did not land. */
    saveFailed: boolean;
    onRetrySave: () => void;
    onBack: () => void;
    onRetake: () => void;
    onFlashcards: () => void;
}> = ({
    score, total, badgeEarned, streak, streakSaved, moduleName,
    isSaving, saveFailed, onRetrySave, onBack, onRetake, onFlashcards,
}) => {
    const pct = Math.round((score / total) * 100);
    const perfect = score === total;
    const passed = pct >= 60;

    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    React.useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }).start();
    }, [scaleAnim]);

    return (
        <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60, alignItems: 'center', paddingTop: 32 }}
        >
            {/* Score circle */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <View
                    style={{
                        width: 140, height: 140, borderRadius: 70,
                        backgroundColor: passed ? '#EEF2FF' : '#FFF5F5',
                        borderWidth: 4,
                        borderColor: passed ? '#6366F1' : '#EF4444',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Text style={{ color: passed ? '#6366F1' : '#EF4444' }} className="text-4xl font-extrabold">
                        {score}/{total}
                    </Text>
                    <Text style={{ color: passed ? '#818CF8' : '#F87171' }} className="text-xs font-semibold mt-0.5">
                        {pct}% correct
                    </Text>
                </View>
            </Animated.View>

            {/* Result text */}
            <Text className="text-2xl font-bold text-gray-900 mt-6 text-center px-8">
                {perfect ? 'Perfect score!' : passed ? 'Well done!' : 'Keep practising!'}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center px-8 leading-5">
                {perfect
                    ? `You aced "${moduleName}". Your understanding is solid.`
                    : passed
                        ? `Good progress on "${moduleName}". Review the explanations to reinforce.`
                        : `No worries - re-read "${moduleName}" and try the quiz again.`
                }
            </Text>

            {/* Streak badge */}
            {streak > 0 && passed && (
                <View className="mt-5 flex-row items-center bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3">
                    <Flame size={20} color="#F97316" />
                    <Text className="text-sm font-bold text-orange-600 ml-2">
                        {streak}-day learning streak!
                    </Text>
                </View>
            )}

            {/* A freeze absorbed a missed day, so say so: the whole point of
                the mechanic is that the learner notices being rescued. */}
            {streakSaved && (
                <View className="mt-3 flex-row items-center bg-sky-50 border border-sky-100 rounded-2xl px-5 py-3">
                    <Snowflake size={20} color="#0EA5E9" />
                    <Text className="text-sm font-bold text-sky-600 ml-2">
                        Streak freeze used. Your streak is safe.
                    </Text>
                </View>
            )}

            {/* Badge */}
            {badgeEarned && (
                <View className="mt-4 flex-row items-center bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3">
                    <Trophy size={20} color="#10B981" />
                    <Text className="text-sm font-bold text-emerald-600 ml-2">
                        Course badge earned
                    </Text>
                </View>
            )}

            {/* Saving state.
                A completion that did not reach Firestore used to say nothing:
                the screen showed the badge and the streak, the next module
                stayed locked, and the reason was never on screen. */}
            {isSaving && (
                <View className="mt-4 flex-row items-center">
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text className="text-xs text-gray-400 ml-2">Saving your progress</Text>
                </View>
            )}

            {saveFailed && !isSaving && (
                <View className="mt-4 mx-4 bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex-row items-start">
                    <CloudOff size={15} color="#D97706" style={{ marginTop: 1 }} />
                    <View className="flex-1 ml-2.5">
                        <Text className="text-xs text-amber-900 leading-4">
                            You finished this, but it did not save, so the next module stays
                            locked until it does.
                        </Text>
                        <Text
                            onPress={onRetrySave}
                            style={{ fontSize: 12, fontWeight: '700', color: '#B45309', marginTop: 6 }}
                        >
                            Try saving again
                        </Text>
                    </View>
                </View>
            )}

            {/* Actions */}
            <View className="w-full px-4 mt-8 gap-3">
                {/* AI Flashcards CTA */}
                <TouchableOpacity
                    onPress={onFlashcards}
                    activeOpacity={0.85}
                    style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 18, paddingVertical: 16,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1.5, borderColor: '#EEF2FF',
                        shadowColor: '#6366F1', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
                        gap: 10,
                    }}
                >
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <BrainCircuit size={18} color="#6366F1" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>Revise with AI Flashcards</Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Gemini generates 5 cards from this module</Text>
                    </View>
                    <ChevronRight size={16} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <PressableScale
                    onPress={onBack}
                    className="bg-indigo-600 rounded-2xl py-4 flex-row items-center justify-center"
                >
                    <CheckCircle2 size={18} color="white" />
                    <Text className="text-white font-bold text-base ml-2">Back to Course</Text>
                </PressableScale>

                <TouchableOpacity
                    onPress={onRetake}
                    activeOpacity={0.7}
                    className="border border-gray-200 rounded-2xl py-3.5 flex-row items-center justify-center"
                >
                    <RefreshCw size={16} color="#6B7280" />
                    <Text className="text-gray-500 font-semibold text-sm ml-2">Retake Quiz</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// ─── Main ModuleReaderScreen ───────────────────────────────────

const ModuleReaderScreen: React.FC<Props> = ({ route, navigation }) => {
    const dispatch = useAppDispatch();
    const { user, profile } = useAppSelector((s) => s.auth);
    const { progress } = useAppSelector((s) => s.learning);

    const module: Module = route.params?.module;
    const path: LearningPath = route.params?.path;

    const [phase, setPhase] = useState<Phase>('reading');
    const [quizScore, setQuizScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const isPremium = useAppSelector(selectIsPremium);
    const [quizAttempt, setQuizAttempt] = useState(0); // increment to retake
    const [celebrating, setCelebrating] = useState(false);
    const [streakSaved, setStreakSaved] = useState(false);

    const saveCompletion = useCallback(async () => {
        if (!user?.uid || !path?.id || !module?.id) return;
        setIsSaving(true);
        setSaveFailed(false);
        const result = await dispatch(completeModule({
            userId: user.uid,
            pathId: path.id,
            moduleId: module.id,
            totalModules: path.modules?.length ?? 1,
        }));
        setIsSaving(false);

        if (completeModule.fulfilled.match(result)) {
            setStreakSaved(result.payload.streakUpdate?.savedByFreeze ?? false);
        } else {
            setSaveFailed(true);
        }
    }, [user, path, module, dispatch]);

    // Declared before the early return below: hooks must run on every render.
    const handleQuizFinish = useCallback(async (score: number) => {
        setQuizScore(score);
        setPhase('done');

        // Mark complete in Firestore regardless of score (reading = learning)
        await saveCompletion();

        // Celebrate the finish, harder for a perfect run.
        const total = module?.quiz?.length ?? 0;
        if (total > 0 && score === total) haptics.celebrate();
        else haptics.success();
        setCelebrating(true);
    }, [module, saveCompletion]);

    if (!module || !path) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <Text className="text-gray-500">Module not found.</Text>
            </SafeAreaView>
        );
    }

    const pathProgress = progress[path.id || ''];
    const badgeEarned = pathProgress?.badgeEarned ?? false;
    const streak = profile?.streak ?? 0;

    const handleStartQuiz = () => {
        haptics.tap();
        setPhase('quiz');
    };

    const handleRetake = () => {
        haptics.tap();
        setQuizAttempt((a) => a + 1);
        setPhase('quiz');
    };

    const handleBack = () => navigation.goBack();

    const handleFlashcards = () => {
        // Generating a deck is a model call per module, so it is the paid
        // action. Reviewing cards that already exist stays free.
        if (!isPremium) {
            (navigation as any).navigate('Paywall', { feature: 'flashcards' });
            return;
        }
        (navigation as any).navigate('Flashcards', {
            // moduleId and pathId identify the cards in the review schedule.
            moduleId: module.id,
            pathId: path.id ?? '',
            moduleTitle: module.title,
            moduleContent: module.content,
            keyPoints: module.keyPoints ?? [],
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center">
                <TouchableOpacity
                    onPress={handleBack}
                    className="w-9 h-9 items-center justify-center rounded-full bg-gray-100 mr-3"
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>

                <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-bold text-gray-900">
                        {module.title}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                        <Clock size={11} color="#9CA3AF" />
                        <Text className="text-xs text-gray-400">{module.duration}</Text>
                        <DifficultyBadge level={module.difficulty} />
                    </View>
                </View>

                {/* Phase indicator */}
                <View className="flex-row gap-1">
                    {(['reading', 'quiz', 'done'] as Phase[]).map((p, i) => (
                        <View
                            key={p}
                            style={{
                                width: 24, height: 4, borderRadius: 2,
                                backgroundColor: phase === p
                                    ? '#6366F1'
                                    : (['reading', 'quiz', 'done'] as Phase[]).indexOf(phase) > i
                                        ? '#A5B4FC'
                                        : '#E5E7EB',
                            }}
                        />
                    ))}
                </View>
            </View>

            {/* Phase content */}
            {phase === 'reading' && (
                <ReadingPhase module={module} onStartQuiz={handleStartQuiz} />
            )}
            {phase === 'quiz' && module.quiz && module.quiz.length > 0 && (
                <QuizPhase
                    key={quizAttempt}
                    questions={module.quiz}
                    onFinish={handleQuizFinish}
                />
            )}
            {phase === 'done' && (
                <DonePhase
                    score={quizScore}
                    total={module.quiz?.length ?? 3}
                    badgeEarned={badgeEarned}
                    streak={streak}
                    streakSaved={streakSaved}
                    moduleName={module.title}
                    isSaving={isSaving}
                    saveFailed={saveFailed}
                    onRetrySave={saveCompletion}
                    onBack={handleBack}
                    onRetake={handleRetake}
                    onFlashcards={handleFlashcards}
                />
            )}

            {/* Sits above everything, ignores touches, clears itself. */}
            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default ModuleReaderScreen;
