/**
 * LessonPlayerScreen
 *
 * Plays a deck of cards: one lesson from a track, or the daily session
 * assembled by utils/lessonSession.ts. One card on screen at a time, a
 * segmented progress bar, Continue once the card is answered, and a results
 * card at the end that says what was learned in concepts, not percentages.
 *
 * Every scorable answer is written to the mistake bank the moment it lands,
 * so closing the deck halfway loses nothing. Finishing a lesson goes through
 * completeModule with the track as the path, which is what feeds the streak,
 * freezes and badge; finishing a session that did not close a lesson still
 * records a study day.
 */
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { X, ChevronRight, Flame, BrainCircuit, Sparkles, RotateCcw } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { answerLessonCard, markSessionDone, selectCardResults } from '../store/slices/lessonsSlice';
import { completeModule } from '../store/slices/learningSlice';
import { fetchUserProfile } from '../store/slices/authSlice';
import { recordStudyDay } from '../services/firestoreService';
import { findLesson, findTrack, cardKey } from '../data/lessons';
import { isScorable } from '../data/lessons/schema';
import { buildSession, SessionCard } from '../utils/lessonSession';
import { CardRenderer } from '../components/learn/CardRenderer';
import { PressableScale } from '../components/PressableScale';
import { Confetti } from '../components/Confetti';
import * as haptics from '../utils/haptics';
import { COLORS, FONTS, TYPE, GUTTER } from '../theme/tokens';

type Params =
    | { mode: 'lesson'; trackId: string; lessonId: string }
    | { mode: 'session' };

const KIND_LABEL: Record<SessionCard['kind'], string> = {
    review: 'Review',
    new: 'New',
    yourMoney: 'Your money',
};

const LessonPlayerScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { params } = useRoute<any>() as { params: Params };
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const user = useAppSelector((s) => s.auth.user);
    const results = useAppSelector(selectCardResults);
    const progress = useAppSelector((s) => s.learning.progress);
    const transactions = useAppSelector((s) => s.transactions.items);

    // Built once. The mistake bank changes as the deck is answered and the
    // deck must not re-shuffle under the learner because of it.
    const plan = useMemo(() => {
        if (params.mode === 'lesson') {
            const track = findTrack(params.trackId);
            const lesson = findLesson(params.trackId, params.lessonId);
            if (!track || !lesson) return undefined;
            const cards: SessionCard[] = lesson.cards.map((card) => ({
                kind: 'new' as const,
                trackId: track.id,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                card,
                key: isScorable(card) ? cardKey(lesson.id, card.id) : undefined,
            }));
            return {
                cards,
                title: lesson.title,
                lesson: { trackId: track.id, lessonId: lesson.id, total: track.lessons.length, completesLesson: true },
            };
        }
        const completedByTrack: Record<string, string[]> = {};
        for (const [pathId, p] of Object.entries(progress)) completedByTrack[pathId] = p.completedModules ?? [];
        const s = buildSession(results, completedByTrack, transactions);
        return { cards: s.cards, title: "Today's session", lesson: s.lesson };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [index, setIndex] = useState(0);
    const [answered, setAnswered] = useState<Record<number, boolean>>({});
    // An empty session (everything mastered, no lessons left, no data) has
    // nothing to play and opens straight on the results view, which says so.
    const [phase, setPhase] = useState<'deck' | 'done'>(plan && plan.cards.length === 0 ? 'done' : 'deck');
    const [celebrating, setCelebrating] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const finishedRef = useRef(false);

    const cards = plan?.cards ?? [];
    const current = cards[index];
    const needsAnswer = current ? isScorable(current.card) : false;
    const canContinue = !needsAnswer || answered[index] !== undefined;

    const onAnswer = (correct: boolean) => {
        setAnswered((a) => ({ ...a, [index]: correct }));
        const c = cards[index];
        if (c?.key) {
            dispatch(answerLessonCard({ key: c.key, trackId: c.trackId, lessonId: c.lessonId, correct }));
        }
    };

    const finish = async () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        setPhase('done');
        haptics.celebrate();
        setCelebrating(true);
        if (!user?.uid) return;
        if (params.mode === 'session') dispatch(markSessionDone());
        if (plan?.lesson?.completesLesson) {
            dispatch(completeModule({
                userId: user.uid,
                pathId: plan.lesson.trackId,
                moduleId: plan.lesson.lessonId,
                totalModules: plan.lesson.total,
            }));
        } else {
            // A session that did not close a lesson still counts as a day.
            try {
                await recordStudyDay(user.uid);
                dispatch(fetchUserProfile(user.uid));
            } catch { /* streak write failed; the answers are already saved */ }
        }
    };

    const next = () => {
        haptics.tap();
        if (index + 1 < cards.length) {
            setIndex((i) => i + 1);
            scrollRef.current?.scrollTo({ y: 0, animated: false });
        } else {
            finish();
        }
    };

    if (!plan) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary, alignItems: 'center', justifyContent: 'center', padding: GUTTER }}>
                <Text style={{ ...TYPE.heading, color: COLORS.text.primary }}>That lesson is not here</Text>
                <PressableScale onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
                    <Text style={{ ...TYPE.callout, color: COLORS.brand.link }}>Go back</Text>
                </PressableScale>
            </SafeAreaView>
        );
    }

    const scorable = cards.filter((c) => isScorable(c.card)).length;
    const right = Object.values(answered).filter(Boolean).length;
    const missed = cards.filter((c, i) => answered[i] === false);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface.secondary }} edges={['top', 'bottom']}>
            {/* Header: close, segmented progress */}
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
                    {cards.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                flex: 1, height: 5, borderRadius: 3,
                                backgroundColor: phase === 'done' || i < index || (i === index && canContinue)
                                    ? (answered[i] === false ? COLORS.semantic.loss : COLORS.brand.primary)
                                    : COLORS.surface.tertiary,
                            }}
                        />
                    ))}
                </View>
            </View>

            {phase === 'deck' && current ? (
                <>
                    <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Animated.View key={index} entering={reduced ? FadeIn.duration(160) : SlideInRight.duration(260)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: current.kind === 'yourMoney' ? COLORS.semantic.profitBg : current.kind === 'review' ? COLORS.semantic.alertBg : COLORS.brand.soft }}>
                                    <Text style={{ ...TYPE.micro, color: current.kind === 'yourMoney' ? COLORS.semantic.profit : current.kind === 'review' ? COLORS.semantic.alertAmber : COLORS.brand.link }}>
                                        {KIND_LABEL[current.kind]}
                                    </Text>
                                </View>
                                <Text numberOfLines={1} style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginLeft: 8, flex: 1 }}>{current.lessonTitle}</Text>
                            </View>
                            <CardRenderer card={current.card} onAnswer={onAnswer} />
                        </Animated.View>
                    </ScrollView>

                    <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 8 }}>
                        <PressableScale
                            onPress={next}
                            disabled={!canContinue}
                            accessibilityRole="button"
                            style={{
                                height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: canContinue ? COLORS.brand.primaryDark : COLORS.surface.tertiary,
                            }}
                        >
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: canContinue ? COLORS.brand.onAccent : COLORS.text.tertiary, marginRight: 6 }}>
                                {index + 1 < cards.length ? 'Continue' : 'Finish'}
                            </Text>
                            <ChevronRight size={18} color={canContinue ? COLORS.brand.onAccent : COLORS.text.tertiary} />
                        </PressableScale>
                    </View>
                </>
            ) : (
                <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(300)}>
                        {cards.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingTop: 48 }}>
                                <BrainCircuit size={36} color={COLORS.border.strong} />
                                <Text style={{ ...TYPE.heading, color: COLORS.text.primary, marginTop: 14, textAlign: 'center' }}>Nothing due today</Text>
                                <Text style={{ ...TYPE.body, color: COLORS.text.secondary, marginTop: 6, textAlign: 'center' }}>
                                    Every lesson is finished and nothing in your mistake bank is due. Pick a track to review.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 20 }}>
                                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.semantic.profitBg, alignItems: 'center', justifyContent: 'center' }}>
                                        <Sparkles size={28} color={COLORS.semantic.profit} />
                                    </View>
                                    <Text style={{ ...TYPE.title, color: COLORS.text.primary, marginTop: 16 }}>{plan.title}</Text>
                                    <Text style={{ ...TYPE.body, color: COLORS.text.secondary, marginTop: 4 }}>
                                        {scorable === 0 ? 'Done' : `${right} of ${scorable} right`}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                    <Stat icon={<Flame size={16} color={COLORS.semantic.alertAmber} />} value={String(cards.length)} label="cards" />
                                    <Stat icon={<BrainCircuit size={16} color={COLORS.brand.primary} />} value={String(missed.length)} label={missed.length === 1 ? 'to revisit' : 'to revisit'} />
                                </View>

                                {missed.length > 0 ? (
                                    <View style={{ padding: 16, borderRadius: 14, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, marginBottom: 16 }}>
                                        <Text style={{ ...TYPE.caption, color: COLORS.text.secondary, marginBottom: 8 }}>Coming back tomorrow</Text>
                                        {missed.map((c, i) => (
                                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                                                <RotateCcw size={12} color={COLORS.text.tertiary} />
                                                <Text numberOfLines={2} style={{ ...TYPE.callout, fontSize: 14, color: COLORS.text.primary, marginLeft: 8, flex: 1 }}>
                                                    {promptOf(c)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={{ padding: 16, borderRadius: 14, backgroundColor: COLORS.semantic.profitBg, marginBottom: 16 }}>
                                        <Text style={{ ...TYPE.callout, color: COLORS.semantic.profit }}>
                                            Clean run. These cards move out to a longer interval before they come back.
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        <PressableScale
                            onPress={() => { haptics.tap(); navigation.goBack(); }}
                            accessibilityRole="button"
                            style={{ height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark }}
                        >
                            <Text style={{ ...TYPE.callout, fontFamily: FONTS.bold, color: COLORS.brand.onAccent }}>Done</Text>
                        </PressableScale>
                    </Animated.View>
                </ScrollView>
            )}

            <Confetti active={celebrating} onDone={() => setCelebrating(false)} />
        </SafeAreaView>
    );
};

const Stat: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => (
    <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, flexDirection: 'row', alignItems: 'center' }}>
        {icon}
        <Text style={{ ...TYPE.amountMd, color: COLORS.text.primary, marginLeft: 10 }}>{value}</Text>
        <Text style={{ ...TYPE.caption, color: COLORS.text.tertiary, marginLeft: 6 }}>{label}</Text>
    </View>
);

function promptOf(c: SessionCard): string {
    const card = c.card;
    switch (card.type) {
        case 'trueFalse': return card.statement;
        case 'explorable': return card.question?.prompt ?? card.prompt;
        case 'info': return card.title;
        default: return card.prompt;
    }
}

export default LessonPlayerScreen;
