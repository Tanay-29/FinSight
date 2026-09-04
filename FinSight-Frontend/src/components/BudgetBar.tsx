import React from 'react';
import { View, Text } from 'react-native';
import { BarFill } from './BarFill';
import { categoryLabel, normaliseCategory } from '../utils/categories';
import { categoryTint, TYPE, RADIUS } from '../theme/tokens';

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

    // The bar keeps the bright amber, which is correct: a fill carries no
    // contrast requirement. The label does not, and was reading 2.1:1.
    const barColor = isSafe
        ? 'bg-profit'
        : isWarning
            ? 'bg-alert-amber-fill'
            : 'bg-loss';

    // "Over Budget" tells a student nothing the bar has not already said.
    // The amount does.
    const overBy = Math.round(spent - limit);
    const statusLabel = isSafe
        ? 'On track'
        : isWarning
            ? 'Getting close'
            : `Over by ₹${overBy.toLocaleString('en-IN')}`;
    const statusColor = isSafe
        ? 'text-profit'
        : isWarning
            ? 'text-alert-amber'
            : 'text-loss';

    return (
        <View className="mb-4">
            <View className="flex-row items-center mb-2">
                <View
                    className="w-8 h-8 items-center justify-center mr-2.5"
                    style={{
                        borderRadius: RADIUS.control,
                        backgroundColor: categoryTint(normaliseCategory(category)),
                    }}
                >
                    {icon}
                </View>
                {/* categoryLabel rather than capitalising the raw key, which
                    turned `housing` into "Housing" where the picker, the chart
                    and every other surface say "Rent & Housing". */}
                <Text style={TYPE.callout} className="text-text-primary flex-1">
                    {categoryLabel(category)}
                </Text>
                <Text style={TYPE.caption} className={statusColor}>
                    {statusLabel}
                </Text>
            </View>

            <View className="flex-row justify-between mb-1.5">
                <Text style={TYPE.caption} className="text-text-secondary">
                    ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                </Text>
                <Text style={TYPE.caption} className="text-text-tertiary">
                    {Math.round(percentage)}%
                </Text>
            </View>

            <BarFill percent={Math.min(percentage, 100)} fillClassName={barColor} />
        </View>
    );
};
