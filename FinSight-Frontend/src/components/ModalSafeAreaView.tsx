/**
 * SafeAreaView for screens presented as a full screen modal (the lesson
 * player, the money quiz, the scenario player).
 *
 * On iPhone the native SafeAreaView reported no insets inside a full screen
 * modal, so the close button and progress bar sat under the clock and the
 * last button sat on the home indicator. The window's insets, which the
 * provider at the root measures, are right for a screen that covers the
 * whole window, so on iOS this pads by those instead. Android keeps the
 * native view.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { IS_IOS } from '../theme/tokens';

export const ModalSafeAreaView: React.FC<{
    edges?: Edge[];
    style?: StyleProp<ViewStyle>;
    className?: string;
    children?: React.ReactNode;
}> = ({ edges = ['top', 'bottom', 'left', 'right'], style, className, children }) => {
    const insets = useSafeAreaInsets();
    if (!IS_IOS) {
        return <SafeAreaView edges={edges} style={style} className={className}>{children}</SafeAreaView>;
    }
    // Insets add to the padding the screen already asked for, as the
    // native view does, rather than replacing it.
    const flat = StyleSheet.flatten(style) ?? {};
    const base = (side: 'Top' | 'Bottom' | 'Left' | 'Right', axis: 'paddingVertical' | 'paddingHorizontal'): number => {
        const value = flat[`padding${side}`] ?? flat[axis] ?? flat.padding ?? 0;
        return typeof value === 'number' ? value : 0;
    };
    return (
        <View
            className={className}
            style={[
                flat,
                {
                    paddingTop: base('Top', 'paddingVertical') + (edges.includes('top') ? insets.top : 0),
                    paddingBottom: base('Bottom', 'paddingVertical') + (edges.includes('bottom') ? insets.bottom : 0),
                    paddingLeft: base('Left', 'paddingHorizontal') + (edges.includes('left') ? insets.left : 0),
                    paddingRight: base('Right', 'paddingHorizontal') + (edges.includes('right') ? insets.right : 0),
                },
            ]}
        >
            {children}
        </View>
    );
};
