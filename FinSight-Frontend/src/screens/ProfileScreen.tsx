import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Target, Bell, RefreshCw, Lock, Upload, Info,
    Trash2, Rocket, ChevronRight,
} from 'lucide-react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logOutUser } from '../store/slices/authSlice';

const SettingsRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}> = ({ icon, label, onPress, rightElement, danger }) => (
    <TouchableOpacity
        className="flex-row items-center px-4 py-3.5 border-b border-border"
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
    >
        <View className="w-8 h-8 rounded-lg bg-surface-secondary items-center justify-center mr-3">
            {icon}
        </View>
        <Text className={`text-base flex-1 ${danger ? 'text-loss' : 'text-text-primary'}`}>
            {label}
        </Text>
        {rightElement ?? <ChevronRight size={16} color="#9CA3AF" />}
    </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [autoTrackingEnabled, setAutoTrackingEnabled] = React.useState(true);

    const displayName = user?.displayName || 'Finance User';
    const email = user?.email || 'user@example.com';
    const initial = displayName.charAt(0).toUpperCase();

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logOutUser()) },
        ]);
    };

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
                            <View className="flex-row items-center mt-1.5">
                                <View className="bg-brand-primary/10 rounded-full px-3 py-1 flex-row items-center">
                                    <Rocket size={11} color="#6366F1" />
                                    <Text className="text-xs font-semibold text-brand-primary ml-1">
                                        Pro Member
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Primary Goal */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <View className="flex-row items-center mb-3">
                        <Target size={20} color="#6366F1" />
                        <Text className="text-lg font-semibold text-text-primary ml-2">
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

                    <SettingsRow
                        icon={<Bell size={16} color="#6B7280" />}
                        label="Notifications"
                        onPress={undefined}
                        rightElement={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                                thumbColor={notificationsEnabled ? '#6366F1' : '#9CA3AF'}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<RefreshCw size={16} color="#6B7280" />}
                        label="Auto Expense Tracking"
                        onPress={undefined}
                        rightElement={
                            <Switch
                                value={autoTrackingEnabled}
                                onValueChange={setAutoTrackingEnabled}
                                trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                                thumbColor={autoTrackingEnabled ? '#6366F1' : '#9CA3AF'}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<Lock size={16} color="#6B7280" />}
                        label="Privacy & Data"
                        onPress={() => {}}
                    />
                    <SettingsRow
                        icon={<Upload size={16} color="#6B7280" />}
                        label="Export Data (JSON)"
                        onPress={() => Alert.alert('Export Data', 'Your data will be exported as JSON.')}
                    />
                    <SettingsRow
                        icon={<Info size={16} color="#6B7280" />}
                        label="About FinSight"
                        onPress={() => {}}
                    />
                    <SettingsRow
                        icon={<Trash2 size={16} color="#EF4444" />}
                        label="Delete Account"
                        danger
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
                    />
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    className="mx-4 mt-4 bg-white border border-border rounded-xl p-4 items-center"
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Text className="text-base font-semibold text-loss">Sign Out</Text>
                </TouchableOpacity>

                {/* App Info */}
                <View className="items-center py-6">
                    <Text className="text-xs text-text-tertiary">FinSight v1.0.0</Text>
                    <Text className="text-xs text-text-tertiary">Made with care in India</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
