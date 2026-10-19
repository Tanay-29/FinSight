/**
 * LearnScreen: the path.
 *
 * Learn used to be a stack of course cards, stats and a tab switcher, which
 * asked the learner to choose before they knew enough to choose. It is one
 * path now, the way Duolingo lays out a course: six units, each a winding
 * line of lesson circles, done ones gold, the next one pulsing with Sikka
 * beside it, later ones locked. There is always exactly one obvious thing to
 * tap.
 *
 * Units are the six lesson tracks. Their order is life stage, except that
 * whatever the learner said they came for in onboarding goes first, which is
 * what onboarding tells them will happen.
 *
 * Below the path is everything else, quietly: the life sims, the two
 * decoders, the original courses, and a searchable glossary.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeIn, FadeInDown, FadeOut, useReducedMotion,
    useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
    Check, Lock, Star, Search, BrainCircuit, ChevronRight, ChevronDown,
    Drama, ScanLine, FileText, BookOpen, BrainCog,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGlossary, fetchLearningPaths, fetchUserProgress } from '../store/slices/learningSlice';
import { fetchDueCards, selectDueCount, selectMasteredCount, selectTrackedCount } from '../store/slices/reviewsSlice';
import { fetchCardResults, selectCardResults } from '../store/slices/lessonsSlice';
import { GLOSSARY, COURSE_CONTENT } from '../data/courseContent';
import { TRACKS, cardKey, Track } from '../data/lessons';
import { isScorable } from '../data/lessons/schema';
import { isMastered } from '../services/lessonService';
import { SCENARIOS } from '../data/scenarios';
import { PressableScale } from '../components/PressableScale';
import { Mascot } from '../components/mascot/Mascot';
import * as haptics from '../utils/haptics';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../theme/tokens';
import { PALETTE } from '../theme/palette';

/** What each onboarding goal moves to the front of the path. */
const GOAL_FIRST_TRACK: Record<string, string> = {
    budgeting: 'student',
    goals: 'protect',
    investing: 'grow',
    education: 'firstJob',
};

/**
 * One colour per unit. The light palette's category hues on purpose, in both
 * themes: white text sits on these, and the dark theme's lifted hues are too
 * pale to carry it.
 */
const unitColour = (i: number): string =>
    [PALETTE.category.transport, PALETTE.category.housing, PALETTE.category.shopping,
        PALETTE.category.healthcare, PALETTE.category.investments, PALETTE.category.dining][i % 6];

/** The winding: each node's sideways offset, repeating every eight. */
const WIND = [0, 46, 70, 46, 0, -46, -70, -46];
const NODE = 70;

type NodeState = 'done' | 'current' | 'locked';

