import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { View, ActivityIndicator } from 'react-native';
import { onAuthChange } from '../services/authService';
import { setUser } from '../store/slices/authSlice';
import type { RootState } from '../store/store';

// Screens
import GoalAccelerationScreen from '../screens/GoalAccelerationScreen';
import LoginScreen from '../screens/LoginScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import { LearnPathDetailScreen } from '../screens/LearnPathDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BottomTabs } from './BottomTabs';
import OnboardingScreen from '../screens/OnboardingScreen'; 
import CuratedBasketScreen from '../screens/CuratedBasketScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const dispatch = useDispatch();
    const { user, isLoading } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        const unsubscribe = onAuthChange((firebaseUser) => {
            if (firebaseUser) {
                dispatch(setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                }));
            } else {
                dispatch(setUser(null));
            }
        });
        return unsubscribe;
    }, [dispatch]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <Stack.Group>
                    {/* 1. MainTabs is FIRST, so it becomes the default home screen */}
                    <Stack.Screen name="MainTabs" component={BottomTabs} />
                    
                    {/* 2. Register standalone screens so we can route to them! */}
                    <Stack.Screen name="CuratedBasket" component={CuratedBasketScreen} />
                    <Stack.Screen name="GoalAcceleration" component={GoalAccelerationScreen} />
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    
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
                        name="Profile"
                        component={ProfileScreen}
                        options={{ presentation: 'card', headerShown: false }}
                    />
                </Stack.Group>

            ) : (
                <Stack.Screen name="Login" component={LoginScreen} />
            )}
        </Stack.Navigator>
    );
};