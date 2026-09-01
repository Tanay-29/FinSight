/**
 * GuessSpendScreen - which did you spend more on?
 *
 * This asked for a number before: "how much have you spent this month?" The
 * question had no anchor. Nobody can judge whether 5,000 is a sensible guess
 * for their own month, so the answer was a shrug; being told you were 300 out
 * gave you an accuracy percentage and nothing to do about it; and a new
 * account had no total worth guessing at.
 *
 * A comparison is answerable, has a right answer, and when you get it wrong it
 * names the exact category you were underrating. The reveal shows the number
 * of purchases beside each total, because that is the part people are wrong
 * about: one memorable 900 rupee order beats thirty forgettable 60 rupee ones
 * in the memory, and loses badly in the ledger.
 *
 * Round selection is in utils/spendQuiz, and it matters more than this screen
 * does: a pair that is nearly tied is a coin flip dressed as a question.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Scale, Check, X, Lightbulb, RotateCcw } from 'lucide-react-native';
import { useAppSelector } from '../store/hooks';
import { PressableScale } from '../components/PressableScale';
import { BarFill } from '../components/BarFill';
import { EmptyState } from '../components/EmptyState';
import Confetti from '../components/Confetti';
import { formatCompactINR } from '../utils/projections';
import {
    categoryTotals, buildRounds, blindSpot, averagePurchase,
    CategoryTotal, QuizRound,
} from '../utils/spendQuiz';
import * as haptics from '../utils/haptics';

type Props = NativeStackScreenProps<any, 'GuessSpend'>;

const ROUND_COUNT = 5;
const WINDOW_DAYS = 30;

/** One side of the question, before the answer is known. */
const ChoiceButton: React.FC<{
    option: CategoryTotal;
    onPress: () => void;
}> = ({ option, onPress }) => (
    <PressableScale
        onPress={onPress}
        containerStyle={{ flex: 1 }}
        accessibilityRole="button"
        accessibilityLabel={`I spent more on ${option.label}`}
        className="bg-white border-2 border-gray-100 rounded-2xl py-7 px-3 items-center justify-center"
    >
        <Text className="text-base font-bold text-gray-900 text-center" numberOfLines={2}>
            {option.label}
        </Text>
    </PressableScale>
);

/** One side after the reveal, with the number that settles it. */
const RevealRow: React.FC<{
    option: CategoryTotal;
    max: number;
    isTruth: boolean;
    wasPicked: boolean;
    delay: number;
}> = ({ option, max, isTruth, wasPicked, delay }) => (
    <View className="mb-3">
        <View className="flex-row items-center mb-1.5">
            <Text className="text-sm font-bold text-gray-900 flex-1" numberOfLines={1}>
                {option.label}
            </Text>
            {wasPicked && (
                <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-2">
                    your pick
                </Text>
            )}
            <Text className="text-sm font-extrabold text-gray-900" style={{ fontVariant: ['tabular-nums'] }}>
                {formatCompactINR(option.amount)}
            </Text>
        </View>

        <BarFill
            percent={Math.max((option.amount / max) * 100, 3)}
            height={10}
            color={isTruth ? '#6366F1' : '#D1D5DB'}
            trackClassName="bg-gray-100"
            delay={delay}
        />

        {/* The count is the lesson. A big total made of many small buys is the
            one people never see coming. */}
        <Text className="text-xs text-gray-400 mt-1.5">
            {option.count} purchase{option.count === 1 ? '' : 's'}, averaging{' '}
            {formatCompactINR(averagePurchase(option))}
        </Text>
    </View>
);

