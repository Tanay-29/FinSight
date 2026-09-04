/**
 * Skeleton
 *
 * Content-shaped placeholders for loading states. A spinner tells the user to
 * wait; a skeleton tells them what is about to arrive and stops the layout
 * jumping when it does.
 *
 * The pulse is a Reanimated CSS animation rather than a core Animated loop.
 * A screen showing eight placeholders was running eight JS-driven loops; as
 * keyframes the whole thing lives on the UI thread and costs nothing while the
 * data it is waiting for is being parsed.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { COLORS } from '../theme/tokens';

interface SkeletonProps {
    width?: number | `${number}%`;
    height?: number;
    radius?: number;
    style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 14,
    radius = 6,
    style,
}) => {
    const reduced = useReducedMotion();

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: radius, backgroundColor: COLORS.border.default },
                // Reduced motion keeps the placeholder, drops the breathing.
                reduced
                    ? { opacity: 0.7 }
                    : ({
                          animationName: {
                              '0%': { opacity: 0.5 },
                              '50%': { opacity: 0.85 },
                              '100%': { opacity: 0.5 },
                          },
                          animationDuration: '1500ms',
                          animationIterationCount: 'infinite',
                          animationTimingFunction: 'ease-in-out',
                      } as ViewStyle),
                style,
            ]}
        />
    );
};

/** Placeholder shaped like one course card on the Learn tab. */
export const CourseCardSkeleton: React.FC = () => (
    <View className="mb-4 bg-surface-primary rounded-2xl border border-border overflow-hidden">
        <View style={{ height: 3, backgroundColor: COLORS.border.default }} />
        <View className="p-4">
            <Skeleton width="65%" height={16} />
            <View style={{ height: 8 }} />
            <Skeleton width="90%" height={11} />
            <View style={{ height: 16 }} />
            <View className="flex-row justify-between">
                <Skeleton width="40%" height={10} />
                <Skeleton width="20%" height={10} />
            </View>
            <View style={{ height: 12 }} />
            <Skeleton height={6} radius={3} />
        </View>
    </View>
);

/** Placeholder shaped like one transaction row. */
export const TransactionRowSkeleton: React.FC = () => (
    <View className="flex-row items-center py-3">
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="55%" height={13} />
            <View style={{ height: 6 }} />
            <Skeleton width="30%" height={10} />
        </View>
        <Skeleton width={60} height={14} />
    </View>
);

/** Placeholder shaped like one stat tile. */
export const StatCardSkeleton: React.FC = () => (
    <View className="flex-1 bg-surface-primary rounded-2xl p-4 items-center border border-border">
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ height: 8 }} />
        <Skeleton width="45%" height={20} />
        <View style={{ height: 6 }} />
        <Skeleton width="70%" height={10} />
    </View>
);

export default Skeleton;