export const LearnScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const { user, profile } = useAppSelector((s) => s.auth);
    const { paths, glossary, progress } = useAppSelector((s) => s.learning);
    const dueCount = useAppSelector(selectDueCount);
    const masteredCount = useAppSelector(selectMasteredCount);
    const trackedCount = useAppSelector(selectTrackedCount);
    const cardResults = useAppSelector(selectCardResults);

    const [glossaryOpen, setGlossaryOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [lockedNote, setLockedNote] = useState(false);
    const lockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        dispatch(fetchLearningPaths());
        dispatch(fetchGlossary());
        if (user?.uid) {
            dispatch(fetchUserProgress(user.uid));
            dispatch(fetchDueCards());
            dispatch(fetchCardResults());
        }
        return () => { if (lockedTimer.current) clearTimeout(lockedTimer.current); };
    }, [dispatch, user?.uid]);

    // ── The path ─────────────────────────────────────────────────
    const units: Track[] = useMemo(() => {
        const first = (profile?.appGoals ?? [])
            .map((g) => GOAL_FIRST_TRACK[g])
            .filter((id, i, all): id is string => Boolean(id) && all.indexOf(id) === i);
        const rank = (t: Track) => {
            const i = first.indexOf(t.id);
            return i === -1 ? first.length + TRACKS.indexOf(t) : i;
        };
        return [...TRACKS].sort((a, b) => rank(a) - rank(b));
    }, [profile?.appGoals]);

    const isDone = (trackId: string, lessonId: string) =>
        progress[trackId]?.completedModules?.includes(lessonId) ?? false;

    /** The first lesson not yet done, in path order. Everything after it is locked. */
    const current = useMemo(() => {
        for (const t of units) for (const l of t.lessons) {
            if (!(progress[t.id]?.completedModules ?? []).includes(l.id)) return `${t.id}/${l.id}`;
        }
        return null;
    }, [units, progress]);

    const stateOf = (trackId: string, lessonId: string): NodeState =>
        isDone(trackId, lessonId) ? 'done' : `${trackId}/${lessonId}` === current ? 'current' : 'locked';

    const concepts = useMemo(() => {
        let total = 0;
        let known = 0;
        for (const t of TRACKS) for (const l of t.lessons) for (const c of l.cards) {
            if (!isScorable(c)) continue;
            total += 1;
            const r = cardResults[cardKey(l.id, c.id)];
            if (r && isMastered(r)) known += 1;
        }
        return { total, known };
    }, [cardResults]);

    // Scroll so the current lesson is in view on arrival, once.
    const scrollRef = useRef<ScrollView>(null);
    const pathTop = useRef(0);
    const unitTops = useRef<Record<string, number>>({});
    const scrolled = useRef(false);
    const onCurrentLayout = (trackId: string, y: number) => {
        if (scrolled.current) return;
        const unitY = unitTops.current[trackId];
        if (unitY === undefined) return;
        scrolled.current = true;
        const target = pathTop.current + unitY + y - 220;
        if (target > 40) scrollRef.current?.scrollTo({ y: target, animated: !reduced });
    };

    const openLesson = (trackId: string, lessonId: string, state: NodeState) => {
        if (state === 'locked') {
            haptics.warn();
            setLockedNote(true);
            if (lockedTimer.current) clearTimeout(lockedTimer.current);
            lockedTimer.current = setTimeout(() => setLockedNote(false), 2200);
            return;
        }
        haptics.tap();
        navigation.navigate('LessonPlayer', { mode: 'lesson', trackId, lessonId });
    };

    // ── Everything else ──────────────────────────────────────────
    const classic = paths.length > 0 ? paths : (COURSE_CONTENT as any[]);
    const displayGlossary = glossary.length > 0 ? glossary : GLOSSARY;
    const filteredGlossary = displayGlossary.filter(
        (t) =>
            t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.definition.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Each node's place in the whole path, for the winding offset.
    const nodeOrder: Record<string, number> = {};
    units.forEach((t) => t.lessons.forEach((l) => { nodeOrder[`${t.id}/${l.id}`] = Object.keys(nodeOrder).length; }));

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header: one number, the one that measures knowing things. */}
                <View className="flex-row items-end justify-between pt-3" style={{ paddingHorizontal: GUTTER }}>
                    <Text style={TYPE.title} className="text-text-primary">Learn</Text>
                    <View
                        className="flex-row items-center px-3 h-9"
                        style={{ borderRadius: RADIUS.pill, backgroundColor: COLORS.semantic.profitBg }}
                        accessibilityLabel={`${concepts.known} of ${concepts.total} concepts known`}
                    >
                        <BrainCog size={16} color={COLORS.semantic.profit} strokeWidth={2} />
                        <Text style={[TYPE.amountSm, { marginLeft: 6, color: COLORS.semantic.profit }]}>
                            {concepts.known}/{concepts.total}
                        </Text>
                        <Text style={TYPE.caption} className="text-profit ml-1">known</Text>
                    </View>
                </View>

                {dueCount > 0 && (
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate('Flashcards', { mode: 'due', moduleTitle: 'Review session' }); }}
                        accessibilityRole="button"
                        containerStyle={{ marginHorizontal: GUTTER, marginTop: 14 }}
                        style={{ borderRadius: RADIUS.card, padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.brand.edge }}
                    >
                        <BrainCircuit size={20} color={COLORS.brand.link} />
                        <View className="flex-1 ml-3">
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">
                                {dueCount} card{dueCount === 1 ? '' : 's'} to review
                            </Text>
                            <Text style={TYPE.caption} className="text-text-secondary">{masteredCount} of {trackedCount} mastered</Text>
                        </View>
                        <ChevronRight size={18} color={COLORS.brand.link} />
                    </PressableScale>
                )}

                {/* ── The path ────────────────────────────────── */}
                <View onLayout={(e: LayoutChangeEvent) => { pathTop.current = e.nativeEvent.layout.y; }}>
                    {units.map((track, u) => {
                        const colour = unitColour(TRACKS.indexOf(track));
                        const doneCount = track.lessons.filter((l) => isDone(track.id, l.id)).length;
                        return (
                            <View
                                key={track.id}
                                onLayout={(e: LayoutChangeEvent) => { unitTops.current[track.id] = e.nativeEvent.layout.y; }}
                                style={{ marginTop: u === 0 ? 18 : 28 }}
                            >
                                {/* Unit banner */}
                                <View
                                    style={{ marginHorizontal: GUTTER, borderRadius: RADIUS.card, padding: 16, backgroundColor: colour }}
                                >
                                    <Text style={[TYPE.micro, { color: 'rgba(255,255,255,0.85)' }]}>
                                        Unit {u + 1} · {doneCount}/{track.lessons.length} done
                                    </Text>
                                    <Text style={[TYPE.heading, { color: '#FFFFFF', marginTop: 3 }]}>{track.title}</Text>
                                    <Text style={[TYPE.caption, { color: 'rgba(255,255,255,0.9)', marginTop: 2 }]}>{track.description}</Text>
                                </View>

                                {/* Nodes */}
                                <View style={{ alignItems: 'center', paddingTop: 22 }}>
                                    {track.lessons.map((lesson) => {
                                        const state = stateOf(track.id, lesson.id);
                                        const x = WIND[nodeOrder[`${track.id}/${lesson.id}`] % WIND.length];
                                        return (
                                            <View
                                                key={lesson.id}
                                                style={{ alignItems: 'center', marginBottom: 18, transform: [{ translateX: x }] }}
                                                onLayout={state === 'current'
                                                    ? (e: LayoutChangeEvent) => onCurrentLayout(track.id, e.nativeEvent.layout.y)
                                                    : undefined}
                                            >
                                                {state === 'current' && (
                                                    <Animated.View entering={reduced ? undefined : FadeIn.duration(300)} className="mb-2">
                                                        <View style={{ backgroundColor: COLORS.surface.primary, borderColor: COLORS.border.default, borderWidth: 1, borderRadius: RADIUS.control, paddingHorizontal: 12, paddingVertical: 6 }}>
                                                            <Text style={[TYPE.micro, { color: COLORS.brand.link }]}>{doneCount === 0 && u === 0 ? 'Start here' : 'Next up'}</Text>
                                                        </View>
                                                    </Animated.View>
                                                )}
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <PathNode
                                                        state={state}
                                                        colour={colour}
                                                        reduced={reduced}
                                                        label={lesson.title}
                                                        onPress={() => openLesson(track.id, lesson.id, state)}
                                                    />
                                                    {state === 'current' && (
                                                        <View style={{ position: 'absolute', left: x > 0 ? -92 : NODE + 18 }}>
                                                            <Mascot mood="happy" size={66} />
                                                        </View>
                                                    )}
                                                </View>
                                                <Text
                                                    style={[TYPE.caption, { marginTop: 6, maxWidth: 150, textAlign: 'center', color: state === 'locked' ? COLORS.text.tertiary : COLORS.text.primary }]}
                                                    numberOfLines={2}
                                                >
                                                    {lesson.title}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}

                    {current === null && (
                        <View style={{ alignItems: 'center', marginTop: 8, paddingHorizontal: GUTTER }}>
                            <Mascot mood="celebrate" size={96} />
                            <Text style={TYPE.heading} className="text-text-primary text-center mt-2">Every unit done</Text>
                            <Text style={TYPE.caption} className="text-text-secondary text-center mt-1">
                                The daily lesson on Today keeps the cards you missed coming back.
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── More to explore ─────────────────────────── */}
                <Text style={[TYPE.micro, { marginTop: 30, marginBottom: 10, marginHorizontal: GUTTER }]} className="text-text-tertiary">
                    More to explore
                </Text>

                {SCENARIOS.map((sim) => {
                    const played = progress.lifeSims?.completedModules?.includes(sim.id) ?? false;
                    return (
                        <Row
                            key={sim.id}
                            icon={<Drama size={19} color={COLORS.semantic.alertAmber} />}
                            title={`Life sim: ${sim.title}`}
                            body={`${sim.summary}, ${sim.minutes} min`}
                            done={played}
                            onPress={() => navigation.navigate('ScenarioPlayer', { scenarioId: sim.id })}
                        />
                    );
                })}
                <Row
                    icon={<ScanLine size={19} color={COLORS.brand.link} />}
                    title="Decode a card statement"
                    body="Which line to pay, and what the minimum really costs"
                    onPress={() => navigation.navigate('StatementDecoder')}
                />
                <Row
                    icon={<FileText size={19} color={COLORS.brand.link} />}
                    title="Decode a payslip"
                    body="Every line explained, anything odd flagged"
                    onPress={() => navigation.navigate('PayslipDecoder')}
                />
                {classic.map((path) => {
                    const done = progress[path.id ?? '']?.completedModules?.length ?? 0;
                    const total = path.modules?.length ?? 0;
                    return (
                        <Row
                            key={path.id}
                            icon={<BookOpen size={19} color={COLORS.text.secondary} />}
                            title={path.title}
                            body={`Classic course, ${done}/${total} read`}
                            done={total > 0 && done === total}
                            onPress={() => navigation.navigate('LearnPathDetail', { path })}
                        />
                    );
                })}

                {/* Glossary, folded away until wanted. */}
                <Pressable
                    onPress={() => { haptics.select(); setGlossaryOpen((v) => !v); }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: glossaryOpen }}
                    style={{ marginHorizontal: GUTTER, marginTop: 4, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
                >
                    <Search size={18} color={COLORS.text.secondary} />
                    <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary ml-3 flex-1">
                        Glossary, {displayGlossary.length} terms
                    </Text>
                    {glossaryOpen ? <ChevronDown size={18} color={COLORS.text.tertiary} /> : <ChevronRight size={18} color={COLORS.text.tertiary} />}
                </Pressable>
                {glossaryOpen && (
                    <Animated.View entering={reduced ? undefined : FadeInDown.duration(200)} exiting={reduced ? undefined : FadeOut.duration(120)} style={{ marginHorizontal: GUTTER }}>
                        <TextInput
                            className="bg-surface-primary border border-border rounded-control px-4 h-[46px] text-sm text-text-primary font-inter mb-3"
                            placeholder="Search a term, like SIP or CIBIL"
                            placeholderTextColor={COLORS.text.tertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {filteredGlossary.length === 0 ? (
                            <Text style={TYPE.caption} className="text-text-tertiary text-center py-4">No terms match "{searchQuery}"</Text>
                        ) : filteredGlossary.map((term, idx) => (
                            <View key={term.term + idx} className="bg-surface-primary border border-border px-4 py-3 mb-2" style={{ borderRadius: RADIUS.control }}>
                                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-brand-link">{term.term}</Text>
                                <Text style={TYPE.caption} className="text-text-secondary mt-0.5">{term.definition}</Text>
                            </View>
                        ))}
                    </Animated.View>
                )}
            </ScrollView>

            {lockedNote && (
                <Animated.View
                    entering={FadeInDown.duration(180)}
                    exiting={FadeOut.duration(160)}
                    pointerEvents="none"
                    style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: 16, borderRadius: RADIUS.pill, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.text.primary }}
                >
                    <Text style={[TYPE.callout, { color: COLORS.surface.primary, textAlign: 'center' }]}>
                        Finish the lesson before this one first.
                    </Text>
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

/** One circle on the path. The current one breathes, so the eye finds it. */
const PathNode: React.FC<{
    state: NodeState;
    colour: string;
    reduced: boolean;
    label: string;
    onPress: () => void;
}> = ({ state, colour, reduced, label, onPress }) => {
    const pulse = useSharedValue(0);
    useEffect(() => {
        if (state !== 'current' || reduced) return;
        pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1));
        return () => cancelAnimation(pulse);
    }, [state, reduced, pulse]);
    const ring = useAnimatedStyle(() => ({
        opacity: 0.45 * (1 - pulse.value),
        transform: [{ scale: 1 + 0.35 * pulse.value }],
    }));

    const fill = state === 'done' ? '#F5B82E' : state === 'current' ? colour : COLORS.surface.tertiary;
    // A darker lip under the circle, so it reads as a button you can press.
    const lip = state === 'done' ? '#D9960F' : state === 'current' ? 'rgba(0,0,0,0.25)' : COLORS.border.strong;

    return (
        <View style={{ width: NODE, height: NODE + 6 }}>
            {state === 'current' && (
                <Animated.View
                    pointerEvents="none"
                    style={[{ position: 'absolute', left: 0, top: 0, width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: colour }, ring]}
                />
            )}
            <View style={{ position: 'absolute', left: 0, top: 6, width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: lip }} />
            <PressableScale
                onPress={onPress}
                activeScale={0.92}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${state === 'done' ? 'done' : state === 'current' ? 'next lesson' : 'locked'}`}
                style={{ width: NODE, height: NODE, borderRadius: NODE / 2, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}
            >
                {state === 'done'
                    ? <Check size={30} color="#FFFFFF" strokeWidth={3.2} />
                    : state === 'current'
                        ? <Star size={28} color="#FFFFFF" fill="#FFFFFF" />
                        : <Lock size={24} color={COLORS.text.muted} strokeWidth={2.2} />}
            </PressableScale>
        </View>
    );
};

const Row: React.FC<{ icon: React.ReactNode; title: string; body: string; done?: boolean; onPress: () => void }> = ({ icon, title, body, done, onPress }) => (
    <PressableScale
        onPress={() => { haptics.tap(); onPress(); }}
        accessibilityRole="button"
        containerStyle={{ marginHorizontal: GUTTER, marginBottom: 10 }}
        style={{ borderRadius: RADIUS.card, padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default }}
    >
        <View className="w-10 h-10 items-center justify-center mr-3" style={{ borderRadius: RADIUS.tile, backgroundColor: COLORS.surface.tertiary }}>
            {icon}
        </View>
        <View className="flex-1">
            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">{title}</Text>
            <Text style={TYPE.caption} className="text-text-secondary mt-0.5" numberOfLines={2}>{body}</Text>
        </View>
        {done ? <Check size={18} color={COLORS.semantic.profit} strokeWidth={3} /> : <ChevronRight size={18} color={COLORS.text.tertiary} />}
    </PressableScale>
);

export default LearnScreen;
