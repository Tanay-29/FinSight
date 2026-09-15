/**
 * The pieces every lesson card shares: the prompt, the option row, the
 * feedback panel and the check button. Kept in one file so all eight card
 * types read as one deck rather than eight screens.
 */
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    FadeIn, FadeInDown, useReducedMotion, useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { Check, X, ExternalLink } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';
import { COLORS, FONTS, TYPE, MOTION } from '../../theme/tokens';

export const Prompt: React.FC<{ children: string; small?: boolean }> = ({ children, small }) => (
    <Text style={{ ...(small ? TYPE.callout : TYPE.heading), color: COLORS.text.primary, marginBottom: 16 }}>
        {children}
    </Text>
);

/**
 * The moment an answer lands, the row says so with its body, not only its
 * colour: a short spring pop when right, a quick sideways shake when wrong.
 * Both run on the UI thread and both are skipped under reduced motion,
 * which keeps the colour change as the confirmation.
 */
const useVerdictMotion = (state: string) => {
    const reduced = useReducedMotion();
    const scale = useSharedValue(1);
    const shift = useSharedValue(0);
    useEffect(() => {
        if (reduced) return;
        if (state === 'correct') {
            scale.value = withSequence(withSpring(1.035, { damping: 12, stiffness: 320 }), withSpring(1, MOTION.spring));
        } else if (state === 'wrong') {
            shift.value = withSequence(
                withTiming(-7, { duration: 45 }), withTiming(7, { duration: 45 }),
                withTiming(-5, { duration: 45 }), withTiming(4, { duration: 45 }),
                withTiming(0, { duration: 60 }),
            );
        }
    }, [state, reduced, scale, shift]);
    return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: shift.value }] }));
};

/** One tappable option. `state` drives colour after the answer lands. */
export const OptionRow: React.FC<{
    label: string;
    index?: number;
    state: 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';
    disabled?: boolean;
    onPress: () => void;
}> = ({ label, index, state, disabled, onPress }) => {
    const motion = useVerdictMotion(state);
    const border =
        state === 'correct' ? COLORS.semantic.profit
            : state === 'wrong' ? COLORS.semantic.loss
                : state === 'selected' ? COLORS.brand.primary
                    : COLORS.border.default;
    const bg =
        state === 'correct' ? COLORS.semantic.profitBg
            : state === 'wrong' ? COLORS.semantic.lossBg
                : state === 'selected' ? COLORS.brand.soft
                    : COLORS.surface.primary;
    const text = state === 'dim' ? COLORS.text.tertiary : COLORS.text.primary;
    return (
        <Animated.View style={motion}>
        <PressableScale
            onPress={onPress}
            disabled={disabled}
            activeScale={0.985}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={{
                borderWidth: state === 'correct' || state === 'wrong' ? 2 : 1,
                borderColor: border,
                backgroundColor: bg,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
            }}
        >
            {index !== undefined ? (
                <View style={{
                    width: 26, height: 26, borderRadius: 13, marginRight: 12,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: state === 'correct' ? COLORS.semantic.profit
                        : state === 'wrong' ? COLORS.semantic.loss : COLORS.surface.tertiary,
                }}>
                    {state === 'correct' ? <Check size={14} color={COLORS.brand.onAccent} strokeWidth={3} />
                        : state === 'wrong' ? <X size={14} color={COLORS.brand.onAccent} strokeWidth={3} />
                            : <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: COLORS.text.secondary }}>{'ABCD'[index]}</Text>}
                </View>
            ) : null}
            <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 21, color: text, flex: 1 }}>{label}</Text>
        </PressableScale>
        </Animated.View>
    );
};

/** What the learner reads after answering. Always the explanation, right or wrong. */
export const Feedback: React.FC<{ correct: boolean; explain: string; source?: string }> = ({ correct, explain, source }) => {
    const reduced = useReducedMotion();
    const tone = correct ? COLORS.semantic.profit : COLORS.semantic.alertCritical;
    return (
        <Animated.View
            entering={reduced ? FadeIn.duration(160) : FadeInDown.duration(240)}
            style={{
                marginTop: 6,
                borderRadius: 14,
                padding: 16,
                backgroundColor: correct ? COLORS.semantic.profitBg : COLORS.semantic.lossBg,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {correct ? <Check size={14} color={tone} strokeWidth={3} /> : <X size={14} color={tone} strokeWidth={3} />}
                <Text style={{ ...TYPE.caption, fontFamily: FONTS.bold, color: tone, marginLeft: 6 }}>
                    {correct ? 'Right' : 'Not quite'}
                </Text>
            </View>
            <Text style={{ ...TYPE.body, fontSize: 15, lineHeight: 22, color: COLORS.text.secondary }}>{explain}</Text>
            {source ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <ExternalLink size={11} color={COLORS.text.tertiary} />
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.regular, fontSize: 11, color: COLORS.text.tertiary, marginLeft: 4, flex: 1 }}>{source}</Text>
                </View>
            ) : null}
        </Animated.View>
    );
};

/** The check button for cards that need the learner to commit a multi-part answer. */
export const CheckButton: React.FC<{ label?: string; disabled?: boolean; onPress: () => void }> = ({ label = 'Check', disabled, onPress }) => (
    <PressableScale
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={{
            marginTop: 8,
            height: 48,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: disabled ? COLORS.surface.tertiary : COLORS.brand.primaryDark,
        }}
    >
        <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: disabled ? COLORS.text.tertiary : COLORS.brand.onAccent }}>
            {label}
        </Text>
    </PressableScale>
);

/** A small labelled figure, for the explorables' readouts. */
export const Readout: React.FC<{ label: string; value: string; tone?: 'neutral' | 'good' | 'bad'; big?: boolean }> = ({ label, value, tone = 'neutral', big }) => (
    <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: COLORS.text.tertiary, marginBottom: 2 }}>{label}</Text>
        <Text style={{
            ...(big ? TYPE.amountLg : TYPE.amountMd),
            color: tone === 'good' ? COLORS.semantic.profit : tone === 'bad' ? COLORS.semantic.alertCritical : COLORS.text.primary,
        }}>
            {value}
        </Text>
    </View>
);
