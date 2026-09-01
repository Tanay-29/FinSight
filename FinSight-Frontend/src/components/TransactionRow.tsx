import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
    Utensils, ShoppingBag, Car, ShoppingCart, Zap, Film,
    TrendingUp, Heart, BookOpen, Home, Package, DollarSign,
    RefreshCw,
} from 'lucide-react-native';
import { COLORS } from '../theme/tokens';
import { format } from 'date-fns';
import { normaliseCategory, categoryLabel, incomeLabel, isIncomeSource } from '../utils/categories';

interface TransactionRowProps {
    category: string;
    merchant: string;
    amount: number;
    type: 'debit' | 'credit';
    date: string;
    source: 'auto' | 'manual';
    onPress?: () => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
    dining: Utensils,
    shopping: ShoppingBag,
    transport: Car,
    groceries: ShoppingCart,
    utilities: Zap,
    entertainment: Film,
    investments: TrendingUp,
    health: Heart,
    healthcare: Heart,
    education: BookOpen,
    housing: Home,
    rent: Home,
    miscellaneous: Package,
};

export const TransactionRow: React.FC<TransactionRowProps> = ({
    category,
    merchant,
    amount,
    type,
    date,
    source,
    onPress,
}) => {
    const isDebit = type === 'debit';
    // Income is filed against a source, which no spending icon describes.
    const key = normaliseCategory(category);
    const IconComponent = isDebit ? (CATEGORY_ICON_MAP[key] || DollarSign) : DollarSign;
    const label = isDebit || !isIncomeSource(category)
        ? categoryLabel(category)
        : incomeLabel(category);
    const formattedAmount = `${isDebit ? '-' : '+'}₹${amount.toLocaleString('en-IN')}`;
    const formattedTime = format(new Date(date), 'h:mm a');

    return (
        // A full-bleed row that shrinks under the finger looks like it is
        // detaching from the list, so press is marked by the row's own
        // background instead. Same confirmation, no movement.
        <Pressable
            className="flex-row items-center px-4 py-3 border-b border-border"
            style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.surface.secondary : '#FFFFFF',
            })}
            onPress={onPress}
            disabled={!onPress}
            pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessible
            accessibilityLabel={`${merchant}, ${formattedAmount}, ${category}`}
            accessibilityRole="button"
        >
            <View className="w-10 h-10 rounded-lg bg-surface-secondary items-center justify-center mr-3">
                <IconComponent size={18} color={COLORS.text.secondary} />
            </View>

            <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">{merchant}</Text>
                <View className="flex-row items-center">
                    <Text className="text-xs text-text-tertiary">
                        {label} • {formattedTime}
                    </Text>
                    {source === 'auto' && (
                        <View className="ml-1.5">
                            <RefreshCw size={10} color={COLORS.text.tertiary} />
                        </View>
                    )}
                </View>
            </View>

            <Text
                className={`text-base font-bold ${isDebit ? 'text-loss' : 'text-profit'}`}
                style={{ fontVariant: ['tabular-nums'] }}
            >
                {formattedAmount}
            </Text>
        </Pressable>
    );
};
