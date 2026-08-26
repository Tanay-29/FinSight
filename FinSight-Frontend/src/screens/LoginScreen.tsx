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
import { Eye, EyeOff } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUpUser, signInUser, clearError } from '../store/slices/authSlice';
import { sendPasswordReset } from '../services/authService';
import type { RootState, AppDispatch } from '../store/store';

const LoginScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetNotice, setResetNotice] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);

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

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-surface-primary"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 justify-center px-6">
                    {/* Logo / Brand */}
                    <View className="items-center mb-10">
                        <Text className="text-4xl font-bold text-brand-primary">
                            FinSight
                        </Text>
                        <Text className="text-base text-text-secondary mt-2">
                            Your Daily Money Mentor
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View className="bg-surface-secondary rounded-2xl p-6 shadow-md">
                        <Text className="text-2xl font-bold text-text-primary mb-6">
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </Text>

                        {/* Name (Sign Up only) */}
                        {isSignUp && (
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-text-secondary mb-1">
                                    Full Name
                                </Text>
                                <TextInput
                                    className="bg-surface-primary border border-border rounded-xl px-4 py-3 text-base text-text-primary"
                                    placeholder="Enter your name"
                                    placeholderTextColor="#9CA3AF"
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        {/* Email */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-text-secondary mb-1">
                                Email
                            </Text>
                            <TextInput
                                className="bg-surface-primary border border-border rounded-xl px-4 py-3 text-base text-text-primary"
                                placeholder="you@example.com"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Password */}
                        <View className="mb-6">
                            <Text className="text-sm font-medium text-text-secondary mb-1">
                                Password
                            </Text>
                            <View className="relative justify-center">
                                <TextInput
                                    className="bg-surface-primary border border-border rounded-xl pl-4 pr-12 py-3 text-base text-text-primary"
                                    placeholder="Min 6 characters"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType={isSignUp ? 'newPassword' : 'password'}
                                />
                                <TouchableOpacity
                                    className="absolute right-3 p-1"
                                    onPress={() => setShowPassword((v) => !v)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} color="#9CA3AF" />
                                    ) : (
                                        <Eye size={20} color="#9CA3AF" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {!isSignUp && (
                                <TouchableOpacity
                                    onPress={handleForgotPassword}
                                    disabled={resetting}
                                    accessibilityRole="button"
                                    className="self-end mt-2"
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Text className="text-sm font-medium text-brand-primary">
                                        {resetting ? 'Sending...' : 'Forgot password?'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {resetNotice && (
                            <View className="bg-surface-secondary border border-border rounded-xl p-3 mb-4">
                                <Text className="text-text-secondary text-sm text-center">
                                    {resetNotice}
                                </Text>
                            </View>
                        )}

                        {/* Error */}
                        {error && (
                            <View className="bg-loss-bg rounded-xl p-3 mb-4">
                                <Text className="text-loss-red text-sm text-center">
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            className={`rounded-xl py-4 items-center ${isLoading ? 'bg-brand-primary/50' : 'bg-brand-primary'
                                }`}
                            onPress={handleSubmit}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-semibold text-base">
                                    {isSignUp ? 'Sign Up' : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Toggle */}
                        <TouchableOpacity
                            className="mt-4 items-center py-2"
                            onPress={toggleMode}
                        >
                            <Text className="text-text-secondary text-sm">
                                {isSignUp
                                    ? 'Already have an account? '
                                    : "Don't have an account? "}
                                <Text className="text-brand-primary font-semibold">
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <Text className="text-xs text-text-tertiary text-center mt-8">
                        By continuing, you agree to our Terms of Service
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;
