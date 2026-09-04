/**
 * LoginScreen
 *
 * The first screen anyone sees, and it used to be a grey card floating in the
 * middle of white with a title above it. Nothing wrong, nothing memorable, and
 * it told a student nothing about why this app is worth an account.
 *
 * The structure now is a coloured field that owns the top of the screen and a
 * white sheet that rises into the bottom two thirds, so the form reads as
 * something that came to you rather than a box sitting in space. The claim at
 * the top is concrete, not a tagline: it names what the app does with a
 * pasted bank message, which is the one thing here nothing else does.
 *
 * Motion is deliberately thin, and thinner than it first was. The sheet arrives
 * once per session, the name field slides in when you switch to signing up, and
 * buttons dip under the finger. Nothing else moves.
 *
 * In particular there are no layout animations. Putting LinearTransition on the
 * sheet and on each field meant that showing a validation error, which makes the
 * sheet taller, animated every field to its new position at once, and the whole
 * form shuffled. An error should appear. The form around it should hold still.
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Eye, EyeOff, TrendingUp } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUpUser, signInUser, clearError } from '../store/slices/authSlice';
import { sendPasswordReset } from '../services/authService';
import { PressableScale } from '../components/PressableScale';
import type { RootState, AppDispatch } from '../store/store';
import { COLORS, TYPE, RADIUS, GUTTER, FONTS } from '../theme/tokens';

const LoginScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);
    const reduced = useReducedMotion();

    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetNotice, setResetNotice] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);

    const handleSubmit = () => {
        if (isSignUp) {
            dispatch(signUpUser({ email, password, name }));
        } else {
            dispatch(signInUser({ email, password }));
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setShowPassword(false);
        setResetNotice(null);
        dispatch(clearError());
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setResetNotice('Enter your email address above first.');
            return;
        }
        setResetting(true);
        dispatch(clearError());
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
                    style={{ paddingHorizontal: GUTTER, paddingTop: 64, paddingBottom: 36 }}
                >
                    <View className="flex-row items-center mb-5">
                        <View className="w-9 h-9 bg-white/20 items-center justify-center mr-2.5" style={{ borderRadius: RADIUS.tile }}>
                            <TrendingUp size={18} color={COLORS.text.inverse} strokeWidth={1.8} />
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
                    entering={reduced ? FadeIn.duration(220) : FadeInDown.duration(380)}
                    className="flex-1 bg-surface-primary" style={{ borderTopLeftRadius: RADIUS.pill, borderTopRightRadius: RADIUS.pill, paddingHorizontal: GUTTER, paddingTop: 28, paddingBottom: 40 }}
                >
                    <View className="flex-row items-baseline justify-between mb-6">
                        <Text style={TYPE.heading} className="text-text-primary">
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </Text>
                        <TouchableOpacity onPress={toggleMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-brand-primary-dark">
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isSignUp && (
                        <Animated.View
                            entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(260)}
                            className="mb-3"
                        >
                            <TextInput
                                className={fieldClass('name') + ' text-base text-text-primary font-inter'}
                                placeholder="Your name"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={name}
                                onChangeText={setName}
                                onFocus={() => setFocused('name')}
                                onBlur={() => setFocused(null)}
                                autoCapitalize="words"
                                textContentType="name"
                            />
                        </Animated.View>
                    )}

                    <View className="mb-3">
                        <TextInput
                            className={fieldClass('email') + ' text-base text-text-primary font-inter'}
                            placeholder="Email"
                            placeholderTextColor={COLORS.text.tertiary}
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused(null)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                        />
                    </View>

                    <View className="mb-2">
                        <View className="relative justify-center">
                            <TextInput
                                className={fieldClass('password') + ' text-base text-text-primary pr-12 font-inter'}
                                placeholder={isSignUp ? 'Password, at least 6 characters' : 'Password'}
                                placeholderTextColor={COLORS.text.tertiary}
                                value={password}
                                onChangeText={setPassword}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType={isSignUp ? 'newPassword' : 'password'}
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
                    </View>

                    {!isSignUp && (
                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            disabled={resetting}
                            accessibilityRole="button"
                            className="self-end mb-1"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={TYPE.callout} className="text-brand-primary-dark">
                                {resetting ? 'Sending...' : 'Forgot password?'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {resetNotice && (
                        <Animated.View
                            entering={FadeIn.duration(180)}
                            className="bg-surface-tertiary rounded-control p-3.5 mt-3"
                        >
                            <Text style={TYPE.caption} className="text-text-secondary text-center">{resetNotice}</Text>
                        </Animated.View>
                    )}

                    {error && (
                        <Animated.View
                            entering={FadeIn.duration(180)}
                            className="bg-loss-bg rounded-control p-3.5 mt-3"
                        >
                            <Text style={TYPE.caption} className="text-loss text-center">{error}</Text>
                        </Animated.View>
                    )}

                    <PressableScale
                        onPress={handleSubmit}
                        disabled={isLoading}
                        accessibilityRole="button"
                        style={{
                            backgroundColor: COLORS.brand.primaryDark,
                            opacity: isLoading ? 0.6 : 1,
                            borderRadius: RADIUS.pill,
                            height: 52,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 20,
                        }}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.text.inverse} />
                        ) : (
                            <Text style={[TYPE.callout, { fontFamily: FONTS.semibold }]} className="text-white">
                                {isSignUp ? 'Create account' : 'Sign in'}
                            </Text>
                        )}
                    </PressableScale>

                    <Text style={TYPE.caption} className="text-text-tertiary text-center mt-5">
                        FinSight is educational. It holds no money and connects to no bank.
                    </Text>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;
