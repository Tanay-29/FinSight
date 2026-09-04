import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { TrendingUp } from 'lucide-react-native';
import { FONTS, COLORS, TYPE, RADIUS, SPACING } from '../theme/tokens';
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
import IntroScreen from '../screens/IntroScreen';
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

/**
 * Whether the three intro panels have been seen.
 *
 * Kept in AsyncStorage rather than on the profile because these run before
 * anyone has signed in, so there is no profile to write to yet. Undefined
 * means the answer has not been read off disk, which is different from false
 * and has to stay different, or the panels flash at returning users on every
 * launch.
 */
const INTRO_SEEN_KEY = 'finsight:intro-seen';

export const RootNavigator = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user, isLoading, profile, profileLoading, profileSettled, profileError } =
        useSelector((state: RootState) => state.auth);
    const reduced = useReducedMotion();
    const [introSeen, setIntroSeen] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        AsyncStorage.getItem(INTRO_SEEN_KEY)
            .then((v) => setIntroSeen(v === '1'))
            // A storage read that fails should not trap anyone on the intro.
            .catch(() => setIntroSeen(true));
    }, []);

    const dismissIntro = () => {
        setIntroSeen(true);
        AsyncStorage.setItem(INTRO_SEEN_KEY, '1').catch(() => { });
    };

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

    // Hold the spinner until the intro flag is known too, or the panels appear
    // for a frame and vanish.
    if (isLoading || awaitingFirstProfile || introSeen === undefined) {
        // App.tsx deliberately holds the native splash until Inter is in, so
        // that launch has no seam in it. This used to undo that: a bare
        // spinner on a flat white background, which read as a second,
        // different app starting one frame after the first one finished. It
        // carries the splash's mark and colour instead, so the two moments
        // are one moment.
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: COLORS.brand.primaryDark,
                }}
            >
                <View
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: RADIUS.pill - 6,
                        backgroundColor: 'rgba(255,255,255,0.16)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TrendingUp size={30} color={COLORS.text.inverse} strokeWidth={1.8} />
                </View>
                <Text
                    style={{
                        ...TYPE.heading,
                        color: COLORS.text.inverse,
                        marginTop: SPACING[4],
                    }}
                >
                    FinSight
                </Text>
                <ActivityIndicator
                    size="small"
                    color="rgba(255,255,255,0.75)"
                    style={{ marginTop: SPACING[5] }}
                />
            </View>
        );
    }

    // A profile that could not be read is not a profile that does not exist.
    // Sending this user to onboarding would overwrite the real one.
    if (user && !profile && profileError) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface.secondary, paddingHorizontal: SPACING[8] }}>
                <Text style={{ ...TYPE.heading, color: COLORS.text.primary, textAlign: 'center' }}>
                    Could not load your account
                </Text>
                <Text style={{ ...TYPE.body, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING[2] }}>
                    {profileError}
                </Text>
                <Pressable
                    onPress={() => dispatch(fetchUserProfile(user.uid))}
                    style={{ marginTop: SPACING[5], backgroundColor: COLORS.brand.primaryDark, paddingHorizontal: SPACING[8], paddingVertical: SPACING[3], borderRadius: RADIUS.pill }}
                >
                    <Text style={{ ...TYPE.callout, fontFamily: FONTS.semibold, color: COLORS.text.inverse }}>Try again</Text>
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
                contentStyle: { backgroundColor: COLORS.surface.secondary },
                // The platform's own push is the right transition. Reduced motion
                // keeps the change legible but drops the travel.
                animation: reduced ? 'fade' : 'default',
            }}
        >
            {!user && !introSeen ? (
                // ── First run, before anyone has signed in ────────────────
                <Stack.Screen name="Intro">
                    {() => <IntroScreen onDone={dismissIntro} />}
                </Stack.Screen>
            ) : !user ? (
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