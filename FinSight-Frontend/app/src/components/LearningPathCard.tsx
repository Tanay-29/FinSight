import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
                <Text className="text-lg mr-2">📚</Text>
                <Text className="text-lg font-semibold text-text-primary flex-1">
                    {path.title}
                </Text>
                {path.badgeEarned && <Text className="text-xl">🏆</Text>}
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
            <View className="flex-row items-center justify-between">
                <Text className="text-sm text-text-secondary">
                    {isComplete ? '✅' : '📖'} {progressPercentage}% Complete
                    {!isComplete && ` • Next: ${path.nextModule}`}
                </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
                className={`mt-3 rounded-lg py-2 items-center ${isComplete ? 'bg-profit' : 'bg-brand-primary'
                    }`}
            >
                <Text className="text-white font-semibold text-sm">
                    {isComplete ? 'Review Again →' : 'Continue Learning →'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};
