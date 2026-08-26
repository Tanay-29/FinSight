/**
 * ProfileScreen
 *
 * Every row here does real work: preferences persist to Firestore, the export
 * writes an actual file, and deleting the account really deletes it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import {
    Target, Bell, RefreshCw, Lock, Upload, Info,
    Trash2, Flame, ChevronRight, Sparkles,
} from 'lucide-react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logOutUser, updatePreferences, deleteUserAccount } from '../store/slices/authSlice';
import { fetchGoals } from '../store/slices/goalsSlice';
import { goalIcon } from '../theme/icons';
import { exportUserData } from '../services/exportService';
import * as haptics from '../utils/haptics';

const SettingsRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    hint?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
}> = ({ icon, label, hint, onPress, rightElement, danger, disabled }) => (
    <TouchableOpacity
        className="flex-row items-center px-4 py-3.5 border-b border-border"
        onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined}
        disabled={disabled || !onPress}
        activeOpacity={onPress ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={disabled ? { opacity: 0.5 } : undefined}
    >
        <View className="w-8 h-8 rounded-lg bg-surface-secondary items-center justify-center mr-3">
            {icon}
        </View>
        <View className="flex-1">
            <Text className={`text-base ${danger ? 'text-loss' : 'text-text-primary'}`}>
                {label}
            </Text>
            {hint ? <Text className="text-xs text-text-tertiary mt-0.5">{hint}</Text> : null}
        </View>
        {rightElement ?? <ChevronRight size={16} color="#9CA3AF" />}
    </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, profile } = useAppSelector((state) => state.auth);
    const goals = useAppSelector((state) => state.goals.items);
    const dispatch = useAppDispatch();

    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const displayName = user?.displayName || profile?.name || 'Finance User';
    const email = user?.email || profile?.email || '';
    const initial = displayName.charAt(0).toUpperCase();
    const streak = profile?.streak ?? 0;

    // Preferences come from Firestore, defaulting to on for a fresh profile.
    const notificationsEnabled = profile?.preferences?.notifications ?? true;
    const autoTrackingEnabled = profile?.preferences?.autoTracking ?? true;

    useEffect(() => {
        // fetchGoals reads the uid from state itself.
        if (user?.uid) dispatch(fetchGoals());
    }, [dispatch, user?.uid]);

    /** The goal closest to completion that is not finished yet. */
    const primaryGoal = useMemo(() => {
        const open = goals.filter((g) => g.savedAmount < g.targetAmount);
        const pool = open.length > 0 ? open : goals;
        return [...pool].sort(
            (a, b) => b.savedAmount / b.targetAmount - a.savedAmount / a.targetAmount
        )[0];
    }, [goals]);

    const setPreference = (changes: { notifications?: boolean; autoTracking?: boolean }) => {
        if (!user?.uid) return;
        haptics.select();
        dispatch(updatePreferences({ uid: user.uid, changes }));
    };

    const handleExport = async () => {
        if (!user?.uid || exporting) return;
        setExporting(true);
        try {
            const result = await exportUserData(user.uid);
            if (!result.shared) {
                Alert.alert('Export saved', `Sharing is unavailable on this device. The file was written to:\n\n${result.uri}`);
            }
        } catch (error: any) {
            Alert.alert('Export failed', error?.message || 'Could not export your data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logOutUser()) },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This permanently deletes your profile, transactions, budgets, goals and learning progress. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        const result = await dispatch(deleteUserAccount());
                        setDeleting(false);
                        if (deleteUserAccount.rejected.match(result)) {
                            Alert.alert('Could not delete account', result.payload as string);
                        }
                    },
                },
            ]
        );
    };

    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

    const handleAbout = () => {
        Alert.alert(
            'About FinSight',
            `Version ${appVersion}\n\nA financial literacy and personal finance app for Indian students. All investing features are simulated: no real money moves at any point.`
        );
    };

    const handlePrivacy = () => {
        Alert.alert(
            'Privacy and Data',
            'Your transactions, budgets and goals are stored in your own Firebase account and are readable only by you.\n\nMarket data and AI coaching are generated on our server, which never stores your data. Use Export Data to take a copy, or Delete Account to remove everything.'
        );
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
                            {email ? <Text className="text-sm text-text-secondary">{email}</Text> : null}
                            <View className="flex-row items-center mt-1.5">
                                <View className="bg-brand-primary/10 rounded-full px-3 py-1 flex-row items-center">
                                    <Flame size={11} color="#6366F1" />
                                    <Text className="text-xs font-semibold text-brand-primary ml-1">
                                        {streak > 0 ? `${streak} day streak` : 'No streak yet'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Primary Goal, read from the user's real goals */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl p-4">
                    <View className="flex-row items-center mb-3">
                        <Target size={20} color="#6366F1" />
                        <Text className="text-lg font-semibold text-text-primary ml-2">
                            Primary Goal
                        </Text>
                    </View>

                    {primaryGoal ? (
                        <View className="bg-profit-bg rounded-xl p-4">
                            <View className="flex-row items-center mb-1">
                                {React.createElement(goalIcon(primaryGoal.icon), {
                                    size: 16,
                                    color: primaryGoal.color,
                                })}
                                <Text className="text-base font-semibold text-text-primary ml-2">
                                    {primaryGoal.title}
                                </Text>
                            </View>
                            <Text className="text-sm text-text-secondary mb-3">
                                Target: ₹{primaryGoal.targetAmount.toLocaleString('en-IN')}
                            </Text>
                            <View className="h-2 bg-white rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-profit rounded-full"
                                    style={{
                                        width: `${Math.min(
                                            (primaryGoal.savedAmount / primaryGoal.targetAmount) * 100,
                                            100
                                        )}%`,
                                    }}
                                />
                            </View>
                            <Text
                                className="text-xs text-text-tertiary mt-1"
                                style={{ fontVariant: ['tabular-nums'] }}
                            >
                                ₹{primaryGoal.savedAmount.toLocaleString('en-IN')} / ₹
                                {primaryGoal.targetAmount.toLocaleString('en-IN')} (
                                {Math.round((primaryGoal.savedAmount / primaryGoal.targetAmount) * 100)}%)
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-surface-secondary rounded-xl p-4">
                            <Text className="text-sm text-text-secondary">
                                No goals yet. Create one from the Goals tab to see your progress here.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Year in review. A look back at the account belongs beside
                    the account, not in the middle of this month's numbers. */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Wrapped' as never)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Open your year in review"
                    className="mx-4 mt-4 flex-row items-center bg-white border border-border rounded-xl px-4 py-3.5"
                >
                    <View className="w-10 h-10 rounded-full bg-violet-50 items-center justify-center mr-3">
                        <Sparkles color="#8B5CF6" size={18} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-semibold text-text-primary">Your Year in Review</Text>
                        <Text className="text-xs text-text-secondary mt-0.5">
                            What your money did over the last twelve months
                        </Text>
                    </View>
                    <ChevronRight color="#D1D5DB" size={18} />
                </TouchableOpacity>

                {/* Settings */}
                <View className="mx-4 mt-4 bg-white border border-border rounded-xl overflow-hidden">
                    <View className="px-4 py-3 border-b border-border">
                        <Text className="text-lg font-semibold text-text-primary">Settings</Text>
                    </View>

                    <SettingsRow
                        icon={<Bell size={16} color="#6B7280" />}
                        label="Budget Alerts"
                        hint="Warn me when a category nears its limit"
                        rightElement={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={(v) => setPreference({ notifications: v })}
                                trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                                thumbColor={notificationsEnabled ? '#6366F1' : '#9CA3AF'}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<RefreshCw size={16} color="#6B7280" />}
                        label="Auto Expense Tracking"
                        hint="Detect amount and category from pasted bank SMS"
                        rightElement={
                            <Switch
                                value={autoTrackingEnabled}
                                onValueChange={(v) => setPreference({ autoTracking: v })}
                                trackColor={{ false: '#E5E7EB', true: '#818CF8' }}
                                thumbColor={autoTrackingEnabled ? '#6366F1' : '#9CA3AF'}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<Lock size={16} color="#6B7280" />}
                        label="Privacy and Data"
                        onPress={handlePrivacy}
                    />
                    <SettingsRow
                        icon={<Upload size={16} color="#6B7280" />}
                        label="Export Data (JSON)"
                        hint="Save a copy of everything FinSight stores"
                        onPress={handleExport}
                        disabled={exporting}
                        rightElement={
                            exporting
                                ? <ActivityIndicator size="small" color="#6366F1" />
                                : undefined
                        }
                    />
                    <SettingsRow
                        icon={<Info size={16} color="#6B7280" />}
                        label="About FinSight"
                        hint={`Version ${appVersion}`}
                        onPress={handleAbout}
                    />
                    <SettingsRow
                        icon={<Trash2 size={16} color="#EF4444" />}
                        label="Delete Account"
                        danger
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        rightElement={
                            deleting
                                ? <ActivityIndicator size="small" color="#EF4444" />
                                : undefined
                        }
                    />
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    className="mx-4 mt-4 bg-white border border-border rounded-xl p-4 items-center"
                    onPress={handleLogout}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                >
                    <Text className="text-base font-semibold text-loss">Sign Out</Text>
                </TouchableOpacity>

                {/* App Info */}
                <View className="items-center py-6">
                    <Text className="text-xs text-text-tertiary">FinSight v{appVersion}</Text>
                    <Text className="text-xs text-text-tertiary">Made with care in India</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
