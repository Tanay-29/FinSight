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
 * Motion is deliberately thin. The sheet arrives once per session, so it gets
 * an entrance; buttons dip under the finger, because on mobile that is the only
 * confirmation a control can give; the name field slides in when you switch to
 * signing up, because a field appearing from nowhere is jarring. Nothing else
 * moves.
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
import Animated, {
    FadeIn,
    FadeInDown,
    LinearTransition,
    useReducedMotion,
} from 'react-native-reanimated';
import { Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUpUser, signInUser, clearError } from '../store/slices/authSlice';
import { sendPasswordReset } from '../services/authService';
import { PressableScale } from '../components/PressableScale';
import type { RootState, AppDispatch } from '../store/store';

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

    /** Border colour is the only thing that marks focus, and it costs nothing. */
    const fieldClass = (key: string) =>
        `bg-surface-secondary rounded-2xl px-4 py-3.5 border ${
            focused === key ? 'border-brand-primary' : 'border-transparent'
        }`;

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-brand-primary"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                    className="px-7 pt-16 pb-9"
                >
                    <View className="flex-row items-center mb-5">
                        <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-2.5">
                            <Sparkles size={18} color="#FFFFFF" />
                        </View>
                        <Text className="text-white text-lg font-bold tracking-tight">FinSight</Text>
                    </View>

                    <Text className="text-white text-[32px] leading-10 font-bold tracking-tight mb-3">
                        Paste a bank text.{'\n'}See where it went.
                    </Text>
                    <Text className="text-indigo-100 text-[15px] leading-6">
                        Built for students who want to know where the money goes,
                        without a spreadsheet.
                    </Text>
                </Animated.View>

                {/* The sheet. Rises once, then never moves again. */}
                <Animated.View
                    entering={reduced ? FadeIn.duration(220) : FadeInDown.duration(420).springify().damping(18)}
                    layout={LinearTransition.duration(220)}
                    className="flex-1 bg-surface-primary rounded-t-[32px] px-7 pt-7 pb-10"
                >
                    <View className="flex-row items-baseline justify-between mb-6">
                        <Text className="text-[22px] font-bold text-text-primary tracking-tight">
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </Text>
                        <TouchableOpacity onPress={toggleMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text className="text-sm font-semibold text-brand-primary">
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isSignUp && (
                        <Animated.View
                            entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(260)}
                            layout={LinearTransition.duration(220)}
                            className="mb-3"
                        >
                            <TextInput
                                className={fieldClass('name') + ' text-base text-text-primary'}
                                placeholder="Your name"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                onFocus={() => setFocused('name')}
                                onBlur={() => setFocused(null)}
                                autoCapitalize="words"
                                textContentType="name"
                            />
                        </Animated.View>
                    )}

                    <Animated.View layout={LinearTransition.duration(220)} className="mb-3">
                        <TextInput
                            className={fieldClass('email') + ' text-base text-text-primary'}
                            placeholder="Email"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused(null)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                        />
                    </Animated.View>

                    <Animated.View layout={LinearTransition.duration(220)} className="mb-2">
                        <View className="relative justify-center">
                            <TextInput
                                className={fieldClass('password') + ' text-base text-text-primary pr-12'}
                                placeholder={isSignUp ? 'Password, at least 6 characters' : 'Password'}
                                placeholderTextColor="#9CA3AF"
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
                                    ? <EyeOff size={19} color="#9CA3AF" />
                                    : <Eye size={19} color="#9CA3AF" />}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {!isSignUp && (
                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            disabled={resetting}
                            accessibilityRole="button"
                            className="self-end mb-1"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text className="text-sm font-medium text-brand-primary">
                                {resetting ? 'Sending...' : 'Forgot password?'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {resetNotice && (
                        <Animated.View
                            entering={FadeIn.duration(180)}
                            className="bg-surface-secondary rounded-xl p-3 mt-3"
                        >
                            <Text className="text-text-secondary text-sm text-center">{resetNotice}</Text>
                        </Animated.View>
                    )}

                    {error && (
                        <Animated.View
                            entering={FadeIn.duration(180)}
                            className="bg-loss-bg rounded-xl p-3 mt-3"
                        >
                            <Text className="text-loss text-sm text-center">{error}</Text>
                        </Animated.View>
                    )}

                    <PressableScale
                        onPress={handleSubmit}
                        disabled={isLoading}
                        accessibilityRole="button"
                        className={`rounded-2xl py-4 items-center mt-5 ${isLoading ? 'bg-brand-primary/60' : 'bg-brand-primary'}`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-bold text-base">
                                {isSignUp ? 'Create account' : 'Sign in'}
                            </Text>
                        )}
                    </PressableScale>

                    <Text className="text-xs text-text-tertiary text-center mt-5 leading-5">
                        FinSight is educational. It holds no money and connects to no bank.
                    </Text>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;
