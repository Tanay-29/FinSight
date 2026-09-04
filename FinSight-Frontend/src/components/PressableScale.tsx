/**
 * A pressable that dips slightly under the finger.
 *
 * Mobile has no hover, so press is the only moment the interface can confirm it
 * heard you. Nothing in this app did that: every button was a TouchableOpacity
 * fading to 80% and back, which reads as flat rather than physical.
 *
 * Scale rather than opacity, because scale carries the label and the icon with
 * it, and that is what makes a control feel like an object instead of a
 * rectangle that dims. It runs as a Reanimated CSS transition, so the value
 * lives on the UI thread and a busy JS thread cannot stutter it.
 *
 * Feedback fires on press-in, not on release. Waiting for the tap to complete
 * is the latency people actually notice.
 */
import React, { useState } from 'react';
import { Pressable, PressableProps, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { MOTION } from '../theme/tokens';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    /** Goes on the Pressable itself. Needed when the button has to flex. */
    containerStyle?: StyleProp<ViewStyle>;
    className?: string;
    /** How far it dips. 0.97 for most things, 0.94 for something small. */
    activeScale?: number;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
    children,
    style,
    containerStyle,
    className,
    activeScale = 0.97,
    disabled,
    onPressIn,
    onPressOut,
    ...rest
}) => {
    const [pressed, setPressed] = useState(false);
    const reduced = useReducedMotion();

    // Reduced motion keeps the confirmation but drops the movement.
    const scale = reduced || disabled ? 1 : pressed ? activeScale : 1;

    return (
        <Pressable
            style={containerStyle}
            disabled={disabled}
            onPressIn={(e) => { setPressed(true); onPressIn?.(e); }}
            onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
            // A finger drifting a few pixels should not cancel a press that was
            // clearly meant.
            pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
            {...rest}
        >
            {/*
              * The animated node carries ONLY the transform, and the caller's
              * className and style go on a plain View inside it.
              *
              * They used to be on the Animated.View itself, and NativeWind's
              * class styles never arrived: buttons rendered with no background,
              * no radius and no flex-row, so a white label sat invisible on the
              * canvas. Every call site that styles a PressableScale through
              * className was affected, which is most of them. A plain View is a
              * component NativeWind definitely handles, and nesting costs
              * nothing because the parent still scales the whole thing.
              */}
            <Animated.View
                style={{
                    transform: [{ scale }],
                    opacity: reduced && pressed ? 0.85 : 1,
                    transitionProperty: ['transform', 'opacity'],
                    transitionDuration: MOTION.press,
                    transitionTimingFunction: 'ease-out',
                } as ViewStyle}
            >
                <View className={className} style={style}>
                    {children}
                </View>
            </Animated.View>
        </Pressable>
    );
};

export default PressableScale;
