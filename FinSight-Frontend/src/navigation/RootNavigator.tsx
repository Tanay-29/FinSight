import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { COLORS } from '../theme/tokens';
import { onAuthChange } from '../services/authService';
import { setUser, fetchUserProfile } from '../store/slices/authSlice';
import { setEntitlement } from '../store/slices/premiumSlice';
import type { AppDispatch, RootState } from '../store/store';

// Screens
import GoalAccelerationScreen from '../screens/GoalAccelerationScreen';
import LoginScreen from '../screens/LoginScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import { LearnPathDetailScreen } from '../screens/LearnPathDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BottomTabs } from './BottomTabs';
import OnboardingScreen from '../screens/OnboardingScreen';
import PaywallScreen from '../screens/PaywallScreen';
import ModuleReaderScreen from '../screens/ModuleReaderScreen';
import MoneyManagerScreen from '../screens/MoneyManagerScreen';
import SubscriptionTrackerScreen from '../screens/SubscriptionTrackerScreen';
import FlashcardScreen from '../screens/FlashcardScreen';
// Phase 1: Execution Layer Screens
import BurnRateScreen from '../screens/BurnRateScreen';
// Engagement features
import TimeMachineScreen from '../screens/TimeMachineScreen';
import GuessSpendScreen from '../screens/GuessSpendScreen';
import SwipeCategoriseScreen from '../screens/SwipeCategoriseScreen';
// Social and shareable


const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user, isLoading, profile, profileLoading, profileSettled, profileError } =
        useSelector((state: RootState) => state.auth);
    const reduced = useReducedMotion();

    // Mirror the stored entitlement into the slice so a restart, or a second
    // device, knows what this account has without waiting for a purchase.
    useEffect(() => {
        dispatch(setEntitlement(profile?.premium ?? null));
    }, [dispatch, profile?.premium]);

    useEffect(() => {
        const unsubscribe = onAuthChange((firebaseUser) => {
            if (firebaseUser) {
                dispatch(setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                }));
                // Fetch Firestore profile to check onboardingComplete flag
                dispatch(fetchUserProfile(firebaseUser.uid));
            } else {
                dispatch(setUser(null));
            }
        });
        return unsubscribe;
    }, [dispatch]);

    // Block only on the very first profile read.
    //
    // This used to be `user && profileLoading`, which meant any mid-session
    // refresh replaced the whole navigator with a spinner. Finishing a module
    // refetches the profile to pick up the new streak, so the stack was torn
    // down and rebuilt at the tabs the moment a quiz ended: the results screen
    // vanished, and with it the only route to the flashcards.
    const awaitingFirstProfile = Boolean(user) && !profileSettled && profileLoading;

    if (isLoading || awaitingFirstProfile) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface.primary }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    // A profile that could not be read is not a profile that does not exist.
    // Sending this user to onboarding would overwrite the real one.
    if (user && !profile && profileError) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface.primary, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text.primary, textAlign: 'center' }}>
                    Could not load your account
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                    {profileError}
                </Text>
                <Pressable
                    onPress={() => dispatch(fetchUserProfile(user.uid))}
                    style={{ marginTop: 20, backgroundColor: COLORS.brand.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 }}
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Try again</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                // Without an explicit background the native stack composites each
                // push over the window's own colour, which flashes on Android.
                contentStyle: { backgroundColor: COLORS.surface.primary },
                // The platform's own push is the right transition. Reduced motion
                // keeps the change legible but drops the travel.
                animation: reduced ? 'fade' : 'default',
            }}
        >
            {!user ? (
                // ── Not logged in ─────────────────────────────────────────
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : !profile?.onboardingComplete ? (
                // ── Logged in but onboarding not completed ────────────────
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : (
                // ── Fully onboarded user ──────────────────────────────────
                <Stack.Group>
                    <Stack.Screen name="MainTabs" component={BottomTabs} />
                    <Stack.Screen name="GoalAcceleration" component={GoalAccelerationScreen} />
                    <Stack.Screen name="MoneyManager" component={MoneyManagerScreen} />
                    <Stack.Screen name="SubscriptionTracker" component={SubscriptionTrackerScreen} />
                    <Stack.Screen name="Flashcards" component={FlashcardScreen} />
                    {/* Phase 1: Execution + Intelligence Layer */}
                    <Stack.Screen name="BurnRate" component={BurnRateScreen} />
                    <Stack.Screen name="TimeMachine" component={TimeMachineScreen} />
                    <Stack.Screen name="GuessSpend" component={GuessSpendScreen} />
                    <Stack.Screen name="SwipeCategorise" component={SwipeCategoriseScreen} />
                    <Stack.Screen
                        name="AddTransaction"
                        component={AddTransactionScreen}
                        options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen name="LearnPathDetail" component={LearnPathDetailScreen} />
                    <Stack.Screen name="ModuleReader" component={ModuleReaderScreen} />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                    {/* Presented as a sheet: it interrupts what the user was
                        doing and should look like it can be dismissed. */}
                    <Stack.Screen
                        name="Paywall"
                        component={PaywallScreen}
                        options={{ presentation: 'modal' }}
                    />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
};