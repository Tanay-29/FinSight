import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '../screens/FeedScreen';
import { VitalsScreen } from '../screens/VitalsScreen';
import { LearnScreen } from '../screens/LearnScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { COLORS } from '../theme/tokens';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BarChart2, Target, GraduationCap } from 'lucide-react-native';
import * as haptics from '../utils/haptics';

const Tab = createBottomTabNavigator();

// Typed Lucide icon wrapper so focused/unfocused opacity is applied consistently
const TabIcon: React.FC<{
    Icon: React.ComponentType<{ size: number; color: string }>;
    focused: boolean;
    color: string;
}> = ({ Icon, focused, color }) => (
    <View style={{ opacity: focused ? 1 : 0.5 }}>
        <Icon size={22} color={color} />
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
                    fontSize: 10,
                    fontWeight: '600',
                },
            }}
            // A light tick on every tab change, applied once here rather than
            // repeated on all four screens.
            screenListeners={{ tabPress: () => haptics.tap() }}
        >
            <Tab.Screen
                name="Feed"
                component={FeedScreen}
                options={{
                    tabBarLabel: 'Feed',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon Icon={Home} focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Vitals"
                component={VitalsScreen}
                options={{
                    tabBarLabel: 'Vitals',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon Icon={BarChart2} focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Goals"
                component={GoalsScreen}
                options={{
                    tabBarLabel: 'Goals',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon Icon={Target} focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Learn"
                component={LearnScreen}
                options={{
                    tabBarLabel: 'Learn',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon Icon={GraduationCap} focused={focused} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};