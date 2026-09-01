import React from 'react';
import { View, Text } from 'react-native';
import { BarFill } from './BarFill';

interface BudgetBarProps {
    category: string;
    icon: React.ReactNode;   // Changed: accepts a Lucide <Icon /> element
    spent: number;
    limit: number;
}

export const BudgetBar: React.FC<BudgetBarProps> = ({
    category,
    icon,
    spent,
    limit,
}) => {
    const percentage = (spent / limit) * 100;
    const isSafe = percentage < 80;
    const isWarning = percentage >= 80 && percentage < 100;

    const barColor = isSafe
        ? 'bg-profit'
        : isWarning
            ? 'bg-alert-amber'
            : 'bg-alert-critical';

    const statusLabel = isSafe ? 'On Track' : isWarning ? 'Warning' : 'Over Budget';
    const statusColor = isSafe
        ? 'text-profit'
        : isWarning
            ? 'text-alert-amber'
            : 'text-alert-critical';

    return (
        <View className="mb-4">
            <View className="flex-row items-center mb-1">
                <View className="w-7 h-7 rounded-lg bg-surface-secondary items-center justify-center mr-2">
                    {icon}
                </View>
                <Text className="text-sm font-semibold text-text-primary flex-1">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                <Text className={`text-xs font-semibold ${statusColor}`}>
                    {statusLabel}
                </Text>
            </View>

            <View className="flex-row justify-between mb-1">
                <Text
                    className="text-sm text-text-secondary"
                    style={{ fontVariant: ['tabular-nums'] }}
                >
                    ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                </Text>
                <Text
                    className="text-xs text-text-tertiary"
                    style={{ fontVariant: ['tabular-nums'] }}
                >
                    {Math.round(percentage)}%
                </Text>
            </View>

            <BarFill percent={Math.min(percentage, 100)} fillClassName={barColor} />
        </View>
    );
};
