/**
 * EmptyState
 *
 * What a screen shows before it has anything to show.
 *
 * Feed and Vitals both used to render their full layout against no data: a
 * score of 400 computed from nothing, zeroed vitals, an empty insight carousel
 * and a bare "No recent transactions". A first-time user was left looking at a
 * dashboard of noughts with nothing telling them what to do about it.
 *
 * The shape follows the goals list, which already did this properly: one icon,
 * one sentence naming what is missing, one sentence on why it is worth doing,
 * and a single button.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
    /** An extra line under the button, for a shortcut worth knowing about. */
    hint?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    body,
    actionLabel,
    onAction,
    hint,
}) => (
    <View className="items-center py-14 px-8">
        <View className="w-20 h-20 rounded-full bg-brand-primary/10 items-center justify-center mb-4">
            {icon}
        </View>

        <Text className="text-xl font-bold text-text-primary mb-2 text-center">
            {title}
        </Text>

        <Text className="text-sm text-text-secondary text-center leading-5 mb-6">
            {body}
        </Text>

        {actionLabel && onAction && (
            <TouchableOpacity
                className="bg-brand-primary px-8 py-3 rounded-2xl"
                onPress={onAction}
                activeOpacity={0.85}
                accessibilityRole="button"
            >
                <Text className="text-white font-bold">{actionLabel}</Text>
            </TouchableOpacity>
        )}

        {hint && (
            <Text className="text-xs text-text-tertiary text-center leading-4 mt-4">
                {hint}
            </Text>
        )}
    </View>
);

export default EmptyState;
