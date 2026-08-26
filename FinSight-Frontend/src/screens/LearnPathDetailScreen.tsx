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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
    ArrowLeft, BookOpen, Layers, Clock, Check, Trophy,
    ChevronRight, Lock, Play,
} from 'lucide-react-native';
import { LearningPath } from '../data/courseContent';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchUserProgress } from '../store/slices/learningSlice';

type Props = NativeStackScreenProps<any, 'LearnPathDetail'>;

export const LearnPathDetailScreen: React.FC<Props> = ({ route, navigation }) => {
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
            <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
                <Text className="text-gray-500">Learning path not found.</Text>
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
        if (d === 'beginner') return { bg: '#D1FAE5', text: '#059669' };
        if (d === 'intermediate') return { bg: '#FEF3C7', text: '#D97706' };
        return { bg: '#FEE2E2', text: '#DC2626' };
    };

    const openModule = (module: any, index: number) => {
        navigation.navigate('ModuleReader', { module, path });
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-9 h-9 items-center justify-center rounded-full bg-gray-100 mr-3"
                    activeOpacity={0.7}
                >
                    <ArrowLeft color="#374151" size={18} />
                </TouchableOpacity>
                <Text numberOfLines={1} className="text-lg font-bold text-gray-900 flex-1">
                    {path.title}
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Overview Card */}
                <View className="mx-4 mt-4 bg-white border border-gray-100 rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                    <View className="flex-row items-center mb-2">
                        <BookOpen size={16} color="#6366F1" />
                        <Text className="text-base font-bold text-gray-900 ml-2">Course Overview</Text>
                    </View>
                    <Text className="text-sm text-gray-500 leading-6 mb-4">{path.overview}</Text>

                    {/* Progress */}
                    <View className="mb-4">
                        <View className="flex-row justify-between items-center mb-1.5">
                            <Text className="text-sm font-semibold text-gray-700">Your Progress</Text>
                            <Text className="text-xs text-gray-400">
                                {completedCount}/{totalCount} modules
                            </Text>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${progressPct}%` }}
                            />
                        </View>
                        <Text className="text-xs text-gray-400 mt-1">{progressPct}% complete</Text>
                    </View>

                    {/* Badge earned */}
                    {badgeEarned && (
                        <View className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex-row items-center">
                            <Trophy size={16} color="#10B981" />
                            <Text className="text-sm font-semibold text-emerald-600 ml-2">
                                Course badge earned!
                            </Text>
                        </View>
                    )}

                    {/* Stats row */}
                    <View className="flex-row mt-4 gap-3">
                        <View className="flex-1 bg-indigo-50 rounded-xl p-3 items-center">
                            <Text className="text-lg font-bold text-indigo-600">{totalCount}</Text>
                            <Text className="text-xs text-gray-500 mt-0.5">Modules</Text>
                        </View>
                        <View className="flex-1 bg-amber-50 rounded-xl p-3 items-center">
                            <Text className="text-lg font-bold text-amber-600">{completedCount}</Text>
                            <Text className="text-xs text-gray-500 mt-0.5">Completed</Text>
                        </View>
                        <View className="flex-1 bg-emerald-50 rounded-xl p-3 items-center">
                            <Text className="text-lg font-bold text-emerald-600">{progressPct}%</Text>
                            <Text className="text-xs text-gray-500 mt-0.5">Done</Text>
                        </View>
                    </View>
                </View>

                {/* Module list */}
                <View className="mx-4 mt-5">
                    <View className="flex-row items-center mb-3">
                        <Layers size={16} color="#374151" />
                        <Text className="text-base font-bold text-gray-900 ml-2">
                            Modules ({totalCount})
                        </Text>
                    </View>

                    {(path.modules && path.modules.length > 0) ? path.modules.map((module, index) => {
                        const isComplete = completedModules.includes(module.id);
                        const isCurrent = !isComplete && completedModules.length === index;
                        const diff = getDifficultyColor(module.difficulty);

                        return (
                            <TouchableOpacity
                                key={module.id}
                                onPress={() => openModule(module, index)}
                                activeOpacity={0.8}
                                style={{
                                    borderWidth: isCurrent ? 2 : 1,
                                    borderColor: isCurrent ? '#6366F1' : '#F3F4F6',
                                    backgroundColor: isComplete ? '#F9FAFB' : '#FFFFFF',
                                }}
                                className="mb-3 rounded-2xl overflow-hidden"
                                accessible
                                accessibilityLabel={`Module ${index + 1}: ${module.title}`}
                                accessibilityRole="button"
                            >
                                <View className="flex-row items-center p-4">
                                    {/* Status dot */}
                                    <View
                                        style={{
                                            width: 32, height: 32, borderRadius: 16,
                                            backgroundColor: isComplete ? '#6366F1' : isCurrent ? '#EEF2FF' : '#F3F4F6',
                                            borderWidth: isComplete ? 0 : 2,
                                            borderColor: isCurrent ? '#6366F1' : '#E5E7EB',
                                            alignItems: 'center', justifyContent: 'center',
                                            marginRight: 12,
                                        }}
                                    >
                                        {isComplete ? (
                                            <Check size={14} color="white" strokeWidth={3} />
                                        ) : (
                                            <Text className="text-xs font-bold" style={{ color: isCurrent ? '#6366F1' : '#9CA3AF' }}>
                                                {String(index + 1).padStart(2, '0')}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Info */}
                                    <View className="flex-1">
                                        <Text
                                            className="text-sm font-semibold mb-1"
                                            style={{ color: isComplete ? '#6B7280' : '#1F2937' }}
                                        >
                                            {module.title}
                                        </Text>
                                        <View className="flex-row items-center gap-2">
                                            <Clock size={11} color="#9CA3AF" />
                                            <Text className="text-xs text-gray-400">{module.duration}</Text>
                                            <View style={{ backgroundColor: diff.bg }} className="px-1.5 py-0.5 rounded-full">
                                                <Text style={{ color: diff.text }} className="text-[10px] font-semibold">
                                                    {module.difficulty.charAt(0).toUpperCase() + module.difficulty.slice(1)}
                                                </Text>
                                            </View>
                                            {module.quiz?.length && (
                                                <View className="px-1.5 py-0.5 rounded-full bg-indigo-50">
                                                    <Text className="text-[10px] font-semibold text-indigo-500">
                                                        {module.quiz.length} Qs
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Arrow */}
                                    <ChevronRight size={16} color={isCurrent ? '#6366F1' : '#D1D5DB'} />
                                </View>

                                {/* "Next up" banner */}
                                {isCurrent && (
                                    <View className="bg-indigo-600 px-4 py-1.5 flex-row items-center justify-center">
                                        <Play size={11} color="#FFFFFF" fill="#FFFFFF" />
                                        <Text className="text-white text-xs font-semibold ml-1.5">Continue here</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }) : (
                        <View className="bg-white border border-gray-100 rounded-2xl p-5 items-center">
                            <BookOpen size={24} color="#D1D5DB" />
                            <Text className="text-sm text-gray-400 mt-2">No modules found</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
