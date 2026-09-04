import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
    Utensils, ShoppingBag, Car, ShoppingCart, Zap, Film,
    TrendingUp, Heart, BookOpen, Home, Package, DollarSign,
} from 'lucide-react-native';
import { COLORS, CATEGORY_COLORS, categoryTint, TYPE, RADIUS } from '../theme/tokens';
import { format } from 'date-fns';
import type { Category } from '../utils/categories';
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

// Keyed on the canonical union only. Legacy spellings never reach this map,
// because normaliseCategory resolves them on the way in.
const CATEGORY_ICON_MAP: Record<Category, React.ComponentType<any>> = {
    dining: Utensils,
    groceries: ShoppingCart,
    transport: Car,
    shopping: ShoppingBag,
    utilities: Zap,
    housing: Home,
    healthcare: Heart,
    education: BookOpen,
    entertainment: Film,
    investments: TrendingUp,
    other: Package,
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
    const IconComponent = isDebit ? CATEGORY_ICON_MAP[key] : DollarSign;
    const label = isDebit || !isIncomeSource(category)
        ? categoryLabel(category)
        : incomeLabel(category);

    // The tile carries the tint, the glyph carries the hue. Income sits
    // outside the category vocabulary, so it takes the positive green
    // instead: the seven sources answer a different question and there are
    // never enough on screen at once to need telling apart.
    const accent = isDebit ? CATEGORY_COLORS[key] : COLORS.semantic.profit;
    const tint = isDebit ? categoryTint(key) : COLORS.semantic.profitBg;

    const formattedAmount = `${isDebit ? '-' : '+'}₹${amount.toLocaleString('en-IN')}`;
    const formattedTime = format(new Date(date), 'h:mm a');

    return (
        // A full-bleed row that shrinks under the finger looks like it is
        // detaching from the list, so press is marked by the row's own
        // background instead. Same confirmation, no movement.
        <Pressable
            className="flex-row items-center px-5 py-3 border-b border-border"
            style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.surface.tertiary : COLORS.surface.primary,
            })}
            onPress={onPress}
            disabled={!onPress}
            pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessible
            accessibilityLabel={`${merchant}, ${formattedAmount}, ${label}`}
            accessibilityRole="button"
        >
            <View
                className="w-10 h-10 items-center justify-center mr-3"
                style={{ borderRadius: RADIUS.tile, backgroundColor: tint }}
            >
                <IconComponent size={19} color={accent} strokeWidth={1.8} />
            </View>

            <View className="flex-1">
                <Text style={TYPE.callout} className="text-text-primary">{merchant}</Text>
                <View className="flex-row items-center">
                    <Text style={TYPE.caption} className="text-text-tertiary">
                        {label} • {formattedTime}
                    </Text>
                    {source === 'auto' && (
                        // Was a 10px refresh glyph in the old tertiary grey,
                        // which read 2.5:1 and which nobody has ever noticed.
                        <View
                            className="ml-2 px-1.5 py-0.5 bg-surface-tertiary"
                            style={{ borderRadius: RADIUS.chip }}
                        >
                            <Text style={TYPE.micro} className="text-text-tertiary">Auto</Text>
                        </View>
                    )}
                </View>
            </View>

            <Text
                style={TYPE.amountSm}
                className={isDebit ? 'text-loss' : 'text-profit'}
            >
                {formattedAmount}
            </Text>
        </Pressable>
    );
};
