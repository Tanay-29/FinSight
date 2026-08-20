import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
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
import CuratedBasketScreen from '../screens/CuratedBasketScreen';
import ModuleReaderScreen from '../screens/ModuleReaderScreen';
import MoneyManagerScreen from '../screens/MoneyManagerScreen';
import SubscriptionTrackerScreen from '../screens/SubscriptionTrackerScreen';
import FlashcardScreen from '../screens/FlashcardScreen';
// Phase 1: Execution Layer Screens
import InvestScreen from '../screens/InvestScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import RoundUpScreen from '../screens/RoundUpScreen';
import BurnRateScreen from '../screens/BurnRateScreen';
// Social and shared
import SquadGoalsScreen from '../screens/SquadGoalsScreen';


const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user, isLoading, profile, profileLoading } = useSelector((state: RootState) => state.auth);

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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
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
                    <Stack.Screen name="CuratedBasket" component={CuratedBasketScreen} />
                    <Stack.Screen name="GoalAcceleration" component={GoalAccelerationScreen} />
                    <Stack.Screen name="MoneyManager" component={MoneyManagerScreen} />
                    <Stack.Screen name="SubscriptionTracker" component={SubscriptionTrackerScreen} />
                    <Stack.Screen name="Flashcards" component={FlashcardScreen} options={{ headerShown: false }} />
                    {/* Phase 1: Execution + Intelligence Layer */}
                    <Stack.Screen name="Invest" component={InvestScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="RoundUp" component={RoundUpScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="BurnRate" component={BurnRateScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="SquadGoals" component={SquadGoalsScreen} options={{ headerShown: false }} />
                    <Stack.Screen
                        name="AddTransaction"
                        component={AddTransactionScreen}
                        options={{ presentation: 'modal', headerShown: false }}
                    />
                    <Stack.Screen
                        name="LearnPathDetail"
                        component={LearnPathDetailScreen}
                        options={{ presentation: 'card', headerShown: false }}
                    />
                    <Stack.Screen
                        name="ModuleReader"
                        component={ModuleReaderScreen}
                        options={{ presentation: 'card', headerShown: false }}
                    />
                    <Stack.Screen
                        name="Profile"
                        component={ProfileScreen}
                        options={{ presentation: 'card', headerShown: false }}
                    />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
};