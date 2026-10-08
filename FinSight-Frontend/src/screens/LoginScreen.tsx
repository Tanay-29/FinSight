/**
 * LoginScreen: signing in and creating an account, three ways.
 *
 * The coloured field owns the top of the screen and a sheet rises into the
 * bottom, so the form reads as something that came to you rather than a box
 * sitting in space. The claim at the top is concrete: it names what the app
 * does with a pasted bank message.
 *
 * Creating an account used to be a small "Sign up" link in the corner of the
 * sheet, which people did not find. It is now one half of a switch at the top
 * of the sheet, the same size as Sign in, so the choice is the first thing
 * read. Google and phone sit above email because for most students they are
 * one tap and a code respectively; for both of them signing in and signing up
 * are the same action, so they say "Continue" in either mode.
 *
 * Motion stays thin. The switch's pill slides, the name field arrives when you
 * move to Create account, the phone flow slides in from the side it was asked
 * for, and buttons dip under the finger. No layout animations: an error that
 * makes the sheet taller should appear, and the form around it hold still.
 */
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
    LayoutChangeEvent,
    ViewStyle,
} from 'react-native';
import Animated, {
    FadeIn, FadeInDown, FadeInLeft, useReducedMotion,
    useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Eye, EyeOff, TrendingUp, Smartphone } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUpUser, signInUser, signInWithGoogleUser, clearError } from '../store/slices/authSlice';
import { sendPasswordReset } from '../services/authService';
import { PressableScale } from '../components/PressableScale';
import { GoogleLogo } from '../components/auth/GoogleLogo';
import { PhoneSignIn } from '../components/auth/PhoneSignIn';
import * as haptics from '../utils/haptics';
import type { RootState, AppDispatch } from '../store/store';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS, MOTION } from '../theme/tokens';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Three steps, and the words say what would make it better. */
function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
    if (!pw) return { score: 0, label: '' };
    if (pw.length < 8) return { score: 1, label: 'Too short. Use at least 8 characters.' };
    const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
    if (pw.length >= 12 && kinds >= 3) return { score: 3, label: 'Strong password.' };
    if (kinds >= 2) return { score: 2, label: 'Good. A symbol or a few more characters makes it strong.' };
    return { score: 1, label: 'Mix in numbers or capitals.' };
}

