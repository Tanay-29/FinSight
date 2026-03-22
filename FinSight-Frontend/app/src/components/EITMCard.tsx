import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// 1. We bring back the Props interface so the parent can pass data in
interface EITMCardProps {
    insight: {
        title: string;
        text: string;
    };
}

export const EITMCard: React.FC<EITMCardProps> = ({ insight }) => {
    const [expanded, setExpanded] = useState(false);

    // Hide completely if there's no data passed
    if (!insight) return null; 

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setExpanded(!expanded)}
            // Important UI fix: Changed 'flex-1' to 'w-80' and 'mr-4' so they stack side-by-side in a scroll view!
            className="w-80 rounded-2xl p-4 bg-ai-bg border border-brand-primary/30 relative overflow-hidden mr-4 mt-4"
            accessible
            accessibilityLabel={`AI-generated insight: ${insight.title}`}
            accessibilityRole="button"
            accessibilityHint={expanded ? 'Tap to collapse' : 'Tap to expand and read more'}
        >
            {/* AI Badge */}
            <View className="absolute top-2 right-2 bg-brand-primary rounded-lg px-2 py-1 z-10">
                <Text className="text-white text-[10px] font-semibold">✨ AI</Text>
            </View>

            {/* Header */}
            <View className="flex-row items-center mb-2">
                <Text className="text-lg mr-2">🤖</Text>
                <Text className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                    Explain It To Me
                </Text>
            </View>

            {/* Headline (Powered by Flask backend) */}
            <Text className="text-xl font-semibold text-text-primary mb-3 pr-12">
                {insight.title}
            </Text>

            {!expanded ? (
                <Text className="text-sm text-brand-primary font-medium">
                    Tap to learn more →
                </Text>
            ) : (
                <View>
                    {/* Explanation (Powered by Flask backend) */}
                    <Text className="text-base leading-7 text-text-secondary mb-4">
                        {insight.text}
                    </Text>

                    {/* Impact Box (Adapted for educational focus) */}
                    <View className="bg-profit-bg border-l-4 border-profit rounded-lg p-3 mb-4">
                        <Text className="text-sm font-medium text-text-secondary mb-1">
                            💡 Why this matters to you:
                        </Text>
                        <Text className="text-base font-semibold text-text-primary">
                            Understanding this trend helps you make smarter long-term investment choices.
                        </Text>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-3">
                        <TouchableOpacity className="bg-brand-primary rounded-lg px-4 py-2 flex-1 items-center">
                            <Text className="text-white font-semibold text-sm">Learn More</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-surface-tertiary rounded-lg px-4 py-2 flex-1 items-center"
                            onPress={() => setExpanded(false)}
                        >
                            <Text className="text-text-secondary font-semibold text-sm">Got It</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Privacy Footer */}
                    <Text className="text-xs text-text-tertiary mt-3 text-center">
                        🔒 Your data stays private. We analyze markets, not your personal identity.
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};