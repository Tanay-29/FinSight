import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react-native';
import { LearningPath, Module } from '../data/mockData';

type Props = NativeStackScreenProps<any, 'LearnPathDetail'>;

export const LearnPathDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const path = route.params?.path as LearningPath;
    const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

    if (!path) {
        return (
            <SafeAreaView className="flex-1 bg-surface-secondary">
                <View className="flex-1 items-center justify-center">
                    <Text className="text-text-secondary">Learning path not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const progressPercentage = Math.round(
        (path.progress.completed / path.progress.total) * 100
    );

    const toggleModule = (moduleId: string) => {
        setExpandedModuleId(expandedModuleId === moduleId ? null : moduleId);
    };

    const getDifficultyColor = (difficulty: string) => {
        if (difficulty === 'beginner') return 'bg-profit-bg';
        if (difficulty === 'intermediate') return 'bg-alert-bg';
        return 'bg-loss-bg';
    };

    const getDifficultyTextColor = (difficulty: string) => {
        if (difficulty === 'beginner') return 'text-profit';
        if (difficulty === 'intermediate') return 'text-alert-amber';
        return 'text-loss';
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color="#1F2937" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-text-primary ml-3 flex-1">
                    {path.title}
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Overview Card */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <Text className="text-lg font-bold text-text-primary mb-2">
                        📖 Course Overview
                    </Text>
                    <Text className="text-sm text-text-secondary leading-5 mb-4">
                        {path.overview}
                    </Text>

                    {/* Progress */}
                    <View className="mb-3">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-sm font-semibold text-text-primary">
                                Your Progress
                            </Text>
                            <Text className="text-xs text-text-tertiary">
                                {path.progress.completed}/{path.progress.total} modules
                            </Text>
                        </View>
                        <View className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                            <View
                                className="h-full bg-brand-primary rounded-full"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </View>
                        <Text className="text-xs text-text-tertiary mt-1">
                            {progressPercentage}% Complete
                        </Text>
                    </View>

                    {/* Badge */}
                    {path.badgeEarned && (
                        <View className="bg-profit-bg rounded-lg px-3 py-2 items-center">
                            <Text className="text-base mr-2">🏆</Text>
                            <Text className="text-sm font-semibold text-profit">
                                Course Completed!
                            </Text>
                        </View>
                    )}
                </View>

                {/* Modules List */}
                <View className="mx-4 mt-5">
                    <Text className="text-lg font-bold text-text-primary mb-3">
                        📚 Modules ({path.progress.total})
                    </Text>

                    {(path.modules && path.modules.length > 0) ? path.modules.map((module, index) => (
                        <View
                            key={module.id}
                            className="mb-3 bg-white border border-border rounded-xl overflow-hidden"
                        >
                            {/* Module Header */}
                            <TouchableOpacity
                                className="flex-row items-center justify-between p-4 active:opacity-75"
                                onPress={() => toggleModule(module.id)}
                                accessible
                                accessibilityLabel={`Module ${index + 1}: ${module.title}`}
                                accessibilityRole="button"
                            >
                                <View className="flex-1 flex-row items-center">
                                    {/* Completion Status */}
                                    <View className="w-6 h-6 rounded-full border-2 border-brand-primary items-center justify-center mr-3">
                                        {module.completed && (
                                            <Text className="text-brand-primary font-bold">✓</Text>
                                        )}
                                    </View>

                                    {/* Module Info */}
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-sm font-semibold text-text-primary">
                                                {String(index + 1).padStart(2, '0')}. {module.title}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-xs text-text-tertiary">
                                                ⏱️ {module.duration}
                                            </Text>
                                            <View
                                                className={`px-2 py-0.5 rounded ${getDifficultyColor(
                                                    module.difficulty
                                                )}`}
                                            >
                                                <Text
                                                    className={`text-[10px] font-semibold ${getDifficultyTextColor(
                                                        module.difficulty
                                                    )}`}
                                                >
                                                    {module.difficulty.charAt(0).toUpperCase() +
                                                        module.difficulty.slice(1)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Expand/Collapse Icon */}
                                {expandedModuleId === module.id ? (
                                    <ChevronUp color="#6366F1" size={20} />
                                ) : (
                                    <ChevronDown color="#6B7280" size={20} />
                                )}
                            </TouchableOpacity>

                            {/* Module Content (Expanded) */}
                            {expandedModuleId === module.id && (
                                <View className="border-t border-border px-4 py-3 bg-surface-secondary">
                                    {/* Description */}
                                    <Text className="text-sm font-semibold text-text-primary mb-2">
                                        {module.description}
                                    </Text>

                                    {/* Content */}
                                    <Text className="text-sm text-text-secondary leading-5 mb-4">
                                        {module.content}
                                    </Text>

                                    {/* Key Points */}
                                    <View className="mb-4">
                                        <Text className="text-sm font-semibold text-text-primary mb-2">
                                            Key Points:
                                        </Text>
                                        {module.keyPoints.map((point, idx) => (
                                            <View key={idx} className="flex-row mb-2">
                                                <Text className="text-text-secondary mr-2">•</Text>
                                                <Text className="text-sm text-text-secondary flex-1">
                                                    {point}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* CTA Button */}
                                    <TouchableOpacity
                                        className={`py-2 rounded-lg items-center ${
                                            module.completed
                                                ? 'bg-profit'
                                                : 'bg-brand-primary'
                                        }`}
                                    >
                                        <Text className="text-white font-semibold text-sm">
                                            {module.completed
                                                ? '✓ Completed'
                                                : 'Mark as Complete'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )) : (
                        <View className="bg-white border border-border rounded-xl p-4 items-center">
                            <Text className="text-text-secondary text-sm">📚 Loading modules...</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
