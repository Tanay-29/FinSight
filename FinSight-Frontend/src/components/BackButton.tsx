/** The one back button: a round, outlined arrow, the same on every pushed screen. */
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../theme/tokens';

export const BackButton: React.FC<{ onPress?: () => void; label?: string }> = ({ onPress, label = 'Back' }) => {
    const navigation = useNavigation();
    return (
        <Pressable
            onPress={onPress ?? (() => navigation.goBack())}
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
