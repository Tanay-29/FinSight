/**
 * LearnScreen - Education Hub
 *
 * Features:
 * - Real stats: total modules done, badges earned, day streak (from Redux)
 * - Onboarding-aware path recommendations (appGoals from user profile)
 * - Live progress bars from the Firestore progress subcollection
 * - Searchable glossary
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
    BookOpen, Flame, Search, HelpCircle, GraduationCap,
    ChevronRight, Trophy, Target, BrainCircuit, Snowflake,
    Layers, Hourglass,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGlossary, fetchLearningPaths, fetchUserProgress } from '../store/slices/learningSlice';
import { fetchDueCards, selectDueCount, selectMasteredCount, selectTrackedCount } from '../store/slices/reviewsSlice';
import { GLOSSARY, COURSE_CONTENT } from '../data/courseContent';
import { CourseCardSkeleton, StatCardSkeleton } from '../components/Skeleton';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { BarFill } from '../components/BarFill';
import { PressableScale } from '../components/PressableScale';
import { streakAtRisk, MAX_FREEZES } from '../utils/streak';
import * as haptics from '../utils/haptics';
import { COLORS, TYPE } from '../theme/tokens';

// Map onboarding goal → which pathId to promote first
const GOAL_PATH_PRIORITY: Record<string, string> = {
    budgeting: 'budgetBasics',
    investing: 'investing101',
    education: 'taxSimplified',
    goals: 'budgetBasics',
};

export const LearnScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const reduced = useReducedMotion();

    const { user, profile } = useAppSelector((s) => s.auth);
    const { paths, glossary, progress, loading, progressLoading, streak } = useAppSelector((s) => s.learning);

    const dueCount = useAppSelector(selectDueCount);
    const masteredCount = useAppSelector(selectMasteredCount);
    const trackedCount = useAppSelector(selectTrackedCount);

    const [activeTab, setActiveTab] = useState<'paths' | 'glossary'>('paths');
    const [searchQuery, setSearchQuery] = useState('');

    const userInitial = user?.displayName?.charAt(0).toUpperCase() || 'U';

    // Fetch on mount
    useEffect(() => {
        dispatch(fetchLearningPaths());
        dispatch(fetchGlossary());
        if (user?.uid) {
            dispatch(fetchUserProgress(user.uid));
            dispatch(fetchDueCards());
        }
    }, [dispatch, user?.uid]);

    // ── Real stats ───────────────────────────────────────────────
    const totalDone = Object.values(progress).reduce(
        (sum, p) => sum + (p.completedModules?.length ?? 0), 0
    );
    const badgesEarned = Object.values(progress).filter((p) => p.badgeEarned).length;
    const currentStreak = profile?.streak ?? streak;
    const freezes = profile?.streakFreezes ?? 0;
    const atRisk = streakAtRisk({
        streak: currentStreak,
        lastStudiedDate: profile?.lastStudiedDate ?? '',
        freezes,
    });

    // ── Onboarding-aware path ordering ─────────────────────────
    const displayPaths = (() => {
        const all = paths.length > 0 ? paths : (COURSE_CONTENT as any[]);
        if (!profile?.appGoals || profile.appGoals.length === 0) return all;

        // Build priority list from user's goals
        const priorityIds = profile.appGoals
            .map((g) => GOAL_PATH_PRIORITY[g])
            .filter(Boolean);

        const sorted = [...all].sort((a, b) => {
            const aIdx = priorityIds.indexOf(a.id ?? '');
            const bIdx = priorityIds.indexOf(b.id ?? '');
            if (aIdx !== -1 && bIdx === -1) return -1;
            if (bIdx !== -1 && aIdx === -1) return 1;
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            return 0;
        });
        return sorted;
    })();

    // ── Glossary ────────────────────────────────────────────────
    const displayGlossary = glossary.length > 0 ? glossary : GLOSSARY;
    const filteredGlossary = displayGlossary.filter(
        (t) =>
            t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.definition.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Resolve real progress for a given path ──────────────────
    const getPathProgress = (pathId: string | undefined) => {
        if (!pathId) return { completed: 0, total: 0 };
        const p = progress[pathId];
        const total = displayPaths.find((dp) => dp.id === pathId)?.modules?.length ?? 0;
        return { completed: p?.completedModules?.length ?? 0, total };
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                {/* ── Header ──────────────────────────────────── */}
                <View className="px-5 pt-4 pb-3 flex-row justify-between items-center bg-surface-primary border-b border-border">
                    <View>
                        <Text style={TYPE.title} className="text-text-primary">Learn</Text>
                        <Text className="text-sm text-text-secondary mt-0.5 font-inter">
                            {totalDone === 0
                                ? 'Courses, practice and a glossary'
                                : `${totalDone} module${totalDone === 1 ? '' : 's'} done so far`}
                        </Text>
                    </View>
                    <PressableScale
                        onPress={() => { haptics.tap(); navigation.navigate('Profile'); }}
                        activeScale={0.92}
                        accessibilityRole="button"
                        accessibilityLabel="Your profile"
                        className="w-10 h-10 rounded-full bg-brand-primary-dark items-center justify-center"
                    >
                        <Text className="text-white font-inter-bold text-base">{userInitial}</Text>
                    </PressableScale>
                </View>

                {/* ── Stats Row ──────────────────────────────── */}
                <View className="mx-5 mt-4 flex-row gap-3">
                    {progressLoading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            {/* Modules done */}
                            <View className="flex-1 bg-surface-primary rounded-2xl p-4 items-center border border-border">
                                <View className="w-10 h-10 rounded-full bg-brand-soft items-center justify-center mb-2">
                                    <BookOpen size={18} color={COLORS.brand.primary} />
                                </View>
                                <AnimatedNumber
                                    value={totalDone}
                                    format={(v) => String(Math.round(v))}
                                    className="text-2xl font-inter-bold text-text-primary"
                                />
                                <Text className="text-xs text-text-tertiary text-center mt-0.5 font-inter">Modules done</Text>
                            </View>

                            {/* Badges earned */}
                            <View className="flex-1 bg-surface-primary rounded-2xl p-4 items-center border border-border">
                                <View className="w-10 h-10 rounded-full bg-alert-bg items-center justify-center mb-2">
                                    <Trophy size={18} color={COLORS.semantic.alertAmberFill} />
                                </View>
                                <AnimatedNumber
                                    value={badgesEarned}
                                    format={(v) => String(Math.round(v))}
                                    className="text-2xl font-inter-bold text-text-primary"
                                />
                                <Text className="text-xs text-text-tertiary text-center mt-0.5 font-inter">Badges earned</Text>
                            </View>

                            {/* Streak, with banked freezes shown underneath */}
                            <View className="flex-1 bg-surface-primary rounded-2xl p-4 items-center border border-border">
                                <View className="w-10 h-10 rounded-full bg-alert-bg items-center justify-center mb-2">
                                    <Flame size={18} color="#C2410C" />
                                </View>
                                <AnimatedNumber
                                    value={currentStreak}
                                    format={(v) => String(Math.round(v))}
                                    className="text-2xl font-inter-bold text-text-primary"
                                />
                                <Text className="text-xs text-text-tertiary text-center mt-0.5 font-inter">Day streak</Text>
                                {freezes > 0 ? (
                                    <View className="flex-row items-center mt-1.5">
                                        {Array.from({ length: MAX_FREEZES }).map((_, i) => (
                                            <Snowflake
                                                key={i}
                                                size={10}
                                                color={i < freezes ? '#0E7490' : COLORS.border.default}
                                            />
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        </>
                    )}
                </View>

                {/* ── Streak at risk ──────────────────────────── */}
                {atRisk && currentStreak > 0 ? (
                    <View className={`mx-5 mt-4 rounded-2xl border p-4 flex-row items-center ${freezes > 0 ? 'bg-brand-soft border-brand-edge' : 'bg-alert-bg border-alert-bg'}`}>
                        <View className="w-11 h-11 rounded-2xl bg-surface-primary items-center justify-center mr-3">
                            {freezes > 0
                                ? <Snowflake size={20} color="#0E7490" />
                                : <Flame size={20} color="#C2410C" />}
                        </View>
                        <View className="flex-1">
                            <Text className={`text-base font-inter-bold ${freezes > 0 ? 'text-brand-link' : 'text-alert-amber'}`}>
                                {freezes > 0
                                    ? `${currentStreak}-day streak protected`
                                    : `${currentStreak}-day streak at risk`}
                            </Text>
                            <Text className={`text-xs mt-0.5 ${freezes > 0 ? 'text-brand-link' : 'text-alert-amber'}`}>
                                {freezes > 0
                                    ? `A freeze will cover the day you missed. ${freezes} left.`
                                    : 'Finish any module today to keep it alive.'}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* ── Cards due for review ────────────────────── */}
                {dueCount > 0 ? (
                    <TouchableOpacity
                        onPress={() => { haptics.tap(); navigation.navigate('Flashcards', { mode: 'due', moduleTitle: 'Review session' }); }}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Review ${dueCount} cards due today`}
                        className="mx-5 mt-4 bg-surface-primary rounded-2xl border border-brand-edge p-4 flex-row items-center"
                       
                    >
                        <View className="w-11 h-11 rounded-2xl bg-brand-soft items-center justify-center mr-3">
                            <BrainCircuit size={20} color={COLORS.brand.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-inter-bold text-text-primary">
                                {dueCount} card{dueCount === 1 ? '' : 's'} due today
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                                {masteredCount} of {trackedCount} mastered. Cards you miss come back sooner.
                            </Text>
                        </View>
                        <ChevronRight size={18} color={COLORS.brand.primary} />
                    </TouchableOpacity>
                ) : trackedCount > 0 ? (
                    <View className="mx-5 mt-4 bg-profit-bg rounded-2xl border border-profit-bg p-4 flex-row items-center">
                        <View className="w-11 h-11 rounded-2xl bg-surface-primary items-center justify-center mr-3">
                            <Trophy size={20} color={COLORS.semantic.profit} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-inter-bold text-profit">All caught up</Text>
                            <Text className="text-xs text-profit mt-0.5 font-inter">
                                {masteredCount} of {trackedCount} cards mastered. Check back tomorrow.
                            </Text>
                        </View>
                    </View>
                ) : null}




                {/* ── Practise ────────────────────────────────────
                    Three tools that teach by doing. They used to sit in a grid
                    of tiles on the Vitals screen, which is where you go to see
                    how the month is going, not to learn something. */}
                <Text className="mx-5 mt-6 mb-1 text-2xs font-inter-semibold text-text-tertiary uppercase tracking-widerst">
                    Practise
                </Text>

                <PressableScale
                    onPress={() => { haptics.tap(); navigation.navigate('GuessSpend'); }}
                    accessibilityRole="button"
                    className="mx-5 mt-2 bg-surface-primary rounded-2xl border border-border p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-2xl bg-loss-bg items-center justify-center mr-3">
                        <Target size={20} color={COLORS.semantic.loss} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-text-primary">Which was more?</Text>
                        <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                            Two of your own categories, head to head. Find your blind spot
                        </Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.semantic.loss} />
                </PressableScale>

                <PressableScale
                    onPress={() => { haptics.tap(); navigation.navigate('SwipeCategorise'); }}
                    accessibilityRole="button"
                    className="mx-5 mt-3 bg-surface-primary rounded-2xl border border-border p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-2xl bg-brand-soft items-center justify-center mr-3">
                        <Layers size={20} color="#0E7490" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-text-primary">Tidy Up</Text>
                        <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                            Sort miscategorised transactions and teach the app as you go
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#0E7490" />
                </PressableScale>

                <PressableScale
                    onPress={() => { haptics.tap(); navigation.navigate('TimeMachine'); }}
                    accessibilityRole="button"
                    className="mx-5 mt-3 bg-surface-primary rounded-2xl border border-border p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-2xl bg-profit-bg items-center justify-center mr-3">
                        <Hourglass size={20} color={COLORS.semantic.profit} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-text-primary">Time Machine</Text>
                        <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                            What a small regular spend is worth decades from now
                        </Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.semantic.profit} />
                </PressableScale>


                {/* ── Tab Switcher ────────────────────────────── */}
                <View className="flex-row mx-5 mt-4 bg-surface-tertiary rounded-xl p-1">
                    <TouchableOpacity
                        onPress={() => { haptics.select(); setActiveTab('paths'); }}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center ${activeTab === 'paths' ? 'bg-surface-primary' : ''}`}
                        style={activeTab === 'paths' ? { shadowColor: '#3A2E22', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } : {}}
                    >
                        <GraduationCap size={14} color={activeTab === 'paths' ? COLORS.brand.primary : COLORS.text.tertiary} />
                        <Text style={{ color: activeTab === 'paths' ? COLORS.brand.primary : COLORS.text.tertiary }} className="text-sm font-inter-semibold ml-1.5">
                            Courses
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { haptics.select(); setActiveTab('glossary'); }}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center ${activeTab === 'glossary' ? 'bg-surface-primary' : ''}`}
                        style={activeTab === 'glossary' ? { shadowColor: '#3A2E22', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } : {}}
                    >
                        <HelpCircle size={14} color={activeTab === 'glossary' ? COLORS.brand.primary : COLORS.text.tertiary} />
                        <Text style={{ color: activeTab === 'glossary' ? COLORS.brand.primary : COLORS.text.tertiary }} className="text-sm font-inter-semibold ml-1.5">
                            Glossary
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Courses Tab ─────────────────────────────── */}
                {activeTab === 'paths' && (
                    <View className="mx-5 mt-4">
                        {loading ? (
                            <>
                                <CourseCardSkeleton />
                                <CourseCardSkeleton />
                                <CourseCardSkeleton />
                            </>
                        ) : displayPaths.length === 0 ? (
                            <View className="bg-surface-primary border border-border rounded-2xl p-6 items-center">
                                <BookOpen size={32} color={COLORS.border.strong} />
                                <Text className="text-text-secondary text-sm mt-3 text-center font-inter">
                                    No courses found. Check your connection.
                                </Text>
                            </View>
                        ) : (
                            displayPaths.map((path, i) => {
                                const { completed, total } = getPathProgress(path.id);
                                const pBadge = progress[path.id ?? '']?.badgeEarned ?? false;
                                const pPct = total > 0 ? Math.round((completed / total) * 100) : 0;

                                return (
                                    <Animated.View
                                        key={path.id}
                                        entering={
                                            reduced
                                                ? FadeIn.duration(160)
                                                : FadeInDown.duration(260).delay(i * 60)
                                        }
                                    >
                                    <PressableScale
                                        onPress={() => { haptics.tap(); navigation.navigate('LearnPathDetail', { path }); }}
                                        accessibilityRole="button"
                                        className="mb-4 bg-surface-primary rounded-2xl border border-border overflow-hidden"
                                    >
                                        {/* Top accent bar */}
                                        <View style={{ height: 3, backgroundColor: pBadge ? COLORS.semantic.profit : pPct > 0 ? COLORS.brand.primary : COLORS.border.default }} />

                                        <View className="p-4">
                                            <View className="flex-row items-start justify-between mb-2">
                                                <View className="flex-1 mr-3">
                                                    <Text className="text-base font-inter-bold text-text-primary">{path.title}</Text>
                                                    <Text className="text-xs text-text-secondary mt-0.5 leading-4 font-inter">{path.description}</Text>
                                                </View>
                                                {pBadge && (
                                                    <View className="bg-profit-bg rounded-full p-1.5">
                                                        <Trophy size={14} color={COLORS.semantic.profit} />
                                                    </View>
                                                )}
                                            </View>

                                            {/* Module count + progress */}
                                            <View className="flex-row items-center justify-between mt-2 mb-3">
                                                <Text className="text-xs text-text-tertiary font-inter">{total} modules · {path.modules?.reduce((sum: number, m: any) => {
                                                    const mins = parseInt(m.duration) || 0;
                                                    return sum + mins;
                                                }, 0)} min total</Text>
                                                <Text className="text-xs font-inter-semibold" style={{ color: pPct === 100 ? COLORS.semantic.profit : COLORS.brand.primary }}>
                                                    {completed}/{total} done
                                                </Text>
                                            </View>

                                            <BarFill
                                                percent={pPct}
                                                height={6}
                                                color={pPct === 100 ? COLORS.semantic.profit : COLORS.brand.primary}
                                                trackClassName="bg-surface-tertiary"
                                                delay={i * 60}
                                                style={{ marginBottom: 12 }}
                                            />

                                            {/* The bar and the "3/8 done" line above
                                                already carry the percentage, so this
                                                row is only the next action. */}
                                            <View className="flex-row items-center justify-end">
                                                <Text className="text-xs font-inter-semibold text-brand-link mr-1">
                                                    {pPct === 0 ? 'Start' : pPct === 100 ? 'Review' : 'Continue'}
                                                </Text>
                                                <ChevronRight size={14} color={COLORS.brand.primary} />
                                            </View>
                                        </View>
                                    </PressableScale>
                                    </Animated.View>
                                );
                            })
                        )}
                    </View>
                )}

                {/* ── Glossary Tab ────────────────────────────── */}
                {activeTab === 'glossary' && (
                    <View className="mx-5 mt-4">
                        {/* Search */}
                        <View className="flex-row items-center bg-surface-primary border border-border-strong rounded-xl px-3 mb-4">
                            <Search size={16} color={COLORS.text.tertiary} />
                            <TextInput
                                className="flex-1 py-3 pl-2 text-sm text-text-secondary font-inter"
                                placeholder="Search terms"
                                placeholderTextColor={COLORS.border.strong}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {filteredGlossary.length === 0 ? (
                            <View className="bg-surface-primary border border-border rounded-2xl p-6 items-center">
                                <HelpCircle size={28} color={COLORS.border.strong} />
                                <Text className="text-text-tertiary text-sm mt-2 font-inter">No terms match "{searchQuery}"</Text>
                            </View>
                        ) : (
                            filteredGlossary.map((term, idx) => (
                                <View
                                    key={term.term + idx}
                                    className="bg-surface-primary border border-border rounded-2xl px-4 py-3.5 mb-3"
                                >
                                    <Text className="text-sm font-inter-bold text-brand-link mb-1">{term.term}</Text>
                                    <Text className="text-sm text-text-secondary leading-5 font-inter">{term.definition}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
