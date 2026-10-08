/**
 * Sign in, or sign up, with a phone number.
 *
 * Two stages in one place: the number, then the code. There is no separate
 * sign-up for a phone, because there is nothing to choose: the first time a
 * number confirms a code, the account is created, and every time after that
 * it is the same account.
 *
 * Indian numbers are the default, so ten digits are enough. Anything typed
 * with a leading + is taken as a full international number instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { ChevronLeft, MessageSquareText } from 'lucide-react-native';
import type { ConfirmationResult } from 'firebase/auth';
import { sendPhoneCode, confirmPhoneCode } from '../../services/authService';
import { friendlyError } from '../../utils/errors';
import * as haptics from '../../utils/haptics';
import { PressableScale } from '../PressableScale';
import { OtpInput } from './OtpInput';
import { RecaptchaGate } from './RecaptchaGate';
import type { RecaptchaVerifierHandle } from './recaptchaTypes';
import { COLORS, TYPE, RADIUS, FONTS } from '../../theme/tokens';

const RESEND_AFTER_S = 30;

/** E.164 from whatever was typed, or null while it cannot be one yet. */
export function toE164(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (raw.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return toE164(digits.slice(1));
    if (digits.length === 12 && digits.startsWith('91')) return toE164(digits.slice(2));
    return null;
}

/** 98765 43210, the way the number is printed on an Indian SIM card. */
const pretty = (e164: string) =>
    e164.startsWith('+91') && e164.length === 13
        ? `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`
        : e164;

export const PhoneSignIn: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const reduced = useReducedMotion();
    const gate = useRef<RecaptchaVerifierHandle>(null);

    const [number, setNumber] = useState('');
    const [focused, setFocused] = useState(false);
    const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
    const [sentTo, setSentTo] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shakeKey, setShakeKey] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    // Both start at zero, so nothing counts down until a code has been sent.
    const [now, setNow] = useState(0);

    const e164 = toE164(number);
    const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

    // A one-second tick only while the resend countdown is running.
    useEffect(() => {
        if (!confirmation || resendAt <= Date.now()) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [confirmation, resendAt]);

    const send = async () => {
        if (!e164 || busy || !gate.current) return;
        haptics.tap();
        setBusy(true);
        setError(null);
        try {
            const result = await sendPhoneCode(e164, gate.current);
            setConfirmation(result);
            setSentTo(e164);
            setCode('');
            setResendAt(Date.now() + RESEND_AFTER_S * 1000);
            setNow(Date.now());
            haptics.success();
        } catch (e: unknown) {
            haptics.error();
            setError(friendlyError(e, 'Could not send the code. Check the number and try again.'));
        } finally {
            setBusy(false);
        }
    };

    const confirm = async (digits: string) => {
        if (!confirmation || digits.length < 6 || busy) return;
        setBusy(true);
        setError(null);
        try {
            await confirmPhoneCode(confirmation, digits);
            haptics.success();
            // Nothing else to do: the auth listener moves the app on.
        } catch (e: unknown) {
            haptics.error();
            setShakeKey((k) => k + 1);
            setCode('');
            setError(friendlyError(e, 'Could not check that code. Try again.'));
            setBusy(false);
        }
    };

    const onCode = (digits: string) => {
        setCode(digits);
        if (error) setError(null);
        // Submit on the sixth digit, so SMS autofill signs in with no tap.
        if (digits.length === 6) confirm(digits);
    };

    const changeNumber = () => {
        haptics.tap();
        setConfirmation(null);
        setCode('');
        setError(null);
    };

    return (
        <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInRight.duration(240)}>
            <Pressable
                onPress={confirmation ? changeNumber : onBack}
                accessibilityRole="button"
                hitSlop={10}
                className="flex-row items-center self-start -ml-1 mb-5"
            >
                <ChevronLeft size={20} color={COLORS.brand.link} />
                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-brand-link">
                    {confirmation ? 'Change number' : 'Other ways to sign in'}
                </Text>
            </Pressable>

            {!confirmation ? (
                <>
                    <Text style={TYPE.heading} className="text-text-primary">Your phone number</Text>
                    <Text style={TYPE.caption} className="text-text-secondary mt-1 mb-5">
                        We will text you a six-digit code. New here? The code creates your account.
                    </Text>

                    <View
                        className="flex-row items-center bg-surface-primary px-4 h-[56px]"
                        style={{
                            borderRadius: RADIUS.control,
                            borderWidth: 1,
                            borderColor: focused ? COLORS.brand.primary : COLORS.border.default,
                        }}
                    >
                        {!number.trim().startsWith('+') && (
                            <View className="flex-row items-center mr-3 pr-3 border-r border-border">
                                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary">+91</Text>
                            </View>
                        )}
                        <TextInput
                            className="flex-1 text-lg text-text-primary font-inter-semibold"
                            style={{ letterSpacing: 0.5 }}
                            placeholder="98765 43210"
                            placeholderTextColor={COLORS.text.tertiary}
                            value={number}
                            onChangeText={(t) => { setNumber(t); if (error) setError(null); }}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            keyboardType="phone-pad"
                            textContentType="telephoneNumber"
                            autoComplete="tel"
                            maxLength={16}
                            autoFocus
                            returnKeyType="send"
                            onSubmitEditing={send}
                        />
                    </View>

                    {error && (
                        <Animated.View entering={FadeIn.duration(180)} style={{ backgroundColor: COLORS.semantic.lossBg, borderRadius: RADIUS.control, padding: 14, marginTop: 12 }}>
                            <Text style={TYPE.caption} className="text-loss text-center">{error}</Text>
                        </Animated.View>
                    )}

                    <PressableScale
                        onPress={send}
                        disabled={!e164 || busy}
                        accessibilityRole="button"
                        containerStyle={{ marginTop: 20 }}
                        style={{
                            backgroundColor: COLORS.brand.primaryDark,
                            opacity: !e164 || busy ? 0.5 : 1,
                            borderRadius: RADIUS.pill,
                            height: 52,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {busy ? (
                            <ActivityIndicator color={COLORS.brand.onAccent} />
                        ) : (
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]}>
                                Send code
                            </Text>
                        )}
                    </PressableScale>

                    <Text style={TYPE.caption} className="text-text-tertiary text-center mt-4">
                        Standard SMS rates from your carrier may apply.
                    </Text>
                </>
            ) : (
                <Animated.View entering={reduced ? FadeIn.duration(160) : FadeInRight.duration(240)}>
                    <View className="w-12 h-12 bg-brand-soft items-center justify-center mb-4" style={{ borderRadius: RADIUS.tile }}>
                        <MessageSquareText size={22} color={COLORS.brand.link} strokeWidth={1.8} />
                    </View>
                    <Text style={TYPE.heading} className="text-text-primary">Enter the code</Text>
                    <Text style={TYPE.caption} className="text-text-secondary mt-1 mb-5">
                        Sent to {pretty(sentTo)}. It usually arrives in a few seconds.
                    </Text>

                    <OtpInput value={code} onChange={onCode} errorKey={shakeKey} disabled={busy} />

                    {error && (
                        <Animated.View entering={FadeIn.duration(180)} style={{ backgroundColor: COLORS.semantic.lossBg, borderRadius: RADIUS.control, padding: 14, marginTop: 16 }}>
                            <Text style={TYPE.caption} className="text-loss text-center">{error}</Text>
                        </Animated.View>
                    )}

                    <View className="flex-row items-center justify-center mt-6 h-6">
                        {busy ? (
                            <>
                                <ActivityIndicator size="small" color={COLORS.brand.primary} />
                                <Text style={TYPE.caption} className="text-text-secondary ml-2">Checking</Text>
                            </>
                        ) : secondsLeft > 0 ? (
                            <Text style={[TYPE.caption, { fontVariant: ['tabular-nums'] }]} className="text-text-tertiary">
                                Resend code in 0:{String(secondsLeft).padStart(2, '0')}
                            </Text>
                        ) : (
                            <Pressable onPress={send} accessibilityRole="button" hitSlop={10}>
                                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-brand-link">
                                    Resend code
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>
            )}

            <RecaptchaGate ref={gate} />
        </Animated.View>
    );
};

export default PhoneSignIn;
