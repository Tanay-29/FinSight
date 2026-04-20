import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bot, Sparkles, Lightbulb, Lock } from 'lucide-react-native';

interface EITMCardProps {
    insight: {
        title: string;
        text: string;
    };
}

export const EITMCard: React.FC<EITMCardProps> = ({ insight }) => {
    const [expanded, setExpanded] = useState(false);

    if (!insight) return null;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setExpanded(!expanded)}
            className="w-80 rounded-2xl p-4 bg-ai-bg border border-brand-primary/30 relative overflow-hidden mr-4 mt-4"
            accessible
            accessibilityLabel={`AI-generated insight: ${insight.title}`}
            accessibilityRole="button"
            accessibilityHint={expanded ? 'Tap to collapse' : 'Tap to expand and read more'}
        >
            {/* AI Badge */}
            <View className="absolute top-2 right-2 bg-brand-primary rounded-lg px-2 py-1 z-10 flex-row items-center">
                <Sparkles size={10} color="white" />
                <Text className="text-white text-[10px] font-semibold ml-1">AI</Text>
            </View>

            {/* Header */}
            <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-full bg-brand-primary/10 items-center justify-center mr-2">
                    <Bot size={18} color="#6366F1" />
                </View>
                <Text className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                    Explain It To Me
                </Text>
            </View>

            {/* Headline */}
            <Text className="text-xl font-semibold text-text-primary mb-3 pr-12">
                {insight.title}
            </Text>

            {!expanded ? (
                <Text className="text-sm text-brand-primary font-medium">
                    Tap to learn more →
                </Text>
            ) : (
                <View>
                    {/* Explanation */}
                    <Text className="text-base leading-7 text-text-secondary mb-4">
                        {insight.text}
                    </Text>

                    {/* Impact Box */}
                    <View className="bg-profit-bg border-l-4 border-profit rounded-lg p-3 mb-4 flex-row items-start">
                        <Lightbulb size={14} color="#10B981" style={{ marginTop: 2, marginRight: 6 }} />
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-text-secondary mb-1">
                                Why this matters to you:
                            </Text>
                            <Text className="text-base font-semibold text-text-primary">
                                Understanding this trend helps you make smarter long-term investment choices.
                            </Text>
                        </View>
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
                    <View className="flex-row items-center justify-center mt-3">
                        <Lock size={10} color="#9CA3AF" />
                        <Text className="text-xs text-text-tertiary ml-1">
                            Your data stays private. We analyze markets, not your identity.
                        </Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};