/**
 * React Native's Pressable, with one difference: a style written as a
 * function of `pressed` is resolved here and handed down as a plain style.
 *
 * Under NativeWind the function form lost its layout on iPhone. The rows in
 * Profile rendered with no flexDirection and no padding, so the icon, label
 * and chevron stacked on top of each other. A plain style object is always
 * applied, so this keeps the pressed state in React and passes one of those.
 *
 * Use it anywhere a Pressable's style depends on `pressed`.
 */
import React, { useState } from 'react';
import {
    Pressable as RNPressable,
    StyleSheet,
    type PressableProps,
    type PressableStateCallbackType,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    className?: string;
};

export const Pressable: React.FC<Props> = ({ style, onPressIn, onPressOut, ...rest }) => {
    const [pressed, setPressed] = useState(false);
    const resolved = typeof style === 'function' ? style({ pressed }) : style;
    return (
        <RNPressable
            {...rest}
            onPressIn={(e) => { setPressed(true); onPressIn?.(e); }}
            onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
            style={StyleSheet.flatten(resolved)}
        />
    );
};
