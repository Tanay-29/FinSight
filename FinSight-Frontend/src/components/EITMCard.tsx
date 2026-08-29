/**
 * EITMCard - one AI-written note about the market.
 *
 * This used to expand on tap. Three problems came with that. The cards sit in a
 * horizontal scroller, so an expanded card grew the row and left its collapsed
 * neighbours sitting above a block of empty space. The expanded half then
 * padded two real fields with a "why this matters to you" line that was
 * hardcoded and therefore identical under every insight whatever it said, a
 * "Learn More" button with no handler, and a privacy footer nobody asked for.
 *
 * So it does not expand. Title, four lines of the actual explanation, and the
 * badge that says a model wrote it. Every card is the same height, which is
 * what a horizontal row of cards needs to be.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';

interface EITMCardProps {
    insight: {
        title: string;
        text: string;
    };
}

export const EITMCard: React.FC<EITMCardProps> = ({ insight }) => {
    if (!insight) return null;

    return (
        <View
            className="w-80 mr-3 rounded-2xl p-4 bg-white border border-border"
            accessible
            accessibilityLabel={`Market insight: ${insight.title}. ${insight.text}`}
        >
            <View className="flex-row items-center mb-2.5">
                <Sparkles size={12} color="#6366F1" />
                <Text className="text-[10px] font-bold tracking-widest text-brand-primary uppercase ml-1.5">
                    AI insight
                </Text>
            </View>

            <Text className="text-base font-bold text-text-primary leading-6 mb-1.5">
                {insight.title}
            </Text>

            <Text
                className="text-sm leading-5 text-text-secondary"
                numberOfLines={4}
            >
                {insight.text}
            </Text>
        </View>
    );
};

export default EITMCard;
