import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { COLORS } from '../theme/tokens';
import { onAuthChange } from '../services/authService';
import { setUser, fetchUserProfile } from '../store/slices/authSlice';
import type { AppDispatch, RootState } from '../store/store';

// Screens
import GoalAccelerationScreen from '../screens/GoalAccelerationScreen';
import LoginScreen from '../screens/LoginScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import { LearnPathDetailScreen } from '../screens/LearnPathDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BottomTabs } from './BottomTabs';
import OnboardingScreen from '../screens/OnboardingScreen';
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
    const { user, isLoading, profile, profileLoading } = useSelector((state: RootState) => state.auth);
    const reduced = useReducedMotion();

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

    // Show spinner while Firebase is restoring session or profile is loading
    if (isLoading || (user && profileLoading)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface.primary }}>
                <ActivityIndicator size="large" color="#6366F1" />
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
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
};