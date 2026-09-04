/**
 * LearnPathDetailScreen
 *
 * Shows course overview, real progress (from Redux), and module list.
 * Tapping any module opens ModuleReaderScreen (reading + quiz + completion flow).
 * Progress is read from state.learning.progress[pathId].completedModules - no mock data.
 */
import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReAnimated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { BarFill } from '../components/BarFill';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, BookOpen, Layers, Clock, Check, Trophy,
    ChevronRight, Lock, Play,
} from 'lucide-react-native';
import { LearningPath } from '../data/courseContent';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchUserProgress } from '../store/slices/learningSlice';
import { COLORS } from '../theme/tokens';

type Props = NativeStackScreenProps<any, 'LearnPathDetail'>;

export const LearnPathDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const reduced = useReducedMotion();
    const dispatch = useAppDispatch();
    const { progress } = useAppSelector((s) => s.learning);
    const { user } = useAppSelector((s) => s.auth);

    const path = route.params?.path as LearningPath;

    // Refresh progress when screen mounts
    useEffect(() => {
        if (user?.uid) {
            dispatch(fetchUserProgress(user.uid));
        }
    }, [user?.uid]);

    if (!path) {
        return (
            <SafeAreaView className="flex-1 bg-surface-secondary items-center justify-center">
                <Text className="text-text-secondary">Learning path not found.</Text>
            </SafeAreaView>
        );
    }

    const pathId = path.id ?? '';
    const pathProgress = progress[pathId];
    const completedModules: string[] = pathProgress?.completedModules ?? [];
    const completedCount = completedModules.length;
    const totalCount = path.modules?.length ?? 0;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const badgeEarned = pathProgress?.badgeEarned ?? false;

    const getDifficultyColor = (d: string) => {
        if (d === 'beginner') return { bg: COLORS.semantic.profitBg, text: '#0B6A4D' };
        if (d === 'intermediate') return { bg: COLORS.semantic.alertBg, text: COLORS.semantic.alertAmber };
        return { bg: COLORS.semantic.lossBg, text: COLORS.semantic.alertCritical };
    };

    const openModule = (module: any, index: number) => {
        navigation.navigate('ModuleReader', { module, path });
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border bg-surface-primary">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-9 h-9 items-center justify-center rounded-full bg-surface-tertiary mr-3"
                    activeOpacity={0.7}
                >
                    <ArrowLeft color="#423C35" size={18} />
                </TouchableOpacity>
                <Text numberOfLines={1} className="text-lg font-inter-bold text-text-primary flex-1">
                    {path.title}
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Overview Card */}
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-2xl p-5">
                    <View className="flex-row items-center mb-2">
                        <BookOpen size={16} color={COLORS.brand.primary} />
                        <Text className="text-base font-inter-bold text-text-primary ml-2">Course overview</Text>
                    </View>
                    <Text className="text-sm text-text-secondary leading-6 mb-4 font-inter">{path.overview}</Text>

                    {/* Progress */}
                    <View className="mb-4">
                        <View className="flex-row justify-between items-center mb-1.5">
                            <Text className="text-sm font-inter-semibold text-text-secondary">Your progress</Text>
                            <Text className="text-xs text-text-tertiary font-inter">
                                {completedCount}/{totalCount} modules
                            </Text>
                        </View>
                        <BarFill percent={progressPct} trackClassName="bg-surface-tertiary" fillClassName="bg-brand-primary" />
                    </View>

                    {/* Badge earned */}
                    {badgeEarned && (
                        <View className="bg-profit-bg border border-profit-bg rounded-xl px-4 py-3 flex-row items-center">
                            <Trophy size={16} color={COLORS.semantic.profit} />
                            <Text className="text-sm font-inter-semibold text-profit ml-2">
                                Course badge earned!
                            </Text>
                        </View>
                    )}

                    {/* Stats row */}
                    <View className="flex-row mt-4 gap-3">
                        <View className="flex-1 bg-brand-soft rounded-xl p-3 items-center">
                            <Text className="text-lg font-inter-bold text-brand-link">{totalCount}</Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">Modules</Text>
                        </View>
                        <View className="flex-1 bg-alert-bg rounded-xl p-3 items-center">
                            <Text className="text-lg font-inter-bold text-alert-amber">{completedCount}</Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">Completed</Text>
                        </View>
                        <View className="flex-1 bg-profit-bg rounded-xl p-3 items-center">
                            <Text className="text-lg font-inter-bold text-profit">{progressPct}%</Text>
                            <Text className="text-xs text-text-secondary mt-0.5 font-inter">Done</Text>
                        </View>
                    </View>
                </View>

                {/* Module list */}
                <View className="mx-5 mt-5">
                    <View className="flex-row items-center mb-3">
                        <Layers size={16} color="#423C35" />
                        <Text className="text-base font-inter-bold text-text-primary ml-2">
                            Modules ({totalCount})
                        </Text>
                    </View>

                    {(path.modules && path.modules.length > 0) ? path.modules.map((module, index) => {
                        const isComplete = completedModules.includes(module.id);
                        const isCurrent = !isComplete && completedModules.length === index;
                        // A path is a sequence, so everything past the one you
                        // are on is shut. Without this the list read as a menu
                        // and a beginner could open module five first.
                        const isLocked = !isComplete && !isCurrent;
                        const diff = getDifficultyColor(module.difficulty);

                        return (
                            <ReAnimated.View
                                key={module.id}
                                entering={
                                    reduced
                                        ? FadeIn.duration(160)
                                        : FadeInDown.duration(240).delay(index * 45)
                                }
                            >
                            <TouchableOpacity
                                onPress={() => { if (!isLocked) openModule(module, index); }}
                                disabled={isLocked}
                                activeOpacity={0.8}
                                style={{
                                    borderWidth: isCurrent ? 2 : 1,
                                    borderColor: isCurrent ? COLORS.brand.primary : COLORS.surface.tertiary,
                                    backgroundColor: isComplete ? COLORS.surface.secondary : '#FFFFFF',
                                    opacity: isLocked ? 0.55 : 1,
                                }}
                                className="mb-3 rounded-2xl overflow-hidden"
                                accessible
                                accessibilityLabel={
                                    isLocked
                                        ? `Module ${index + 1}, ${module.title}. Locked. Finish the module before it to open this.`
                                        : `Module ${index + 1}: ${module.title}`
                                }
                                accessibilityRole="button"
                                accessibilityState={{ disabled: isLocked }}
                            >
                                <View className="flex-row items-center p-4">
                                    {/* Status dot */}
                                    <View
                                        style={{
                                            width: 32, height: 32, borderRadius: 16,
                                            backgroundColor: isComplete ? COLORS.brand.primary : isCurrent ? COLORS.brand.soft : COLORS.surface.tertiary,
                                            borderWidth: isComplete ? 0 : 2,
                                            borderColor: isCurrent ? COLORS.brand.primary : COLORS.border.default,
                                            alignItems: 'center', justifyContent: 'center',
                                            marginRight: 12,
                                        }}
                                    >
                                        {isComplete ? (
                                            <Check size={14} color="white" strokeWidth={3} />
                                        ) : isLocked ? (
                                            <Lock size={13} color={COLORS.text.tertiary} />
                                        ) : (
                                            <Text className="text-xs font-inter-bold" style={{ color: isCurrent ? COLORS.brand.primary : COLORS.text.tertiary }}>
                                                {String(index + 1).padStart(2, '0')}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Info */}
                                    <View className="flex-1">
                                        <Text
                                            className="text-sm font-inter-semibold mb-1"
                                            style={{ color: isComplete ? COLORS.text.secondary : COLORS.text.primary }}
                                        >
                                            {module.title}
                                        </Text>
                                        <View className="flex-row items-center gap-2">
                                            <Clock size={11} color={COLORS.text.tertiary} />
                                            <Text className="text-xs text-text-tertiary font-inter">{module.duration}</Text>
                                            <View style={{ backgroundColor: diff.bg }} className="px-1.5 py-0.5 rounded-full">
                                                <Text style={{ color: diff.text }} className="text-[10px] font-inter-semibold">
                                                    {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
                                                </Text>
                                            </View>
                                            {module.quiz?.length && (
                                                <View className="px-1.5 py-0.5 rounded-full bg-brand-soft">
                                                    <Text className="text-[10px] font-inter-semibold text-brand-link">
                                                        {module.quiz.length} Qs
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Arrow */}
                                    <ChevronRight size={16} color={isCurrent ? COLORS.brand.primary : COLORS.border.strong} />
                                </View>

                                {/* "Next up" banner */}
                                {isCurrent && (
                                    <View className="bg-brand-primary-dark px-4 py-1.5 flex-row items-center justify-center">
                                        <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
                                        <Text className="text-white text-xs font-inter-semibold ml-1.5">Continue here</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            </ReAnimated.View>
                        );
                    }) : (
                        <View className="bg-surface-primary border border-border rounded-2xl p-5 items-center">
                            <BookOpen size={24} color={COLORS.border.strong} />
                            <Text className="text-sm text-text-tertiary mt-2 font-inter">No modules found</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
