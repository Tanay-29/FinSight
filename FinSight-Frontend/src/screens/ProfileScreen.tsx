/**
 * ProfileScreen
 *
 * Every row here does real work: preferences persist to Firestore, the export
 * writes an actual file, and deleting the account really deletes it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BarFill } from '../components/BarFill';
import { PressableScale } from '../components/PressableScale';
import { COLORS, TYPE, RADIUS } from '../theme/tokens';
import { useScheme, type ThemePref } from '../theme/theme';
import Constants from 'expo-constants';
import {
    Target, Bell, RefreshCw, Lock, Upload, Info,
    Trash2, Flame, ChevronRight, ChevronLeft, Sparkles, Moon,
} from 'lucide-react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logOutUser, updatePreferences, deleteUserAccount } from '../store/slices/authSlice';
import { fetchGoals } from '../store/slices/goalsSlice';
import { selectIsPremium, selectEntitlement, cancelPremium } from '../store/slices/premiumSlice';
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
    // A settings row marks press with its own background rather than scaling,
    // for the same reason a transaction row does.
    <Pressable
        className="flex-row items-center px-4 py-3.5 border-b border-border"
        onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined}
        disabled={disabled || !onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({
            opacity: disabled ? 0.5 : 1,
            backgroundColor: pressed && onPress ? COLORS.surface.secondary : 'transparent',
        })}
    >
        <View className="w-8 h-8 rounded-lg bg-surface-secondary items-center justify-center mr-3">
            {icon}
        </View>
        <View className="flex-1">
            <Text className={`text-base ${danger ? 'text-loss' : 'text-text-primary'}`}>
                {label}
            </Text>
            {hint ? <Text className="text-xs text-text-tertiary mt-0.5 font-inter">{hint}</Text> : null}
        </View>
        {rightElement ?? <ChevronRight size={16} color={COLORS.text.tertiary} />}
    </Pressable>
);

export const ProfileScreen: React.FC = () => {
    const { pref, setPref } = useScheme();
    const navigation = useNavigation();
    const { user, profile } = useAppSelector((state) => state.auth);
    const goals = useAppSelector((state) => state.goals.items);
    const dispatch = useAppDispatch();

    const isPremium = useAppSelector(selectIsPremium);
    const entitlement = useAppSelector(selectEntitlement);
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
        Alert.alert('Sign out', 'Sign out of FinSight on this device?', [
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
                <View className="px-5 pt-4 pb-2 flex-row items-center">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-2 -ml-1"
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <ChevronLeft size={26} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <Text style={TYPE.heading} className="text-text-primary">Profile</Text>
                </View>

                {/* User Card */}
                <View className="mx-5 mt-3 bg-surface-primary border border-border rounded-xl p-4">
                    <View className="flex-row items-center">
                        <View className="w-16 h-16 rounded-full bg-brand-primary-dark items-center justify-center mr-4">
                            <Text className="text-2xl text-white font-inter-bold">{initial}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-inter-bold text-text-primary">{displayName}</Text>
                            {email ? <Text className="text-sm text-text-secondary font-inter">{email}</Text> : null}
                            <View className="flex-row items-center mt-1.5">
                                <View className="bg-brand-primary/10 rounded-full px-3 py-1 flex-row items-center">
                                    <Flame size={11} color={COLORS.brand.primary} />
                                    <Text className="text-xs font-inter-semibold text-brand-primary ml-1">
                                        {streak > 0 ? `${streak} day streak` : 'No streak yet'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {isPremium ? (
                    <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-xl p-4">
                        <View className="flex-row items-center">
                            <View className="w-9 h-9 rounded-xl bg-brand-soft items-center justify-center mr-3">
                                <Sparkles size={18} color={COLORS.brand.primary} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-inter-bold text-text-primary">
                                    FinSight Plus is on
                                </Text>
                                <Text className="text-xs text-text-secondary mt-0.5 font-inter">
                                    {entitlement?.renewsAt
                                        ? `Trial runs to ${new Date(entitlement.renewsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                        : 'Active on this account'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => user?.uid && dispatch(cancelPremium({ uid: user.uid }))}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityRole="button"
                            >
                                <Text className="text-sm font-inter-semibold text-text-secondary">Turn off</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-[11px] text-text-tertiary mt-3 leading-4">
                            Demonstration only. No payment was taken and no card details were
                            collected.
                        </Text>
                    </View>
                ) : (
                    <PressableScale
                        onPress={() => navigation.navigate('Paywall' as never)}
                        accessibilityRole="button"
                        className="mx-5 mt-4 bg-brand-primary-dark rounded-card p-4 flex-row items-center"
                    >
                        <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-3">
                            <Sparkles size={18} color="#FFFFFF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-inter-bold text-white">FinSight Plus</Text>
                            <Text className="text-xs text-brand-edge mt-0.5 font-inter">
                                Your coach and flashcards, whenever you want them
                            </Text>
                        </View>
                        <ChevronRight size={18} color="#FFFFFF" />
                    </PressableScale>
                )}

                {/* Primary Goal, read from the user's real goals */}
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-xl p-4">
                    <View className="flex-row items-center mb-3">
                        <Target size={20} color={COLORS.brand.primary} />
                        <Text className="text-lg font-inter-semibold text-text-primary ml-2">
                            Primary goal
                        </Text>
                    </View>

                    {primaryGoal ? (
                        <View className="bg-profit-bg rounded-xl p-4">
                            <View className="flex-row items-center mb-1">
                                {React.createElement(goalIcon(primaryGoal.icon), {
                                    size: 16,
                                    color: primaryGoal.color,
                                })}
                                <Text className="text-base font-inter-semibold text-text-primary ml-2">
                                    {primaryGoal.title}
                                </Text>
                            </View>
                            <Text className="text-sm text-text-secondary mb-3 font-inter">
                                Target: ₹{primaryGoal.targetAmount.toLocaleString('en-IN')}
                            </Text>
                            <BarFill
                                percent={Math.min(
                                    (primaryGoal.savedAmount / primaryGoal.targetAmount) * 100,
                                    100
                                )}
                                trackClassName="bg-surface-primary"
                                fillClassName="bg-profit"
                            />
                            <Text
                                className="text-xs text-text-tertiary mt-1 font-inter"
                                style={{ fontVariant: ['tabular-nums'] }}
                            >
                                ₹{primaryGoal.savedAmount.toLocaleString('en-IN')} / ₹
                                {primaryGoal.targetAmount.toLocaleString('en-IN')} (
                                {Math.round((primaryGoal.savedAmount / primaryGoal.targetAmount) * 100)}%)
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-surface-secondary rounded-xl p-4">
                            <Text className="text-sm text-text-secondary font-inter">
                                No goals yet. Create one from the Goals tab to see your progress here.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Settings */}
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-xl overflow-hidden">
                    <View className="px-4 py-3 border-b border-border">
                        <Text className="text-lg font-inter-semibold text-text-primary">Settings</Text>
                    </View>

                    {/* Appearance leads the list because it changes the whole
                        app, where the rows under it each change one feature. */}
                    <SettingsRow
                        icon={<Moon size={16} color={COLORS.text.secondary} />}
                        label="Appearance"
                        hint={
                            pref === 'system'
                                ? 'Following your phone'
                                : pref === 'dark' ? 'Always dark' : 'Always light'
                        }
                        rightElement={
                            <View
                                className="flex-row bg-surface-tertiary p-1"
                                style={{ borderRadius: RADIUS.control }}
                            >
                                {(['system', 'light', 'dark'] as ThemePref[]).map((opt) => (
                                    <Pressable
                                        key={opt}
                                        onPress={() => { haptics.tap(); setPref(opt); }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: pref === opt }}
                                        accessibilityLabel={`Appearance, ${opt}`}
                                        className="px-2.5 py-1.5"
                                        style={{
                                            borderRadius: RADIUS.chip,
                                            backgroundColor: pref === opt
                                                ? COLORS.surface.primary
                                                : 'transparent',
                                        }}
                                    >
                                        <Text
                                            style={TYPE.micro}
                                            className={pref === opt ? 'text-text-primary' : 'text-text-tertiary'}
                                        >
                                            {opt === 'system' ? 'Auto' : opt}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        }
                    />
                    <SettingsRow
                        icon={<Bell size={16} color={COLORS.text.secondary} />}
                        label="Budget alerts"
                        hint="Warn me when a category nears its limit"
                        rightElement={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={(v) => setPreference({ notifications: v })}
                                trackColor={{ false: COLORS.border.default, true: '#818CF8' }}
                                thumbColor={notificationsEnabled ? COLORS.brand.primary : COLORS.text.tertiary}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<RefreshCw size={16} color={COLORS.text.secondary} />}
                        label="Read pasted bank messages"
                        hint="Detect amount and category from pasted bank SMS"
                        rightElement={
                            <Switch
                                value={autoTrackingEnabled}
                                onValueChange={(v) => setPreference({ autoTracking: v })}
                                trackColor={{ false: COLORS.border.default, true: '#818CF8' }}
                                thumbColor={autoTrackingEnabled ? COLORS.brand.primary : COLORS.text.tertiary}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<Lock size={16} color={COLORS.text.secondary} />}
                        label="Privacy and data"
                        onPress={handlePrivacy}
                    />
                    <SettingsRow
                        icon={<Upload size={16} color={COLORS.text.secondary} />}
                        label="Export your data"
                        hint="Save a copy of everything FinSight stores"
                        onPress={handleExport}
                        disabled={exporting}
                        rightElement={
                            exporting
                                ? <ActivityIndicator size="small" color={COLORS.brand.primary} />
                                : undefined
                        }
                    />
                    <SettingsRow
                        icon={<Info size={16} color={COLORS.text.secondary} />}
                        label="About FinSight"
                        hint="What this app is, and what it is not"
                        onPress={handleAbout}
                    />
                    <SettingsRow
                        icon={<Trash2 size={16} color={COLORS.semantic.loss} />}
                        label="Delete account"
                        danger
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        rightElement={
                            deleting
                                ? <ActivityIndicator size="small" color={COLORS.semantic.loss} />
                                : undefined
                        }
                    />
                </View>

                <PressableScale
                    className="mx-5 mt-4 bg-surface-primary border border-border rounded-xl p-4 items-center"
                    onPress={handleLogout}
                    accessibilityRole="button"
                >
                    <Text className="text-base font-inter-semibold text-loss">Sign out</Text>
                </PressableScale>

                <View className="items-center py-6">
                    <Text className="text-xs text-text-tertiary font-inter">FinSight v{appVersion}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
