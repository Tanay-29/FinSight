import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '../screens/FeedScreen';
import { VitalsScreen } from '../screens/VitalsScreen';
import { LearnScreen } from '../screens/LearnScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { COLORS } from '../theme/tokens';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

const TabIcon: React.FC<{ emoji: string; focused: boolean }> = ({ emoji, focused }) => (
    <View className={`items-center justify-center ${focused ? 'opacity-100' : 'opacity-50'}`}>
        <Text className="text-xl">{emoji}</Text>
    </View>
);

export const BottomTabs: React.FC = () => {
    const insets = useSafeAreaInsets();
    
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.brand.primary,
                tabBarInactiveTintColor: COLORS.text.tertiary,
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border.default,
                    height: (Platform.OS === 'ios' ? 85 : 65) + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: (Platform.OS === 'ios' ? 25 : 10) + insets.bottom,
                },
                tabBarLabelStyle: {
                    fontSize: 9,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Feed"
                component={FeedScreen}
                options={{
                    tabBarLabel: 'Feed',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Vitals"
                component={VitalsScreen}
                options={{
                    tabBarLabel: 'Vitals',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Goals"                                    // ← NEW TAB
                component={GoalsScreen}
                options={{
                    tabBarLabel: 'Goals',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Learn"
                component={LearnScreen}
                options={{
                    tabBarLabel: 'Learn',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🎓" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarButton: () => null,
                }}
            />
        </Tab.Navigator>
    );
};