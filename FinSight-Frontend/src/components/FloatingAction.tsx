/**
 * The main action that floats in the corner of a tab: Goals' "New goal" and
 * Money's "Add". Same shape, place and wording style on every tab that has one.
 *
 * Android keeps the solid brand capsule. On iPhone it sits just above the
 * floating tab bar, and on iOS 26 it is tinted Liquid Glass, the material
 * iOS uses for a prominent control floating over content. Older iOS keeps
 * the solid capsule, which is what a filled button looks like there.
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { COLORS, FACE, GUTTER, IS_IOS, TYPE } from '../theme/tokens';
import { useTabBarClearance } from '../navigation/tabBarMetrics';
import { GlassSurface, LIQUID_GLASS } from './GlassSurface';
import { PressableScale } from './PressableScale';

export const FloatingAction: React.FC<{
    label: string;
    accessibilityLabel: string;
    onPress: () => void;
}> = ({ label, accessibilityLabel, onPress }) => {
    const clearance = useTabBarClearance();
    const content = (
        <>
            <Plus size={18} color={COLORS.brand.onAccent} strokeWidth={2.6} />
            <Text style={{ ...TYPE.callout, ...FACE.semibold, color: COLORS.brand.onAccent, marginLeft: 6 }}>{label}</Text>
        </>
    );

    if (IS_IOS && LIQUID_GLASS) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                style={{ position: 'absolute', right: GUTTER, bottom: clearance }}
            >
                <GlassSurface
                    radius={25}
                    tint={COLORS.brand.primaryDark}
                    interactive
                    style={{ height: 50, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}
                >
                    {content}
                </GlassSurface>
            </Pressable>
        );
    }

    return (
        <PressableScale
            onPress={onPress}
            activeScale={0.92}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            containerStyle={{ position: 'absolute', right: GUTTER, bottom: IS_IOS ? clearance : 24 }}
            style={{ height: 52, paddingHorizontal: 20, borderRadius: 26, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.brand.primaryDark, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
        >
            {content}
        </PressableScale>
    );
};