const GuessSpendScreen: React.FC<Props> = ({ navigation }) => {
    const transactions = useAppSelector((s) => s.transactions.items);
    const reduced = useReducedMotion();

    const totals = useMemo(
        () => categoryTotals(transactions as any, WINDOW_DAYS),
        [transactions]
    );

    // Rebuilt only when the deck is restarted, so answering does not reshuffle
    // the questions underneath the player.
    const [deckSeed, setDeckSeed] = useState(0);
    const rounds = useMemo(
        () => buildRounds(totals, ROUND_COUNT),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [totals, deckSeed]
    );

    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<(CategoryTotal | null)[]>([]);
    const [picked, setPicked] = useState<CategoryTotal | null>(null);
    const [celebrating, setCelebrating] = useState(false);

    const round: QuizRound | undefined = rounds[index];
    const finished = rounds.length > 0 && index >= rounds.length;

    const truth = round
        ? (round.left.amount >= round.right.amount ? round.left : round.right)
        : null;
    const wasRight = picked !== null && truth !== null && picked.key === truth.key;

    const score = useMemo(
        () => answers.reduce((sum, pick, i) => {
            const r = rounds[i];
            if (!pick || !r) return sum;
            const t = r.left.amount >= r.right.amount ? r.left : r.right;
            return sum + (pick.key === t.key ? 1 : 0);
        }, 0),
        [answers, rounds]
    );

    const worst = useMemo(() => blindSpot(rounds, answers), [rounds, answers]);

    const choose = (option: CategoryTotal) => {
        if (picked || !truth) return;
        setPicked(option);
        setAnswers((prev) => {
            const next = [...prev];
            next[index] = option;
            return next;
        });
        if (option.key === truth.key) haptics.success();
        else haptics.warn();
    };

    const next = () => {
        haptics.tap();
        setPicked(null);
        setIndex((i) => i + 1);
        if (index + 1 >= rounds.length) {
            const finalScore = score;
            if (finalScore >= Math.ceil(rounds.length * 0.8)) {
                haptics.celebrate();
                setCelebrating(true);
            }
        }
    };

    const restart = () => {
        haptics.tap();
        setDeckSeed((s) => s + 1);
        setIndex(0);
        setAnswers([]);
        setPicked(null);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" />

            <View className="px-5 py-3.5 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-extrabold text-gray-900">Which was more?</Text>
                    <Text className="text-xs text-gray-400">
                        Your own spending, last {WINDOW_DAYS} days
                    </Text>
                </View>
                {rounds.length > 0 && !finished && (
                    <Text className="text-xs font-bold text-gray-400">
                        {index + 1} / {rounds.length}
                    </Text>
                )}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                {rounds.length === 0 ? (
                    <EmptyState
                        icon={<Scale color="#6366F1" size={34} />}
                        title="Not enough to compare yet"
                        body={
                            totals.length < 2
                                ? `This game pits two of your own categories against each other, so it needs spending in at least two of them over the last ${WINDOW_DAYS} days.`
                                : 'Your categories are all within a few percent of each other right now, so every question would be a coin flip. Log a bit more and come back.'
                        }
                        actionLabel="Add an expense"
                        onAction={() => navigation.navigate('AddTransaction' as never)}
                    />
                ) : finished ? (
                    <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(300)}>
                        <View className="bg-white rounded-3xl border border-gray-100 p-6 items-center mb-4">
                            <Text className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                You got
                            </Text>
                            <Text className="text-5xl font-extrabold text-gray-900 mt-1">
                                {score} of {rounds.length}
                            </Text>
                            <Text className="text-sm text-gray-500 text-center mt-3 leading-5">
                                {score === rounds.length
                                    ? 'You know your own spending better than most people know theirs.'
                                    : score === 0
                                        ? 'Every one of those went the other way. That is worth knowing, and it is fixable.'
                                        : 'The ones you missed are the useful part. Those are the categories you are not seeing.'}
                            </Text>
                        </View>

                        {worst && (
                            <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex-row items-start">
                                <Lightbulb size={18} color="#D97706" style={{ marginTop: 1 }} />
                                <View className="flex-1 ml-3">
                                    <Text className="text-sm font-bold text-amber-900">
                                        {worst.label} is bigger than you think
                                    </Text>
                                    <Text className="text-xs text-amber-800 mt-1 leading-5">
                                        {formatCompactINR(worst.amount)} across {worst.count} purchase
                                        {worst.count === 1 ? '' : 's'}, averaging{' '}
                                        {formatCompactINR(averagePurchase(worst))}. Small amounts are
                                        easy to forget and they add up faster than one large buy you
                                        remember making.
                                    </Text>
                                </View>
                            </View>
                        )}

                        <PressableScale
                            onPress={restart}
                            accessibilityRole="button"
                            className="bg-white border border-gray-200 rounded-2xl py-4 items-center flex-row justify-center mb-3"
                        >
                            <RotateCcw size={16} color="#6B7280" />
                            <Text className="text-gray-700 font-bold text-base ml-2">Play again</Text>
                        </PressableScale>

                        <PressableScale
                            onPress={() => { haptics.tap(); navigation.goBack(); }}
                            accessibilityRole="button"
                            className="bg-indigo-600 rounded-2xl py-4 items-center flex-row justify-center"
                        >
                            <Check size={18} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Done</Text>
                        </PressableScale>
                    </Animated.View>
                ) : round && truth ? (
                    <Animated.View
                        key={index}
                        entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(260)}
                    >
                        <Text className="text-xl font-extrabold text-gray-900 text-center mt-2">
                            Which did you spend more on?
                        </Text>
                        <Text className="text-sm text-gray-500 text-center mt-2 mb-6 leading-5">
                            No checking. Go with what you remember.
                        </Text>

                        {!picked ? (
                            <View className="flex-row gap-3">
                                <ChoiceButton option={round.left} onPress={() => choose(round.left)} />
                                <ChoiceButton option={round.right} onPress={() => choose(round.right)} />
                            </View>
                        ) : (
                            <Animated.View entering={FadeIn.duration(reduced ? 120 : 220)}>
                                <View
                                    className={`rounded-2xl p-4 mb-4 flex-row items-center ${
                                        wasRight
                                            ? 'bg-emerald-50 border border-emerald-100'
                                            : 'bg-red-50 border border-red-100'
                                    }`}
                                >
                                    {wasRight
                                        ? <Check size={18} color="#059669" strokeWidth={3} />
                                        : <X size={18} color="#DC2626" strokeWidth={3} />}
                                    <Text
                                        className={`text-sm font-semibold ml-2 flex-1 ${
                                            wasRight ? 'text-emerald-800' : 'text-red-800'
                                        }`}
                                    >
                                        {wasRight
                                            ? `Right, ${truth.label} was more.`
                                            : `Actually ${truth.label} was more.`}
                                    </Text>
                                </View>

                                <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                                    <RevealRow
                                        option={round.left}
                                        max={Math.max(round.left.amount, round.right.amount)}
                                        isTruth={round.left.key === truth.key}
                                        wasPicked={picked.key === round.left.key}
                                        delay={0}
                                    />
                                    <RevealRow
                                        option={round.right}
                                        max={Math.max(round.left.amount, round.right.amount)}
                                        isTruth={round.right.key === truth.key}
                                        wasPicked={picked.key === round.right.key}
                                        delay={80}
                                    />
                                </View>

                                <PressableScale
                                    onPress={next}
                                    accessibilityRole="button"
                                    className="bg-indigo-600 rounded-2xl py-4 items-center"
                                >
                                    <Text className="text-white font-bold text-base">
                                        {index + 1 < rounds.length ? 'Next' : 'See how you did'}
                                    </Text>
                                </PressableScale>
                            </Animated.View>
                        )}
                    </Animated.View>
                ) : null}
            </ScrollView>

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

export default GuessSpendScreen;
