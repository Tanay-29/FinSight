/**
 * MoneyQuizScreen: the ten-question knowledge check.
 *
 * Taken once to set a starting score, and again from three weeks on to show
 * the change ("4 then, 8 now"), which is the plainest evidence the app
 * teaches. Nothing is marked right or wrong while answering, because it is a
 * measurement and feedback mid-check would change the second half of it. The
 * results screen then shows every answer with its explanation.
 *
 * Saved on the profile: the first result as quizBaseline, every later one as
 * quizLatest.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { X, Check, ChevronRight } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { patchProfile } from '../store/slices/authSlice';
import { MONEY_QUIZ } from '../data/moneyQuiz';
import { Mascot } from '../components/mascot/Mascot';
import { PressableScale } from '../components/PressableScale';
import { Confetti } from '../components/Confetti';
import * as haptics from '../utils/haptics';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../theme/tokens';

const MoneyQuizScreen: React.FC = () => {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();
    const { user, profile } = useAppSelector((s) => s.auth);

    const [index, setIndex] = useState(0);
    const [picks, setPicks] = useState<number[]>([]);
    const [done, setDone] = useState(false);
    // The baseline as it was when this run started, so the comparison on the
    // results screen is against the earlier score, not the one just saved.
    const [before] = useState(profile?.quizBaseline ?? null);

    const q = MONEY_QUIZ[index];
    const picked = picks[index];
    const score = picks.filter((p, i) => p === MONEY_QUIZ[i].answer).length;

    const next = () => {
        haptics.tap();
        if (index + 1 < MONEY_QUIZ.length) {
            setIndex(index + 1);
            return;
        }
        setDone(true);
        haptics.celebrate();
        const result = { score: picks.filter((p, i) => p === MONEY_QUIZ[i].answer).length, date: new Date().toISOString() };
        if (user?.uid) {
            dispatch(patchProfile({ uid: user.uid, patch: before ? { quizLatest: result } : { quizBaseline: result } }));
        }
    };

    if (done) {
        const gain = before ? score - before.score : null;
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top', 'bottom']}>
                <ScrollView contentContainerStyle={{ padding: GUTTER, paddingBottom: 32 }}>
                    <Animated.View entering={reduced ? FadeIn.duration(160) : FadeIn.duration(300)} style={{ alignItems: 'center', paddingTop: 12 }}>
                        <Mascot mood={gain === null || gain > 0 ? 'celebrate' : 'happy'} size={120} />
                        <Text style={[TYPE.display, { color: COLORS.text.primary, marginTop: 8 }]}>{score}/10</Text>
                        <Text style={[TYPE.body, { color: COLORS.text.secondary, textAlign: 'center', marginTop: 4 }]}>
                            {gain === null
                                ? 'Your starting score. Take it again in three weeks and see what changed.'
                                : gain > 0
                                    ? `Up from ${before!.score} when you started. That is the app working.`
                                    : gain === 0
                                        ? `The same as when you started, ${before!.score}. The explanations below are the fastest way up.`
                                        : `Down from ${before!.score}. It happens; the explanations below are worth a read.`}
                        </Text>
                    </Animated.View>

                    <Text style={[TYPE.micro, { color: COLORS.text.tertiary, marginTop: 24, marginBottom: 10 }]}>The answers</Text>
                    {MONEY_QUIZ.map((item, i) => {
                        const right = picks[i] === item.answer;
                        return (
                            <View key={item.id} style={{ padding: 14, borderRadius: RADIUS.card, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, backgroundColor: right ? COLORS.semantic.profitBg : COLORS.semantic.alertBg }}>
                                        {right ? <Check size={13} color={COLORS.semantic.profit} strokeWidth={3} /> : <X size={13} color={COLORS.semantic.alertAmber} strokeWidth={3} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[TYPE.callout, { color: COLORS.text.primary }]}>{item.prompt}</Text>
                                        <Text style={[TYPE.caption, { color: COLORS.semantic.profit, marginTop: 4, fontFamily: FONTS.semibold }]}>{item.options[item.answer]}</Text>
                                        <Text style={[TYPE.caption, { color: COLORS.text.secondary, marginTop: 2 }]}>{item.explain}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}

                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.goBack(); }}
                        accessibilityRole="button"
                        containerStyle={{ marginTop: 8 }}
                        style={{ height: 52, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand.primaryDark, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]}>Done</Text>
                    </PressableScale>
                </ScrollView>
                <Confetti active={!reduced && (gain === null || gain > 0)} count={36} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top', 'bottom']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 12 }}>
                <Pressable
                    onPress={() => { haptics.tap(); navigation.goBack(); }}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={12}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}
                >
                    <X size={18} color={COLORS.text.secondary} />
                </Pressable>
                <View style={{ flex: 1, flexDirection: 'row', gap: 4, marginLeft: 14 }}>
                    {MONEY_QUIZ.map((item, i) => (
                        <View key={item.id} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= index ? COLORS.brand.primary : COLORS.surface.tertiary }} />
                    ))}
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }}>
                <Animated.View key={index} entering={reduced ? FadeIn.duration(150) : SlideInRight.duration(240)}>
                    <Text style={[TYPE.micro, { color: COLORS.text.tertiary }]}>Question {index + 1} of {MONEY_QUIZ.length}</Text>
                    <Text style={[TYPE.heading, { color: COLORS.text.primary, marginTop: 6, marginBottom: 18 }]}>{q.prompt}</Text>
                    {q.options.map((option, i) => {
                        const selected = picked === i;
                        return (
                            <PressableScale
                                key={option}
                                onPress={() => { haptics.select(); setPicks((p) => { const n = [...p]; n[index] = i; return n; }); }}
                                activeScale={0.98}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                containerStyle={{ marginBottom: 10 }}
                                style={{
                                    padding: selected ? 15 : 16,
                                    borderRadius: RADIUS.card,
                                    borderWidth: selected ? 2 : 1,
                                    borderColor: selected ? COLORS.brand.primary : COLORS.border.default,
                                    backgroundColor: selected ? COLORS.brand.soft : COLORS.surface.primary,
                                }}
                            >
                                <Text style={[TYPE.callout, { color: selected ? COLORS.brand.link : COLORS.text.primary, fontFamily: selected ? FONTS.semibold : FONTS.medium }]}>
                                    {option}
                                </Text>
                            </PressableScale>
                        );
                    })}
                </Animated.View>
            </ScrollView>

            <View style={{ paddingHorizontal: GUTTER, paddingBottom: 8 }}>
                <PressableScale
                    onPress={next}
                    disabled={picked === undefined}
                    accessibilityRole="button"
                    style={{
                        height: 52, borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: picked === undefined ? COLORS.surface.tertiary : COLORS.brand.primaryDark,
                    }}
                >
                    <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: picked === undefined ? COLORS.text.tertiary : COLORS.brand.onAccent, marginRight: 6 }]}>
                        {index + 1 < MONEY_QUIZ.length ? 'Next' : 'See my score'}
                    </Text>
                    <ChevronRight size={18} color={picked === undefined ? COLORS.text.tertiary : COLORS.brand.onAccent} />
                </PressableScale>
            </View>
        </SafeAreaView>
    );
};

export default MoneyQuizScreen;
