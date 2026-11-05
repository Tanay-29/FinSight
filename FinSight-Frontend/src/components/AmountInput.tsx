/**
 * A large amount entry, the kind payment apps use.
 *
 * What you see is plain text, formatted as you type (12000 shows as
 * ₹12,000), with a blinking caret after it. The real TextInput sits on top,
 * invisible, so the keyboard, paste and screen readers all work as normal.
 * Drawing the figure ourselves keeps it centred and lets it shrink as it
 * grows, which a TextInput cannot do on its own.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated';
import { inr } from '../utils/moneyMath';
import { COLORS, FONTS } from '../theme/tokens';

interface Props {
    /** Raw digits (and at most one dot when `decimals`). */
    value: string;
    onChange: (raw: string) => void;
    color: string;
    prefix?: string;
    label: string;
    autoFocus?: boolean;
    decimals?: boolean;
    /** Largest font size; it steps down as the figure gets longer. */
    size?: number;
}

function clean(text: string, decimals: boolean): string {
    let t = text.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
    if (decimals) {
        const [whole, ...rest] = t.split('.');
        t = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
    }
    return t.replace(/^0+(?=\d)/, '').slice(0, 10);
}

function show(raw: string): string {
    if (!raw) return '0';
    const [whole, frac] = raw.split('.');
    const w = whole ? inr(Number(whole)) : '0';
    return frac !== undefined ? `${w}.${frac}` : w;
}

export const AmountInput: React.FC<Props> = ({ value, onChange, color, prefix = '₹', label, autoFocus, decimals = false, size = 52 }) => {
    const input = useRef<TextInput>(null);
    const [focused, setFocused] = useState(false);
    const reduced = useReducedMotion();
    const blink = useSharedValue(1);

    useEffect(() => {
        if (focused && !reduced) {
            blink.value = withRepeat(withSequence(withTiming(1, { duration: 0 }), withTiming(1, { duration: 500 }), withTiming(0, { duration: 80 }), withTiming(0, { duration: 420 })), -1);
        } else {
            cancelAnimation(blink);
            blink.value = focused ? 1 : 0;
        }
    }, [focused, reduced, blink]);

    const caret = useAnimatedStyle(() => ({ opacity: blink.value }));

    const text = show(value);
    const fontSize = text.length > 9 ? size * 0.66 : text.length > 7 ? size * 0.8 : size;
    const empty = !value;

    return (
        <Pressable onPress={() => input.current?.focus()} accessible={false} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: size * 1.2 }}>
                <Text style={{ fontFamily: FONTS.semibold, fontSize: fontSize * 0.62, lineHeight: fontSize * 1.1, color: empty ? COLORS.text.muted : color, marginRight: 4, marginTop: fontSize * 0.08 }}>
                    {prefix}
                </Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize, lineHeight: fontSize * 1.15, letterSpacing: -fontSize * 0.02, fontVariant: ['tabular-nums'], color: empty ? COLORS.text.muted : color }}>
                    {text}
                </Text>
                <Animated.View style={[{ width: 2.5, height: fontSize * 0.86, borderRadius: 2, marginLeft: 3, backgroundColor: COLORS.brand.primary }, caret]} />
            </View>
            <TextInput
                ref={input}
                value={value}
                onChangeText={(t) => onChange(clean(t, decimals))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
                autoFocus={autoFocus}
                accessibilityLabel={label}
                caretHidden
                contextMenuHidden={false}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent', fontSize: 1, backgroundColor: 'transparent', borderWidth: 0 }}
            />
        </Pressable>
    );
};
