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
import { useNavigation } from '@react-navigation/native';
import {
    BookOpen, Award, Flame, Search, HelpCircle, GraduationCap,
    ChevronRight, Trophy, Target, Sparkles, BrainCircuit, Snowflake,
    Layers, Hourglass,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGlossary, fetchLearningPaths, fetchUserProgress } from '../store/slices/learningSlice';
import { fetchDueCards, selectDueCount, selectMasteredCount, selectTrackedCount } from '../store/slices/reviewsSlice';
import { GLOSSARY, COURSE_CONTENT } from '../data/courseContent';
import { CourseCardSkeleton, StatCardSkeleton } from '../components/Skeleton';
import AnimatedNumber from '../components/AnimatedNumber';
import { streakAtRisk, MAX_FREEZES } from '../utils/streak';
import * as haptics from '../utils/haptics';

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
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                {/* ── Header ──────────────────────────────────── */}
                <View className="px-4 pt-4 pb-3 flex-row justify-between items-center bg-white border-b border-gray-100">
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Learning Hub</Text>
                        <Text className="text-sm text-gray-500 mt-0.5">
                            Build financial knowledge, one module at a time
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => { haptics.tap(); navigation.navigate('Profile'); }}
                        activeOpacity={0.8}
                        className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
                    >
                        <Text className="text-white font-bold text-base">{userInitial}</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Stats Row ──────────────────────────────── */}
                <View className="mx-4 mt-4 flex-row gap-3">
                    {progressLoading ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : (
                        <>
                            {/* Modules done */}
                            <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                                <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mb-2">
                                    <BookOpen size={18} color="#6366F1" />
                                </View>
                                <AnimatedNumber
                                    value={totalDone}
                                    format={(v) => String(Math.round(v))}
                                    className="text-2xl font-bold text-gray-900"
                                />
                                <Text className="text-xs text-gray-400 text-center mt-0.5">Modules done</Text>
                            </View>

                            {/* Badges earned */}
                            <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                                <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mb-2">
                                    <Trophy size={18} color="#F59E0B" />
                                </View>
                                <AnimatedNumber
                                    value={badgesEarned}
                                    format={(v) => String(Math.round(v))}
                                    className="text-2xl font-bold text-gray-900"
                                />
                                <Text className="text-xs text-gray-400 text-center mt-0.5">Badges earned</Text>
                            </View>

                            {/* Streak, with banked freezes shown underneath */}
                            <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                                <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mb-2">
                                    <Flame size={18} color="#F97316" />
                                </View>
                                <AnimatedNumber
                                    value={currentStreak}
                                    format={(v) => String(Math.round(v))}
                                    className="text-2xl font-bold text-gray-900"
                                />
                                <Text className="text-xs text-gray-400 text-center mt-0.5">Day streak</Text>
                                {freezes > 0 ? (
                                    <View className="flex-row items-center mt-1.5">
                                        {Array.from({ length: MAX_FREEZES }).map((_, i) => (
                                            <Snowflake
                                                key={i}
                                                size={10}
                                                color={i < freezes ? '#0EA5E9' : '#E5E7EB'}
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
                    <View className={`mx-4 mt-4 rounded-2xl border p-4 flex-row items-center ${freezes > 0 ? 'bg-sky-50 border-sky-100' : 'bg-orange-50 border-orange-100'}`}>
                        <View className="w-11 h-11 rounded-2xl bg-white items-center justify-center mr-3">
                            {freezes > 0
                                ? <Snowflake size={20} color="#0EA5E9" />
                                : <Flame size={20} color="#F97316" />}
                        </View>
                        <View className="flex-1">
                            <Text className={`text-base font-bold ${freezes > 0 ? 'text-sky-900' : 'text-orange-900'}`}>
                                {freezes > 0
                                    ? `${currentStreak}-day streak protected`
                                    : `${currentStreak}-day streak at risk`}
                            </Text>
                            <Text className={`text-xs mt-0.5 ${freezes > 0 ? 'text-sky-700' : 'text-orange-700'}`}>
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
                        className="mx-4 mt-4 bg-white rounded-2xl border border-indigo-100 p-4 flex-row items-center"
                        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                    >
                        <View className="w-11 h-11 rounded-2xl bg-indigo-50 items-center justify-center mr-3">
                            <BrainCircuit size={20} color="#6366F1" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900">
                                {dueCount} card{dueCount === 1 ? '' : 's'} due today
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                                {masteredCount} of {trackedCount} mastered. Cards you miss come back sooner.
                            </Text>
                        </View>
                        <ChevronRight size={18} color="#6366F1" />
                    </TouchableOpacity>
                ) : trackedCount > 0 ? (
                    <View className="mx-4 mt-4 bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex-row items-center">
                        <View className="w-11 h-11 rounded-2xl bg-white items-center justify-center mr-3">
                            <Trophy size={20} color="#10B981" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-emerald-900">All caught up</Text>
                            <Text className="text-xs text-emerald-700 mt-0.5">
                                {masteredCount} of {trackedCount} cards mastered. Check back tomorrow.
                            </Text>
                        </View>
                    </View>
                ) : null}




                {/* ── Practise ────────────────────────────────────
                    Three tools that teach by doing. They used to sit in a grid
                    of tiles on the Vitals screen, which is where you go to see
                    how the month is going, not to learn something. */}
                <Text className="mx-4 mt-6 mb-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Practise
                </Text>

                <TouchableOpacity
                    onPress={() => { haptics.tap(); navigation.navigate('GuessSpend'); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    className="mx-4 mt-2 bg-white rounded-2xl border border-gray-100 p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-2xl bg-rose-50 items-center justify-center mr-3">
                        <Target size={20} color="#F43F5E" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">Guess Your Spend</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            How closely do you actually know your own spending?
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#F43F5E" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => { haptics.tap(); navigation.navigate('SwipeCategorise'); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-2xl bg-sky-50 items-center justify-center mr-3">
                        <Layers size={20} color="#0EA5E9" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">Tidy Up</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            Sort miscategorised transactions and teach the app as you go
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#0EA5E9" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => { haptics.tap(); navigation.navigate('TimeMachine'); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-4 flex-row items-center"
                >
                    <View className="w-11 h-11 rounded-2xl bg-emerald-50 items-center justify-center mr-3">
                        <Hourglass size={20} color="#10B981" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900">Time Machine</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                            What a small regular spend is worth decades from now
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#10B981" />
                </TouchableOpacity>


                {/* ── Personalised Banner ─────────────────────── */}
                {profile?.appGoals && profile.appGoals.length > 0 && (
                    <View className="mx-4 mt-4 bg-indigo-600 rounded-2xl px-4 py-3.5 flex-row items-center">
                        <Sparkles size={18} color="white" />
                        <View className="flex-1 ml-3">
                            <Text className="text-white font-bold text-sm">Recommended for you</Text>
                            <Text className="text-indigo-200 text-xs mt-0.5">
                                Based on your onboarding goals
                            </Text>
                        </View>
                    </View>
                )}

                {/* ── Tab Switcher ────────────────────────────── */}
                <View className="flex-row mx-4 mt-4 bg-gray-100 rounded-xl p-1">
                    <TouchableOpacity
                        onPress={() => { haptics.select(); setActiveTab('paths'); }}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center ${activeTab === 'paths' ? 'bg-white' : ''}`}
                        style={activeTab === 'paths' ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } : {}}
                    >
                        <GraduationCap size={14} color={activeTab === 'paths' ? '#6366F1' : '#9CA3AF'} />
                        <Text style={{ color: activeTab === 'paths' ? '#6366F1' : '#9CA3AF' }} className="text-sm font-semibold ml-1.5">
                            Courses
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { haptics.select(); setActiveTab('glossary'); }}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center ${activeTab === 'glossary' ? 'bg-white' : ''}`}
                        style={activeTab === 'glossary' ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } : {}}
                    >
                        <HelpCircle size={14} color={activeTab === 'glossary' ? '#6366F1' : '#9CA3AF'} />
                        <Text style={{ color: activeTab === 'glossary' ? '#6366F1' : '#9CA3AF' }} className="text-sm font-semibold ml-1.5">
                            Glossary
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Courses Tab ─────────────────────────────── */}
                {activeTab === 'paths' && (
                    <View className="mx-4 mt-4">
                        {loading ? (
                            <>
                                <CourseCardSkeleton />
                                <CourseCardSkeleton />
                                <CourseCardSkeleton />
                            </>
                        ) : displayPaths.length === 0 ? (
                            <View className="bg-white border border-gray-100 rounded-2xl p-6 items-center">
                                <BookOpen size={32} color="#D1D5DB" />
                                <Text className="text-gray-500 text-sm mt-3 text-center">
                                    No courses found. Check your connection.
                                </Text>
                            </View>
                        ) : (
                            displayPaths.map((path) => {
                                const { completed, total } = getPathProgress(path.id);
                                const pBadge = progress[path.id ?? '']?.badgeEarned ?? false;
                                const pPct = total > 0 ? Math.round((completed / total) * 100) : 0;

                                return (
                                    <TouchableOpacity
                                        key={path.id}
                                        activeOpacity={0.85}
                                        onPress={() => { haptics.tap(); navigation.navigate('LearnPathDetail', { path }); }}
                                        className="mb-4 bg-white rounded-2xl border border-gray-100 overflow-hidden"
                                        style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                                    >
                                        {/* Top accent bar */}
                                        <View style={{ height: 3, backgroundColor: pBadge ? '#10B981' : pPct > 0 ? '#6366F1' : '#E5E7EB' }} />

                                        <View className="p-4">
                                            <View className="flex-row items-start justify-between mb-2">
                                                <View className="flex-1 mr-3">
                                                    <Text className="text-base font-bold text-gray-900">{path.title}</Text>
                                                    <Text className="text-xs text-gray-500 mt-0.5 leading-4">{path.description}</Text>
                                                </View>
                                                {pBadge && (
                                                    <View className="bg-emerald-50 rounded-full p-1.5">
                                                        <Trophy size={14} color="#10B981" />
                                                    </View>
                                                )}
                                            </View>

                                            {/* Module count + progress */}
                                            <View className="flex-row items-center justify-between mt-2 mb-3">
                                                <Text className="text-xs text-gray-400">{total} modules · {path.modules?.reduce((sum: number, m: any) => {
                                                    const mins = parseInt(m.duration) || 0;
                                                    return sum + mins;
                                                }, 0)} min total</Text>
                                                <Text className="text-xs font-semibold" style={{ color: pPct === 100 ? '#10B981' : '#6366F1' }}>
                                                    {completed}/{total} done
                                                </Text>
                                            </View>

                                            {/* Progress bar */}
                                            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                                                <View
                                                    style={{
                                                        width: `${pPct}%`,
                                                        backgroundColor: pPct === 100 ? '#10B981' : '#6366F1',
                                                    }}
                                                    className="h-full rounded-full"
                                                />
                                            </View>

                                            {/* CTA */}
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-xs text-gray-400">
                                                    {pPct === 0 ? 'Not started' : pPct === 100 ? 'Completed' : `${pPct}% complete`}
                                                </Text>
                                                <View className="flex-row items-center">
                                                    <Text className="text-xs font-semibold text-indigo-600 mr-1">
                                                        {pPct === 0 ? 'Start' : pPct === 100 ? 'Review' : 'Continue'}
                                                    </Text>
                                                    <ChevronRight size={14} color="#6366F1" />
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                )}

                {/* ── Glossary Tab ────────────────────────────── */}
                {activeTab === 'glossary' && (
                    <View className="mx-4 mt-4">
                        {/* Search */}
                        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 mb-4">
                            <Search size={16} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 py-3 pl-2 text-sm text-gray-700"
                                placeholder="Search terms…"
                                placeholderTextColor="#D1D5DB"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {filteredGlossary.length === 0 ? (
                            <View className="bg-white border border-gray-100 rounded-2xl p-6 items-center">
                                <HelpCircle size={28} color="#D1D5DB" />
                                <Text className="text-gray-400 text-sm mt-2">No terms match "{searchQuery}"</Text>
                            </View>
                        ) : (
                            filteredGlossary.map((term, idx) => (
                                <View
                                    key={term.term + idx}
                                    className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 mb-3"
                                >
                                    <Text className="text-sm font-bold text-indigo-600 mb-1">{term.term}</Text>
                                    <Text className="text-sm text-gray-600 leading-5">{term.definition}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
