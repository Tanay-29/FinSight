import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BookOpen, Trophy, CheckCircle2 } from 'lucide-react-native';
import { LearningPath } from '../data/mockData';

interface LearningPathCardProps {
    path: LearningPath;
    onPress?: () => void;
}

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
    path,
    onPress,
}) => {
    const progressPercentage = Math.round(
        (path.progress.completed / path.progress.total) * 100
    );
    const isComplete = path.progress.completed === path.progress.total;

    return (
        <TouchableOpacity
            className="bg-white border border-border rounded-xl p-4 mx-4 mb-3"
            onPress={onPress}
            activeOpacity={0.8}
            accessible
            accessibilityLabel={`${path.title}, ${progressPercentage}% complete`}
        >
            {/* Title row */}
            <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-lg bg-brand-primary/10 items-center justify-center mr-2">
                    <BookOpen size={16} color="#6366F1" />
                </View>
                <Text className="text-lg font-semibold text-text-primary flex-1">
                    {path.title}
                </Text>
                {path.badgeEarned && (
                    <Trophy size={20} color="#F59E0B" />
                )}
            </View>

            {/* Description */}
            <Text className="text-sm text-text-secondary mb-3">{path.description}</Text>

            {/* Progress dots */}
            <View className="flex-row gap-2 mb-3">
                {Array.from({ length: path.progress.total }).map((_, i) => (
                    <View
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < path.progress.completed
                            ? 'bg-brand-primary'
                            : i === path.progress.completed
                                ? 'bg-brand-primary-light'
                                : 'bg-surface-tertiary'
                            }`}
                    />
                ))}
            </View>

            {/* Progress info */}
            <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center">
                    <CheckCircle2 size={13} color={isComplete ? '#10B981' : '#9CA3AF'} />
                    <Text className="text-sm text-text-secondary ml-1">
                        {progressPercentage}% Complete
                        {!isComplete && ` • Next: ${path.nextModule}`}
                    </Text>
                </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
                className={`mt-3 rounded-lg py-2 items-center ${isComplete ? 'bg-profit' : 'bg-brand-primary'}`}
            >
                <Text className="text-white font-semibold text-sm">
                    {isComplete ? 'Review Again →' : 'Continue Learning →'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};