/** Sign in and Create account, as two equal halves with one sliding pill. */
const ModeSwitch: React.FC<{ mode: Mode; onChange: (m: Mode) => void }> = ({ mode, onChange }) => {
    const reduced = useReducedMotion();
    const [width, setWidth] = useState(0);
    const x = useSharedValue(0);
    const half = width / 2;

    React.useEffect(() => {
        const target = mode === 'signin' ? 0 : half;
        x.value = reduced ? target : withTiming(target, { duration: MOTION.quick });
    }, [mode, half, reduced, x]);

    const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

    return (
        <View
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
            className="flex-row bg-surface-tertiary p-1 mb-6"
            style={{ borderRadius: RADIUS.pill }}
            accessibilityRole="tablist"
        >
            {width > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[{
                        position: 'absolute', top: 4, bottom: 4, left: 4,
                        width: half - 4,
                        borderRadius: RADIUS.pill,
                        backgroundColor: COLORS.surface.primary,
                        borderWidth: 1,
                        borderColor: COLORS.border.default,
                    }, pill]}
                />
            )}
            {(['signin', 'signup'] as Mode[]).map((m) => {
                const active = mode === m;
                return (
                    <Pressable
                        key={m}
                        onPress={() => { if (!active) { haptics.select(); onChange(m); } }}
                        className="flex-1 h-10 items-center justify-center"
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                    >
                        <Text
                            style={[TYPE.callout, { fontFamily: active ? FONTS.semibold : FONTS.medium }]}
                            className={active ? 'text-text-primary' : 'text-text-tertiary'}
                        >
                            {m === 'signin' ? 'Sign in' : 'Create account'}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

/** An outlined, full-width "Continue with ..." button. */
const ProviderButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    busy?: boolean;
    disabled?: boolean;
}> = ({ icon, label, onPress, busy, disabled }) => (
    <PressableScale
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        containerStyle={{ marginBottom: 12 }}
        style={{
            height: 52,
            borderRadius: RADIUS.pill,
            borderWidth: 1,
            borderColor: COLORS.border.strong,
            backgroundColor: COLORS.surface.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled && !busy ? 0.55 : 1,
        }}
    >
        {busy ? <ActivityIndicator color={COLORS.brand.primary} /> : (
            <>
                {icon}
                <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-text-primary ml-2.5">
                    {label}
                </Text>
            </>
        )}
    </PressableScale>
);

const LoginScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);
    const reduced = useReducedMotion();

    const [mode, setMode] = useState<Mode>('signin');
    const [method, setMethod] = useState<'choose' | 'phone'>('choose');
    // Which button started the request, so only that one spins.
    const [pending, setPending] = useState<'email' | 'google' | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [resetNotice, setResetNotice] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const isSignUp = mode === 'signup';
    const strength = passwordStrength(password);
    const busy = isLoading && pending !== null;

    const clearMessages = () => {
        setFieldError(null);
        setResetNotice(null);
        if (error) dispatch(clearError());
    };

    const switchMode = (m: Mode) => {
        setMode(m);
        setShowPassword(false);
        clearMessages();
    };

    /** Checked here first, so the common mistakes never cost a round trip. */
    const validate = (): string | null => {
        if (isSignUp && !name.trim()) return 'Tell us your name.';
        if (!EMAIL_RE.test(email.trim())) return 'That does not look like an email address.';
        if (!password) return 'Enter your password.';
        if (isSignUp && password.length < 8) return 'Use at least 8 characters for your password.';
        return null;
    };

    const handleSubmit = async () => {
        clearMessages();
        const problem = validate();
        if (problem) {
            haptics.warn();
            setFieldError(problem);
            return;
        }
        setPending('email');
        const result = isSignUp
            ? await dispatch(signUpUser({ email, password, name }))
            : await dispatch(signInUser({ email, password }));
        setPending(null);
        if (result.meta.requestStatus === 'rejected') haptics.error();
    };

    const handleGoogle = async () => {
        haptics.tap();
        clearMessages();
        setPending('google');
        const result = await dispatch(signInWithGoogleUser());
        setPending(null);
        if (result.meta.requestStatus === 'rejected') haptics.error();
    };

    const handleForgotPassword = async () => {
        clearMessages();
        if (!EMAIL_RE.test(email.trim())) {
            setResetNotice('Enter your email address above first.');
            return;
        }
        setResetting(true);
        try {
            await sendPasswordReset(email);
            // Worded so it says nothing about whether the address is registered.
            setResetNotice('If an account exists for that email, a reset link is on its way.');
        } catch {
            setResetNotice('Could not send the reset email. Check your connection and try again.');
        } finally {
            setResetting(false);
        }
    };

    /** Border colour is the only thing that marks focus, and it costs nothing.
     *  Width deliberately stays at 1: thickening it on focus nudges the text. */
    const fieldClass = (key: string) =>
        `bg-surface-primary rounded-control px-4 h-[52px] border ${
            focused === key ? 'border-brand-primary' : 'border-border'
        }`;

    const message = fieldError ?? error;

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-brand-primary-dark"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* The claim. Concrete, because "Your Daily Money Mentor" told
                    a student nothing they could picture. */}
                <Animated.View
                    entering={reduced ? FadeIn.duration(200) : FadeIn.duration(400)}
                    style={{ paddingHorizontal: GUTTER, paddingTop: 60, paddingBottom: 30 }}
                >
                    <View className="flex-row items-center mb-5">
                        <View className="w-9 h-9 bg-white/20 items-center justify-center mr-2.5" style={{ borderRadius: RADIUS.tile }}>
                            <TrendingUp size={18} color={COLORS.brand.onAccent} strokeWidth={1.8} />
                        </View>
                        <Text style={TYPE.heading} className="text-white">FinSight</Text>
                    </View>

                    <Text style={TYPE.title} className="text-white mb-3">
                        Paste a bank text.{'\n'}See where it went.
                    </Text>
                    <Text style={TYPE.body} className="text-brand-on-dark">
                        Built for students who want to know where the money goes,
                        without a spreadsheet.
                    </Text>
                </Animated.View>

                {/* The sheet. Rises once, then never moves again. */}
                <Animated.View
                    entering={reduced ? FadeIn.duration(220) : FadeInDown.duration(260)}
                    // Colour in style, not className: on an animated view that
                    // also takes a style, the class background can be dropped.
                    style={{ flex: 1, backgroundColor: COLORS.surface.secondary, borderTopLeftRadius: RADIUS.pill, borderTopRightRadius: RADIUS.pill, paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 40 }}
                >
                    {method === 'phone' ? (
                        <PhoneSignIn onBack={() => { haptics.tap(); setMethod('choose'); }} />
                    ) : (
                        <Animated.View key="choose" entering={reduced ? undefined : FadeInLeft.duration(220)}>
                            <ModeSwitch mode={mode} onChange={switchMode} />

                            <Text style={TYPE.heading} className="text-text-primary">
                                {isSignUp ? 'Create your free account' : 'Welcome back'}
                            </Text>
                            <Text style={TYPE.caption} className="text-text-secondary mt-1 mb-5">
                                {isSignUp
                                    ? 'Takes under a minute. Pick whichever way is easiest.'
                                    : 'Sign in the same way you did last time.'}
                            </Text>

                            <ProviderButton
                                icon={<GoogleLogo size={18} />}
                                label="Continue with Google"
                                onPress={handleGoogle}
                                busy={busy && pending === 'google'}
                                disabled={busy}
                            />
                            <ProviderButton
                                icon={<Smartphone size={18} color={COLORS.text.primary} strokeWidth={1.8} />}
                                label="Continue with phone number"
                                onPress={() => { haptics.tap(); clearMessages(); setMethod('phone'); }}
                                disabled={busy}
                            />

                            <View className="flex-row items-center my-4">
                                <View className="flex-1 h-px bg-border" />
                                <Text style={TYPE.caption} className="text-text-tertiary mx-3">or with email</Text>
                                <View className="flex-1 h-px bg-border" />
                            </View>

                            {isSignUp && (
                                <Animated.View
                                    entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(200)}
                                    style={{ marginBottom: 12 }}
                                >
                                    <TextInput
                                        className={fieldClass('name') + ' text-base text-text-primary font-inter'}
                                        placeholder="Your name"
                                        placeholderTextColor={COLORS.text.tertiary}
                                        value={name}
                                        onChangeText={(t) => { setName(t); setFieldError(null); }}
                                        onFocus={() => setFocused('name')}
                                        onBlur={() => setFocused(null)}
                                        autoCapitalize="words"
                                        textContentType="name"
                                        autoComplete="name"
                                        returnKeyType="next"
                                        onSubmitEditing={() => emailRef.current?.focus()}
                                    />
                                </Animated.View>
                            )}

                            <View className="mb-3">
                                <TextInput
                                    ref={emailRef}
                                    className={fieldClass('email') + ' text-base text-text-primary font-inter'}
                                    placeholder="Email"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={email}
                                    onChangeText={(t) => { setEmail(t); setFieldError(null); }}
                                    onFocus={() => setFocused('email')}
                                    onBlur={() => setFocused(null)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType="emailAddress"
                                    autoComplete="email"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>

                            <View className="relative justify-center">
                                <TextInput
                                    ref={passwordRef}
                                    className={fieldClass('password') + ' text-base text-text-primary pr-12 font-inter'}
                                    placeholder={isSignUp ? 'Create a password' : 'Password'}
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setFieldError(null); }}
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType={isSignUp ? 'newPassword' : 'password'}
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    returnKeyType="go"
                                    onSubmitEditing={handleSubmit}
                                />
                                <TouchableOpacity
                                    className="absolute right-4 p-1"
                                    onPress={() => setShowPassword((v) => !v)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword
                                        ? <EyeOff size={19} color={COLORS.text.tertiary} />
                                        : <Eye size={19} color={COLORS.text.tertiary} />}
                                </TouchableOpacity>
                            </View>

                            {isSignUp && password.length > 0 && (
                                <Animated.View entering={FadeIn.duration(160)} style={{ marginTop: 10 }}>
                                    <View className="flex-row gap-1.5">
                                        {[1, 2, 3].map((i) => (
                                            <Animated.View
                                                key={i}
                                                style={{
                                                    flex: 1,
                                                    height: 4,
                                                    borderRadius: 2,
                                                    backgroundColor: strength.score >= i
                                                        ? strength.score === 1
                                                            ? COLORS.semantic.alertAmberFill
                                                            : COLORS.semantic.profit
                                                        : COLORS.surface.tertiary,
                                                    transitionProperty: ['backgroundColor'],
                                                    transitionDuration: reduced ? 0 : MOTION.quick,
                                                } as ViewStyle}
                                            />
                                        ))}
                                    </View>
                                    <Text style={TYPE.caption} className="text-text-tertiary mt-1.5">{strength.label}</Text>
                                </Animated.View>
                            )}

                            {!isSignUp && (
                                <TouchableOpacity
                                    onPress={handleForgotPassword}
                                    disabled={resetting}
                                    accessibilityRole="button"
                                    className="self-end mt-2.5"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Text style={TYPE.callout} className="text-brand-link">
                                        {resetting ? 'Sending...' : 'Forgot password?'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {resetNotice && (
                                <Animated.View
                                    entering={FadeIn.duration(180)}
                                    style={{ backgroundColor: COLORS.surface.tertiary, borderRadius: RADIUS.control, padding: 14, marginTop: 12 }}
                                >
                                    <Text style={TYPE.caption} className="text-text-secondary text-center">{resetNotice}</Text>
                                </Animated.View>
                            )}

                            {message && (
                                <Animated.View
                                    entering={FadeIn.duration(180)}
                                    style={{ backgroundColor: COLORS.semantic.lossBg, borderRadius: RADIUS.control, padding: 14, marginTop: 12 }}
                                    accessibilityLiveRegion="polite"
                                >
                                    <Text style={TYPE.caption} className="text-loss text-center">{message}</Text>
                                </Animated.View>
                            )}

                            <PressableScale
                                onPress={handleSubmit}
                                disabled={busy}
                                accessibilityRole="button"
                                containerStyle={{ marginTop: 20 }}
                                style={{
                                    backgroundColor: COLORS.brand.primaryDark,
                                    opacity: busy && pending !== 'email' ? 0.6 : 1,
                                    borderRadius: RADIUS.pill,
                                    height: 52,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {busy && pending === 'email' ? (
                                    <ActivityIndicator color={COLORS.brand.onAccent} />
                                ) : (
                                    <Text style={[TYPE.callout, { fontFamily: FONTS.semibold, color: COLORS.brand.onAccent }]}>
                                        {isSignUp ? 'Create account' : 'Sign in'}
                                    </Text>
                                )}
                            </PressableScale>

                            <Text style={TYPE.caption} className="text-text-tertiary text-center mt-5">
                                FinSight is educational. It holds no money and connects to no bank.
                            </Text>
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;
