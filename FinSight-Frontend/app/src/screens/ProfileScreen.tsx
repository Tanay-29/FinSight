import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../store/hooks';

export const ProfileScreen: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [autoTrackingEnabled, setAutoTrackingEnabled] = React.useState(true);

    const displayName = user?.displayName || 'Finance User';
    const email = user?.email || 'user@example.com';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                {/* Header */}
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-2xl font-bold text-text-primary">Profile</Text>
                </View>

                {/* User Card */}
                <View className="mx-4 mt-3 bg-white border border-border rounded-xl p-4">
                    <View className="flex-row items-center">
                        <View className="w-16 h-16 rounded-full bg-brand-primary items-center justify-center mr-4">
                            <Text className="text-2xl text-white font-bold">{initial}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold text-text-primary">{displayName}</Text>
                            <Text className="text-sm text-text-secondary">{email}</Text>
                            <View className="flex-row items-center mt-1">
                                <View className="bg-brand-primary-light/20 rounded-full px-3 py-1">
                                    <Text className="text-xs font-semibold text-brand-primary">
                                        Pro Member 🚀
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Financial Goal */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <View className="flex-row items-center mb-3">
                        <Text className="text-lg mr-2">🎯</Text>
                        <Text className="text-lg font-semibold text-text-primary">
                            Primary Goal
                        </Text>
                    </View>
                    <View className="bg-profit-bg rounded-xl p-4">
                        <Text className="text-base font-semibold text-text-primary mb-1">
                            Emergency Fund
                        </Text>
                        <Text className="text-sm text-text-secondary mb-3">
                            Target: ₹50,000 by June 2026
                        </Text>
                        <View className="h-2 bg-white rounded-full overflow-hidden">
                            <View className="h-full bg-profit rounded-full" style={{ width: '35%' }} />
                        </View>
                        <Text className="text-xs text-text-tertiary mt-1" style={{ fontVariant: ['tabular-nums'] }}>
                            ₹17,500 / ₹50,000 (35%)
                        </Text>
                    </View>
                </View>

                {/* Settings */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl overflow-hidden">
                    <View className="px-4 py-3 border-b border-border">
                        <Text className="text-lg font-semibold text-text-primary">Settings</Text>
                    </View>

                    {/* Notifications */}
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                        <View className="flex-row items-center">
                            <Text className="text-base mr-3">🔔</Text>
                            <Text className="text-base text-text-primary">Notifications</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                            thumbColor={notificationsEnabled ? '#6366F1' : '#9CA3AF'}
                        />
                    </View>

                    {/* Auto Tracking */}
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                        <View className="flex-row items-center">
                            <Text className="text-base mr-3">🔄</Text>
                            <Text className="text-base text-text-primary">Auto Expense Tracking</Text>
                        </View>
                        <Switch
                            value={autoTrackingEnabled}
                            onValueChange={setAutoTrackingEnabled}
                            trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                            thumbColor={autoTrackingEnabled ? '#6366F1' : '#9CA3AF'}
                        />
                    </View>

                    {/* Privacy */}
                    <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-border">
                        <Text className="text-base mr-3">🔒</Text>
                        <Text className="text-base text-text-primary flex-1">Privacy & Data</Text>
                        <Text className="text-text-tertiary">→</Text>
                    </TouchableOpacity>

                    {/* Export Data */}
                    <TouchableOpacity
                        className="flex-row items-center px-4 py-3 border-b border-border"
                        onPress={() => Alert.alert('Export Data', 'Your data will be exported as JSON.')}
                    >
                        <Text className="text-base mr-3">📤</Text>
                        <Text className="text-base text-text-primary flex-1">Export Data (JSON)</Text>
                        <Text className="text-text-tertiary">→</Text>
                    </TouchableOpacity>

                    {/* About */}
                    <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-border">
                        <Text className="text-base mr-3">ℹ️</Text>
                        <Text className="text-base text-text-primary flex-1">About FinSight</Text>
                        <Text className="text-text-tertiary">→</Text>
                    </TouchableOpacity>

                    {/* Delete Account */}
                    <TouchableOpacity
                        className="flex-row items-center px-4 py-3"
                        onPress={() =>
                            Alert.alert(
                                'Delete Account',
                                'This will permanently delete all your data. This action cannot be undone.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive' },
                                ]
                            )
                        }
                    >
                        <Text className="text-base mr-3">🗑️</Text>
                        <Text className="text-base text-loss flex-1">Delete Account</Text>
                        <Text className="text-text-tertiary">→</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View className="items-center py-6">
                    <Text className="text-xs text-text-tertiary">FinSight v1.0.0</Text>
                    <Text className="text-xs text-text-tertiary">Made with ❤️ in India</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
