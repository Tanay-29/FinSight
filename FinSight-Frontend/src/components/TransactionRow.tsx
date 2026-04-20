import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
    Utensils, ShoppingBag, Car, ShoppingCart, Zap, Film,
    TrendingUp, Heart, BookOpen, Home, Package, DollarSign,
    RefreshCw,
} from 'lucide-react-native';
import { COLORS } from '../theme/tokens';
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
    const key = category.toLowerCase();
    const IconComponent = CATEGORY_ICON_MAP[key] || DollarSign;
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
                <IconComponent size={18} color={COLORS.text.secondary} />
            </View>

            <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">{merchant}</Text>
                <View className="flex-row items-center">
                    <Text className="text-xs text-text-tertiary">
                        {category.charAt(0).toUpperCase() + category.slice(1)} • {formattedTime}
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
        </TouchableOpacity>
    );
};
