/**
 * The material under controls that float over content on iPhone: the tab bar
 * and the main action button. Never under content cards; glass is for the
 * navigation layer only, which is what the Human Interface Guidelines ask.
 *
 * On iOS 26 this is Liquid Glass (expo-glass-effect). On older iOS, or a
 * build made with an older Xcode, it is the system chrome material the tab
 * bar used before (expo-blur), with a hairline edge so the shape still reads
 * over a plain background. Both follow Reduce Transparency on their own:
 * the system swaps them for a solid fill.
 *
 * Only used on iOS. Android keeps its own solid surfaces.
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { COLORS, IS_IOS } from '../theme/tokens';
import { useScheme } from '../theme/theme';

/** True when the phone and the build both support Liquid Glass. */
export const LIQUID_GLASS = IS_IOS && isLiquidGlassAvailable();

export const GlassSurface: React.FC<{
    style?: StyleProp<ViewStyle>;
    radius: number;
    /** Tints the glass, for a primary action. The blur fallback ignores it. */
    tint?: string;
    /** Lets the glass react to touch, for something that is pressed. */
    interactive?: boolean;
    children?: React.ReactNode;
}> = ({ style, radius, tint, interactive, children }) => {
    const { scheme } = useScheme();

    if (LIQUID_GLASS) {
        return (
            <GlassView
                glassEffectStyle="regular"
                tintColor={tint}
                isInteractive={interactive}
                // The app has its own appearance setting, so the glass is told
                // which one is active rather than reading the phone's.
                colorScheme={scheme}
                style={[style, { borderRadius: radius }]}
            >
                {children}
            </GlassView>
        );
    }

    return (
        <View
            style={[
                style,
                {
                    borderRadius: radius,
                    overflow: 'hidden',
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: COLORS.border.default,
                },
            ]}
        >
            <BlurView
                tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
                intensity={100}
                style={StyleSheet.absoluteFill}
            />
            {children}
        </View>
    );
};
