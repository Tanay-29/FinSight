/**
 * Skeleton
 *
 * Content-shaped placeholders for loading states. A spinner tells the user to
 * wait; a skeleton tells them what is about to arrive and stops the layout
 * jumping when it does.
 *
 * One shared pulse animation per skeleton block, native-driven.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';

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
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 750,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0,
                    duration: 750,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [pulse]);

    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: radius, backgroundColor: '#E5E7EB', opacity },
                style,
            ]}
        />
    );
};

/** Placeholder shaped like one course card on the Learn tab. */
export const CourseCardSkeleton: React.FC = () => (
    <View className="mb-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <View style={{ height: 3, backgroundColor: '#E5E7EB' }} />
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
    <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100">
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ height: 8 }} />
        <Skeleton width="45%" height={20} />
        <View style={{ height: 6 }} />
        <Skeleton width="70%" height={10} />
    </View>
);

export default Skeleton;
