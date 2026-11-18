/**
 * The one back button: a round, outlined arrow, the same on every pushed screen.
 *
 * On iPhone it is the system's back control instead: a chevron, in a round
 * Liquid Glass button on iOS 26 and as a bare tinted chevron before that.
 * The edge swipe goes back too; the native stack gives every pushed screen
 * that gesture.
 */
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronLeft } from 'lucide-react-native';
import { COLORS, IS_IOS } from '../theme/tokens';
import { GlassSurface, LIQUID_GLASS } from './GlassSurface';

export const BackButton: React.FC<{ onPress?: () => void; label?: string }> = ({ onPress, label = 'Back' }) => {
    const navigation = useNavigation();
    const goBack = onPress ?? (() => navigation.goBack());

    if (IS_IOS) {
        return (
            <Pressable
                onPress={goBack}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => ({ width: 44, height: 44, opacity: !LIQUID_GLASS && pressed ? 0.4 : 1 })}
            >
                {LIQUID_GLASS ? (
                    <GlassSurface radius={22} interactive style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2.4} style={{ marginLeft: -2 }} />
                    </GlassSurface>
                ) : (
                    <ChevronLeft size={30} color={COLORS.brand.link} strokeWidth={2.4} style={{ marginLeft: -8, marginTop: 7 }} />
                )}
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? COLORS.surface.tertiary : COLORS.surface.primary,
                borderWidth: 1, borderColor: COLORS.border.default,
            })}
        >
            <ArrowLeft size={18} color={COLORS.text.primary} />
        </Pressable>
    );
};
