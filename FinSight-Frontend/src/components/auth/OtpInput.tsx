/**
 * Six boxes for a one-time code.
 *
 * One hidden TextInput does the typing, so paste, backspace and the phone's
 * own SMS autofill (oneTimeCode on iOS, sms-otp on Android) all work as they
 * would in a plain field. The boxes only draw what it holds.
 *
 * A wrong code shakes the row. That is the one moment here where movement
 * says something words would say slower.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle, useSharedValue, withSequence, withTiming, useReducedMotion, ZoomIn,
} from 'react-native-reanimated';
import { COLORS, RADIUS, TYPE } from '../../theme/tokens';

interface OtpInputProps {
    value: string;
    onChange: (code: string) => void;
    length?: number;
    /** Bump this to shake the row, after a wrong code. */
    errorKey?: number;
    disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, length = 6, errorKey = 0, disabled }) => {
    const input = useRef<TextInput>(null);
    const reduced = useReducedMotion();
    const shake = useSharedValue(0);

    useEffect(() => {
        if (!errorKey || reduced) return;
        shake.value = withSequence(
            withTiming(-8, { duration: 50 }),
            withTiming(8, { duration: 50 }),
            withTiming(-6, { duration: 50 }),
            withTiming(6, { duration: 50 }),
            withTiming(0, { duration: 50 }),
        );
    }, [errorKey, reduced, shake]);

    const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

    return (
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Verification code" accessibilityHint="Enter the six digits from the SMS">
            <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between' }, rowStyle]}>
                {Array.from({ length }, (_, i) => {
                    const digit = value[i];
                    const active = i === value.length && !disabled;
                    return (
                        <View
                            key={i}
                            className="items-center justify-center bg-surface-primary"
                            style={{
                                width: 46,
                                height: 56,
                                borderRadius: RADIUS.control,
                                borderWidth: active ? 2 : 1,
                                borderColor: active
                                    ? COLORS.brand.primary
                                    : digit ? COLORS.border.strong : COLORS.border.default,
                            }}
                        >
                            {digit ? (
                                <Animated.Text
                                    entering={reduced ? undefined : ZoomIn.duration(140)}
                                    style={[TYPE.amountMd, { color: COLORS.text.primary }]}
                                >
                                    {digit}
                                </Animated.Text>
                            ) : (
                                <Text style={[TYPE.amountMd, { color: COLORS.text.muted }]}>{active ? '|' : ''}</Text>
                            )}
                        </View>
                    );
                })}
            </Animated.View>
            <TextInput
                ref={input}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={length}
                autoFocus
                editable={!disabled}
                caretHidden
                // Kept on screen at full size but invisible: some Android
                // keyboards will not open for a zero-sized field.
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01 }}
            />
        </Pressable>
    );
};

export default OtpInput;
