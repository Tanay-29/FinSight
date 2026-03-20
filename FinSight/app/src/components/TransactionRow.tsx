import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS, CATEGORY_ICONS } from '../theme/tokens';
import { format } from 'date-fns';

interface TransactionRowProps {
    category: string;
    merchant: string;
    amount: number;
    type: 'debit' | 'credit';
    date: string;
    source: 'auto' | 'manual';
    onPress?: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
    category,
    merchant,
    amount,
    type,
    date,
    source,
    onPress,
}) => {
    const icon = CATEGORY_ICONS[category] || '📦';
    const isDebit = type === 'debit';
    const formattedAmount = `${isDebit ? '-' : '+'}₹${amount.toLocaleString('en-IN')}`;
    const formattedTime = format(new Date(date), 'h:mm a');

    return (
        <TouchableOpacity
            className="flex-row items-center px-4 py-3 bg-white border-b border-border"
            onPress={onPress}
            activeOpacity={0.7}
            accessible
            accessibilityLabel={`${merchant}, ${formattedAmount}, ${category}`}
            accessibilityRole="button"
        >
            <View className="w-10 h-10 rounded-lg bg-surface-secondary items-center justify-center mr-3">
                <Text className="text-xl">{icon}</Text>
            </View>

            <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">{merchant}</Text>
                <Text className="text-xs text-text-tertiary">
                    {category.charAt(0).toUpperCase() + category.slice(1)} • {formattedTime}
                    {source === 'auto' && ' • 🔄'}
                </Text>
            </View>

            <Text
                className={`text-base font-bold ${isDebit ? 'text-loss' : 'text-profit'}`}
                style={{ fontVariant: ['tabular-nums'] }}
            >
                {formattedAmount}
            </Text>
        </TouchableOpacity>
    );
};
